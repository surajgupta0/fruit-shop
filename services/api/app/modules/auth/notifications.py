from __future__ import annotations

import logging

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


def _log_sms_fallback(*, phone: str, code: str, reason: str) -> None:
    logger.warning("sms_otp_fallback reason=%s phone=%s code=%s", reason, phone, code)
    print(f"SMS OTP fallback ({reason}) to {phone}: {code}")


async def _send_twilio_sms(*, phone: str, body: str, settings: Settings) -> None:
    sid = settings.TWILIO_ACCOUNT_SID.strip()
    token = settings.TWILIO_AUTH_TOKEN.strip()
    from_number = settings.TWILIO_FROM_NUMBER.strip()
    if not sid or not token or not from_number:
        raise RuntimeError("twilio_not_configured")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            url,
            data={"To": phone, "From": from_number, "Body": body},
            auth=(sid, token),
        )
    if response.status_code >= 400:
        raise RuntimeError(f"twilio_http_{response.status_code}:{response.text[:200]}")


async def send_otp_notification(*, phone: str, code: str, settings: Settings) -> None:
    """Deliver phone OTP via configured SMS provider.

    When SMS is not configured (or send fails), log the code so local/staging
    flows still work — same pattern as email OTP.
    """
    provider = settings.SMS_PROVIDER.strip().lower() or "log"
    message = (
        f"Your Fruit Shop code is {code}. "
        f"It expires in {settings.OTP_TTL_MINUTES} minutes."
    )

    if provider == "log":
        _log_sms_fallback(phone=phone, code=code, reason="sms_provider_log")
        return

    if provider == "twilio":
        try:
            await _send_twilio_sms(phone=phone, body=message, settings=settings)
            logger.info("sms_otp_sent provider=twilio phone=%s", phone)
            return
        except Exception as exc:
            logger.exception("sms_otp_failed provider=twilio phone=%s", phone)
            _log_sms_fallback(phone=phone, code=code, reason=f"twilio_error:{exc}")
            return

    _log_sms_fallback(phone=phone, code=code, reason=f"unknown_provider:{provider}")
