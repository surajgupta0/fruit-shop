"""Shared SQLAlchemy mixins — audit columns live on the same table."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditMixin:
    """created_at / updated_at / created_by / updated_by on every table."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    # No SQL onupdate — that expires the attr after flush and breaks async
    # (MissingGreenlet when Pydantic reads updated_at). stamp_update sets it.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


def stamp_create(obj: AuditMixin, actor_id: uuid.UUID | None) -> None:
    now = _utcnow()
    if getattr(obj, "created_at", None) is None:
        obj.created_at = now
    obj.updated_at = now
    obj.created_by = actor_id
    obj.updated_by = actor_id


def stamp_update(obj: AuditMixin, actor_id: uuid.UUID | None) -> None:
    obj.updated_at = _utcnow()
    obj.updated_by = actor_id
