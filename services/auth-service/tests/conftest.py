import os

import pytest
from httpx import ASGITransport, AsyncClient

# Ensure mock mode before app import side-effects
os.environ["MOCK_MODE"] = "true"
os.environ["JWT_SECRET"] = "test-secret-key-at-least-32-chars!!"
os.environ["FRUITSHOP_ROOT"] = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)


@pytest.fixture(autouse=True)
def _reset_mock_store():
    from app.store import mock_store

    mock_store.clear()
    yield
    mock_store.clear()


@pytest.fixture
def app():
    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
