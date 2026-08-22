import logging

logger = logging.getLogger(__name__)


async def send_otp_notification(*, phone: str, code: str) -> None:
    """Stub notification — logs OTP for local development."""
    logger.info("otp_notification_stub phone=%s code=%s", phone, code)
    print(f"OTP sent to {phone}: {code}")
