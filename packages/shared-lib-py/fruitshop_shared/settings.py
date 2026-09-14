from urllib.parse import quote_plus

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    """Base settings every Fruit Shop service should subclass."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Prefer individual params; optional full URL override still works
    DATABASE_URL: str | None = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "fruitshop"
    DB_PASSWORD: str = "fruitshop"
    DB_NAME: str = "fruitshop"
    # require for Aiven / managed Postgres; set disable for plain local Postgres
    # verify-ca / verify-full need a trusted CA (optional DB_SSL_CA path)
    DB_SSLMODE: str = "require"
    DB_SSL_CA: str = ""

    REDIS_URL: str | None = None
    JWT_SECRET: str = "change-me-in-production"

    @property
    def db_ssl_enabled(self) -> bool:
        mode = (self.DB_SSLMODE or "").strip().lower()
        return mode not in ("", "disable", "disabled", "false", "0", "off")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """Resolved Postgres URL: DATABASE_URL if set, else built from DB_* params."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        user = quote_plus(self.DB_USER)
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql://{user}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )
