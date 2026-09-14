from collections.abc import AsyncGenerator
from typing import Any
import ssl

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from fruitshop_shared.settings import BaseAppSettings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def build_ssl_connect_args(settings: BaseAppSettings) -> dict[str, Any]:
    """asyncpg SSL args for managed Postgres (Aiven, etc.).

    - disable: no SSL
    - require: encrypt, skip cert verify (no CA)
    - verify-ca / verify-full: encrypt + verify using DB_SSL_CA when set
    """
    if not settings.db_ssl_enabled:
        return {}

    mode = (settings.DB_SSLMODE or "require").strip().lower()
    ca_path = (getattr(settings, "DB_SSL_CA", None) or "").strip()

    if ca_path:
        ctx = ssl.create_default_context(cafile=ca_path)
        # Aiven project CA verifies the server cert; hostname often doesn't match CN
        if mode != "verify-full":
            ctx.check_hostname = False
        return {"ssl": ctx}

    ctx = ssl.create_default_context()
    if mode in ("verify-ca", "verify-full"):
        if mode != "verify-full":
            ctx.check_hostname = False
        return {"ssl": ctx}

    # require / prefer without CA: encrypt only
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return {"ssl": ctx}


def create_engine(settings: BaseAppSettings) -> AsyncEngine:
    url = settings.database_url
    if not url:
        raise ValueError("DATABASE_URL or DB_* parameters are required")

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

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
