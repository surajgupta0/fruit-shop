from functools import lru_cache

from fruitshop_shared.settings import BaseAppSettings


class Settings(BaseAppSettings):
    """Auth-service settings."""

    SERVICE_NAME: str = "auth-service"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 30
    OTP_TTL_MINUTES: int = 5
    OTP_LENGTH: int = 6
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
