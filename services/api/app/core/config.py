from functools import lru_cache

from fruitshop_shared.settings import BaseAppSettings


class Settings(BaseAppSettings):
    """Fruit Shop API settings."""

    SERVICE_NAME: str = "fruit-shop-api"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 30
    OTP_TTL_MINUTES: int = 5
    OTP_LENGTH: int = 6
    # SMTP — leave host empty to log OTP to console in dev
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "Fruit Shop <noreply@fruitshop.example>"
    SMTP_USE_TLS: bool = True
    # Comma-separated browser origins allowed to call the API
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
