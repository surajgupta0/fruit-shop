import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-key-at-least-32-chars!!"


@pytest.fixture(autouse=True)
def _fixed_otp(monkeypatch):
    monkeypatch.setattr("app.modules.auth.service.generate_otp", lambda _length: "123456")


@pytest.fixture
async def db_engine():
    import app.models  # noqa: F401 — register SQLAlchemy models
    from app.core.database import Base

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
def session_factory(db_engine):
    return async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest.fixture
async def app(db_engine, session_factory, monkeypatch):
    import fruitshop_shared.db as shared_db
    from app.core.config import get_settings
    from app.main import create_app

    def _use_test_db(_settings, engine=None):
        shared_db._engine = db_engine
        shared_db._session_factory = session_factory
        return session_factory

    monkeypatch.setattr("fruitshop_shared.db.create_session_factory", _use_test_db)
    monkeypatch.setattr("app.main.create_session_factory", _use_test_db)
    _use_test_db(None)
    get_settings.cache_clear()
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_token(client, session_factory):
    from app.modules.auth.models import User, UserRole
    from app.modules.auth.security import hash_password

    async with session_factory() as session:
        session.add(
            User(
                phone="+919900000001",
                email="admin@fruitshop.example",
                password_hash=hash_password("adminpass123"),
                name="Admin User",
                role=UserRole.admin,
            )
        )
        await session.commit()

    response = await client.post(
        "/auth/login",
        json={"email": "admin@fruitshop.example", "password": "adminpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]
