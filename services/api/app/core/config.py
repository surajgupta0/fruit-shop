from functools import lru_cache

from fruitshop_shared.settings import BaseAppSettings


class Settings(BaseAppSettings):
    """Fruit Shop API settings."""

    SERVICE_NAME: str = "fruit-shop-api"
    ENVIRONMENT: str = "dev"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 30
    OTP_TTL_MINUTES: int = 5
    OTP_LENGTH: int = 6
    # Staging/dev: set this to skip SMS/email and always accept this code (e.g. 123456)
    OTP_STATIC_CODE: str = ""
    # SMTP — leave host empty to log OTP to console in dev
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "Fruit Shop <noreply@fruitshop.example>"
    SMTP_USE_TLS: bool = True
    # SMS — provider "log" (default) prints OTP; "twilio" sends via Twilio REST
    SMS_PROVIDER: str = "log"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""  # E.164, e.g. +15005550006
    # Password reset (admin/staff)
    PASSWORD_RESET_TTL_MINUTES: int = 60
    # Optional link base shown in reset email, e.g. https://admin.example/reset-password
    PASSWORD_RESET_URL_BASE: str = ""
    # Comma-separated browser origins allowed to call the API
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001"
    )

    @property
    def is_staging_like(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in {
            "dev",
            "development",
            "staging",
            "stage",
            "test",
            "local",
        }

    @property
    def static_otp_code(self) -> str | None:
        """Fixed OTP when configured (staging/dev). None = generate + send normally."""
        code = self.OTP_STATIC_CODE.strip()
        if not code:
            return None
        # Keep configured value; pad only if shorter than OTP_LENGTH
        if code.isdigit() and len(code) < self.OTP_LENGTH:
            return code.zfill(self.OTP_LENGTH)
        return code

    @property
    def use_static_otp(self) -> bool:
        return self.static_otp_code is not None



@lru_cache
def get_settings() -> Settings:
    return Settings()
