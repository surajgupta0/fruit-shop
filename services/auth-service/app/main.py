from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fruitshop_shared.db import create_session_factory
from fruitshop_shared.logging import configure_logging

from app.config import get_settings
from app.routers import auth as auth_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(service=settings.SERVICE_NAME)
    create_session_factory(settings)
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="auth-service",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.include_router(auth_router.router)

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "auth-service"}

    return application


app = create_app()
