from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    """Base settings every Fruit Shop service should subclass."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    MOCK_MODE: bool = False
    DATABASE_URL: str | None = None
    REDIS_URL: str | None = None
    JWT_SECRET: str = "change-me-in-production"
