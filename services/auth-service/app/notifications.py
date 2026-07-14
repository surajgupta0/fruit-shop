import logging

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


async def send_otp_notification(
    *,
    phone: str,
    code: str,
    settings: Settings,
) -> None:
    """Stub HTTP call to notification-service; logs instead of failing."""
    url = f"{settings.NOTIFICATION_SERVICE_URL.rstrip('/')}/notifications/otp"
    payload = {"phone": phone, "channel": "sms", "template": "otp", "code": code}

    logger.info(
        "otp_notification_stub",
        extra={"phone": phone, "url": url, "payload": {**payload, "code": "***"}},
    )

    # Intentionally stubbed — do not fail auth if notification-service is down.
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            # Dry-run style: we attempt the call but ignore connection errors.
            await client.post(url, json=payload)
    except httpx.HTTPError as exc:
        logger.warning(
            "notification_service_unavailable",
            extra={"error": str(exc), "url": url},
        )
