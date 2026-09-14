"""email otp channel + nullable user phone

Revision ID: 008_email_otp
Revises: 007_cart_orders
Create Date: 2026-08-30
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_email_otp"
down_revision: Union[str, None] = "007_cart_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "otp_codes",
        sa.Column("channel", sa.String(length=16), nullable=False, server_default="phone"),
    )
    op.add_column("otp_codes", sa.Column("email", sa.String(length=255), nullable=True))
    op.create_index("ix_otp_codes_email", "otp_codes", ["email"])
    op.alter_column("otp_codes", "phone", existing_type=sa.String(length=32), nullable=True)

    op.alter_column("users", "phone", existing_type=sa.String(length=32), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "phone", existing_type=sa.String(length=32), nullable=False)
    op.alter_column("otp_codes", "phone", existing_type=sa.String(length=32), nullable=False)
    op.drop_index("ix_otp_codes_email", table_name="otp_codes")
    op.drop_column("otp_codes", "email")
    op.drop_column("otp_codes", "channel")
