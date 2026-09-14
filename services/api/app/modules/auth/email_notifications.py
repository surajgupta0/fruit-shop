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


async def send_email_otp(*, to: str, code: str, settings: Settings) -> None:
    """Send OTP by email. Falls back to console logging when SMTP is not configured."""
    normalized = to.strip().lower()
    if not settings.SMTP_HOST:
        logger.info("email_otp_stub to=%s code=%s", normalized, code)
        print(f"Email OTP sent to {normalized}: {code}")
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
    except Exception:
        logger.exception("email_otp_failed to=%s", normalized)
        raise
