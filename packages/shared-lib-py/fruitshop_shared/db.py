from collections.abc import AsyncGenerator
from typing import Any
import ssl
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from fruitshop_shared.settings import BaseAppSettings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None

# libpq / Neon query params — asyncpg does not accept these on the URL
_ASYNC_PG_STRIP_QUERY_KEYS = {
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "sslcrl",
    "channel_binding",
    "options",
}


def normalize_asyncpg_url(url: str) -> str:
    """Convert to asyncpg dialect and drop libpq-only query params (Neon, etc.)."""
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]

    parsed = urlparse(url)
    if not parsed.query:
        return url

    params = parse_qs(parsed.query, keep_blank_values=True)
    kept = {
        k: v
        for k, v in params.items()
        if k.lower() not in _ASYNC_PG_STRIP_QUERY_KEYS
    }
    query = urlencode(kept, doseq=True)
    return urlunparse(parsed._replace(query=query))


def sslmode_from_database_url(url: str | None) -> str | None:
    """Read sslmode from a libpq-style DATABASE_URL if present."""
    if not url or "?" not in url:
        return None
    try:
        params = parse_qs(urlparse(url).query)
        values = params.get("sslmode") or params.get("sslMode")
        if values and values[0]:
            return values[0].strip().lower()
    except Exception:
        return None
    return None


def build_ssl_connect_args(settings: BaseAppSettings) -> dict[str, Any]:
    """asyncpg SSL args for managed Postgres (Neon, Aiven, etc.).

    - disable: no SSL
    - require: encrypt, skip cert verify (no CA) — typical for Neon
    - verify-ca / verify-full: encrypt + verify using DB_SSL_CA when set
    """
    import os

    # Neon URLs often embed sslmode=require; honour that when helpful
    url_mode = sslmode_from_database_url(getattr(settings, "DATABASE_URL", None))
    mode = (settings.DB_SSLMODE or url_mode or "require").strip().lower()
    if mode in ("", "disable", "disabled", "false", "0", "off"):
        return {}

    ca_path = (getattr(settings, "DB_SSL_CA", None) or "").strip()

    if ca_path:
        if not os.path.isfile(ca_path):
            raise FileNotFoundError(
                f"DB_SSL_CA file not found: {ca_path}. "
                "For Neon, leave DB_SSL_CA empty and use DB_SSLMODE=require. "
                "For Aiven verify-ca, set DB_SSL_CA to the CA PEM path."
            )
        ctx = ssl.create_default_context(cafile=ca_path)
        # Project CA verifies the server cert; hostname often doesn't match CN
        if mode != "verify-full":
            ctx.check_hostname = False
        return {"ssl": ctx}

    ctx = ssl.create_default_context()
    if mode in ("verify-ca", "verify-full"):
        if mode != "verify-full":
            ctx.check_hostname = False
        return {"ssl": ctx}

    # require / prefer without CA: encrypt only (Neon-friendly)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return {"ssl": ctx}


def create_engine(settings: BaseAppSettings) -> AsyncEngine:
    url = settings.database_url
    if not url:
        raise ValueError("DATABASE_URL or DB_* parameters are required")

    url = normalize_asyncpg_url(url)

    connect_args: dict[str, Any] = {}
    if "sqlite" not in url:
        connect_args.update(build_ssl_connect_args(settings))

    global _engine
    _engine = create_async_engine(url, pool_pre_ping=True, connect_args=connect_args)
    return _engine


def create_session_factory(
    settings: BaseAppSettings,
    engine: AsyncEngine | None = None,
) -> async_sessionmaker[AsyncSession]:
    global _session_factory

    if engine is None:
        engine = create_engine(settings)

    _session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, Any]:
    if _session_factory is None:
        raise RuntimeError(
            "Database session factory is not initialized. "
            "Call create_session_factory() at startup."
        )

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
