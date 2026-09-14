from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

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


def _log_otp_fallback(*, to: str, code: str, reason: str) -> None:
    logger.warning("email_otp_fallback reason=%s to=%s code=%s", reason, to, code)
    print(f"Email OTP fallback ({reason}) to {to}: {code}")


async def send_email_otp(*, to: str, code: str, settings: Settings) -> None:
    """Send OTP by email.

    Render free tier often blocks outbound SMTP (Network unreachable).
    On failure we log the code and still succeed so login/signup can continue.
    """
    normalized = to.strip().lower()
    if not settings.SMTP_HOST:
        _log_otp_fallback(to=normalized, code=code, reason="smtp_not_configured")
        return

    subject = "Your Fruit Shop sign-in code"
    body = (
        f"Your Fruit Shop verification code is: {code}\n\n"
        f"This code expires in {settings.OTP_TTL_MINUTES} minutes.\n"
        "If you did not request this, you can ignore this email."
    )
    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            settings=settings,
            to=normalized,
            subject=subject,
            body=body,
        )
        logger.info("email_otp_sent to=%s", normalized)
    except OSError as exc:
        # e.g. Errno 101 Network is unreachable on Render free
        _log_otp_fallback(to=normalized, code=code, reason=f"smtp_network:{exc}")
    except Exception:
        logger.exception("email_otp_failed to=%s", normalized)
        _log_otp_fallback(to=normalized, code=code, reason="smtp_error")
