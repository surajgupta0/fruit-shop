from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fruitshop_shared.db import create_session_factory
from fruitshop_shared.logging import configure_logging

from app.core.config import get_settings
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.cms.router import router as cms_router
from app.modules.coupon.router import router as coupon_router
from app.modules.delivery.router import router as delivery_router
from app.modules.inventory.router import router as inventory_router
from app.modules.notification.router import router as notification_router
from app.modules.order.router import router as order_router
from app.modules.payment.router import router as payment_router
from app.modules.review.router import router as review_router
from app.modules.search.router import router as search_router
from app.modules.users.router import roles_router, router as users_router

ROUTERS = [
    auth_router,
    users_router,
    roles_router,
    catalog_router,
    inventory_router,
    order_router,
    payment_router,
    delivery_router,
    coupon_router,
    review_router,
    notification_router,
    cms_router,
    search_router,
]


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(service=settings.SERVICE_NAME)
    create_session_factory(settings)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="fruit-shop-api", version="0.1.0", lifespan=lifespan)

    for router in ROUTERS:
        app.include_router(router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "fruit-shop-api"}

    return app


application = create_app()
app = application
