from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from fruitshop_shared.settings import BaseAppSettings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def create_engine(settings: BaseAppSettings) -> AsyncEngine | None:
    """Create an async SQLAlchemy engine when not in mock mode.

    Returns None when MOCK_MODE is True so callers can skip DB wiring.
    """
    global _engine

    if settings.MOCK_MODE:
        return None

    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL is required when MOCK_MODE is False")

    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    _engine = create_async_engine(url, pool_pre_ping=True)
    return _engine


def create_session_factory(
    settings: BaseAppSettings,
    engine: AsyncEngine | None = None,
) -> async_sessionmaker[AsyncSession] | None:
    """Create an async session factory when not in mock mode."""
    global _session_factory

    if settings.MOCK_MODE:
        return None

    if engine is None:
        engine = create_engine(settings)

    if engine is None:
        return None

    _session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, Any]:
    """FastAPI dependency that yields an async DB session.

    Raises RuntimeError if the session factory was never initialized
    (e.g. because MOCK_MODE is True).
    """
    if _session_factory is None:
        raise RuntimeError(
            "Database session factory is not initialized. "
            "Call create_session_factory() when MOCK_MODE is False."
        )

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
