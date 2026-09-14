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


def _log_email_fallback(*, to: str, reason: str, detail: str | None = None) -> None:
    if detail:
        logger.warning("email_fallback reason=%s to=%s detail=%s", reason, to, detail)
        print(f"Email fallback ({reason}) to {to}: {detail}")
    else:
        logger.warning("email_fallback reason=%s to=%s", reason, to)
        print(f"Email fallback ({reason}) to {to}")


async def _send_email(*, to: str, subject: str, body: str, settings: Settings) -> bool:
    """Send email. Returns True on success. Logs fallback on failure."""
    normalized = to.strip().lower()
    if not settings.SMTP_HOST:
        _log_email_fallback(to=normalized, reason="smtp_not_configured", detail=body)
        return False

    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            settings=settings,
            to=normalized,
            subject=subject,
            body=body,
        )
        logger.info("email_sent to=%s subject=%s", normalized, subject)
        return True
    except OSError as exc:
        _log_email_fallback(
            to=normalized,
            reason=f"smtp_network:{exc}",
            detail=body,
        )
        return False
    except Exception:
        logger.exception("email_failed to=%s", normalized)
        _log_email_fallback(to=normalized, reason="smtp_error", detail=body)
        return False


async def send_email_otp(*, to: str, code: str, settings: Settings) -> None:
    """Send OTP by email.

    Render free tier often blocks outbound SMTP (Network unreachable).
    On failure we log the code and still succeed so login/signup can continue.
    """
    normalized = to.strip().lower()
    subject = "Your Fruit Shop sign-in code"
    body = (
        f"Your Fruit Shop verification code is: {code}\n\n"
        f"This code expires in {settings.OTP_TTL_MINUTES} minutes.\n"
        "If you did not request this, you can ignore this email."
    )
    await _send_email(to=normalized, subject=subject, body=body, settings=settings)


async def send_password_reset_email(
    *,
    to: str,
    reset_token: str,
    settings: Settings,
) -> None:
    """Send password-reset instructions (admin/staff)."""
    normalized = to.strip().lower()
    ttl = settings.PASSWORD_RESET_TTL_MINUTES
    base = settings.PASSWORD_RESET_URL_BASE.strip().rstrip("/")
    if base:
        link = f"{base}?token={reset_token}"
        link_line = f"Reset your password here:\n{link}\n\n"
    else:
        link_line = (
            "Use this reset token in the admin app or API:\n"
            f"{reset_token}\n\n"
        )

    subject = "Reset your Fruit Shop password"
    body = (
        "We received a request to reset your Fruit Shop password.\n\n"
        f"{link_line}"
        f"This link/token expires in {ttl} minutes.\n"
        "If you did not request a reset, you can ignore this email."
    )
    await _send_email(to=normalized, subject=subject, body=body, settings=settings)
