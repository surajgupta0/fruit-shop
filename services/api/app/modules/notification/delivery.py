from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


def _send_smtp_sync(*, settings: Settings, to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)


async def send_email_message(
    *,
    to: str,
    subject: str,
    body: str,
    settings: Settings,
) -> tuple[bool, str | None]:
    """Returns (ok, error_message). Logs body when SMTP is unavailable."""
    normalized = to.strip().lower()
    if not settings.SMTP_HOST:
        logger.warning("email_delivery_fallback reason=smtp_not_configured to=%s", normalized)
        print(f"Email fallback (smtp_not_configured) to {normalized}:\n{subject}\n{body}")
        return True, None  # treat as delivered in log mode
    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            settings=settings,
            to=normalized,
            subject=subject,
            body=body,
        )
        logger.info("email_delivered to=%s subject=%s", normalized, subject)
        return True, None
    except Exception as exc:
        logger.exception("email_delivery_failed to=%s", normalized)
        print(f"Email fallback (error) to {normalized}:\n{subject}\n{body}")
        return False, str(exc)


async def send_sms_message(
    *,
    phone: str,
    body: str,
    settings: Settings,
) -> tuple[bool, str | None]:
    provider = (settings.SMS_PROVIDER or "log").strip().lower()
    if provider == "log":
        logger.warning("sms_delivery_fallback reason=sms_provider_log phone=%s", phone)
        print(f"SMS fallback (log) to {phone}: {body}")
        return True, None

    if provider == "twilio":
        sid = settings.TWILIO_ACCOUNT_SID.strip()
        token = settings.TWILIO_AUTH_TOKEN.strip()
        from_number = settings.TWILIO_FROM_NUMBER.strip()
        if not sid or not token or not from_number:
            logger.warning("sms_delivery_fallback reason=twilio_not_configured phone=%s", phone)
            print(f"SMS fallback (twilio_not_configured) to {phone}: {body}")
            return True, None
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    url,
                    data={"To": phone, "From": from_number, "Body": body},
                    auth=(sid, token),
                )
            if response.status_code >= 400:
                err = f"twilio_http_{response.status_code}:{response.text[:200]}"
                logger.error("sms_delivery_failed phone=%s error=%s", phone, err)
                print(f"SMS fallback ({err}) to {phone}: {body}")
                return False, err
            logger.info("sms_delivered provider=twilio phone=%s", phone)
            return True, None
        except Exception as exc:
            logger.exception("sms_delivery_failed phone=%s", phone)
            print(f"SMS fallback (error) to {phone}: {body}")
            return False, str(exc)

    logger.warning("sms_delivery_fallback reason=unknown_provider:%s phone=%s", provider, phone)
    print(f"SMS fallback (unknown_provider) to {phone}: {body}")
    return True, None
