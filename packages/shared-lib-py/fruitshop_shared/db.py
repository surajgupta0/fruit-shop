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


def create_engine(settings: BaseAppSettings) -> AsyncEngine:
    if not settings.DATABASE_URL:
        raise ValueError("DATABASE_URL is required")

    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    global _engine
    _engine = create_async_engine(url, pool_pre_ping=True)
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
