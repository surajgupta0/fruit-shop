from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fruitshop_shared.auth_deps import User as AuthUser
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_session, require_permissions
from app.core.schemas import ModuleHealthResponse
from app.modules.notification.models import NotificationLog
from app.modules.users.rbac import NOTIFICATIONS_READ

router = APIRouter(prefix="/notifications", tags=["notification"])


class NotificationLogResponse(BaseModel):
    id: str
    order_id: str | None = None
    user_id: str | None = None
    event: str
    channel: str
    recipient: str
    status: str
    subject: str | None = None
    error: str | None = None
    sent_at: str | None = None

    model_config = {"from_attributes": True}


class NotificationLogListResponse(BaseModel):
    items: list[NotificationLogResponse]
    total: int
    page: int
    page_size: int


@router.get("/health", response_model=ModuleHealthResponse)
def health() -> ModuleHealthResponse:
    return ModuleHealthResponse(module="notification")


@router.get("/admin/logs", response_model=NotificationLogListResponse)
async def list_notification_logs(
    _: Annotated[AuthUser, Depends(require_permissions(NOTIFICATIONS_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_id: UUID | None = None,
) -> NotificationLogListResponse:
    query = select(NotificationLog)
    count_query = select(func.count()).select_from(NotificationLog)
    if order_id is not None:
        query = query.where(NotificationLog.order_id == order_id)
        count_query = count_query.where(NotificationLog.order_id == order_id)

    total = await session.scalar(count_query) or 0
    rows = (
        await session.execute(
            query.order_by(NotificationLog.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = [
        NotificationLogResponse(
            id=str(r.id),
            order_id=str(r.order_id) if r.order_id else None,
            user_id=str(r.user_id) if r.user_id else None,
            event=r.event.value if hasattr(r.event, "value") else str(r.event),
            channel=r.channel.value if hasattr(r.channel, "value") else str(r.channel),
            recipient=r.recipient,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            subject=r.subject,
            error=r.error,
            sent_at=r.sent_at.isoformat() if r.sent_at else None,
        )
        for r in rows
    ]
    return NotificationLogListResponse(
        items=items, total=total, page=page, page_size=page_size
    )
