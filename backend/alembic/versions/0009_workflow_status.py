"""analysis workflow status

Revision ID: 0009_workflow_status
Revises: 0008_requirement_notes
Create Date: 2026-09-23
"""
from alembic import op
import sqlalchemy as sa


revision = "0009_workflow_status"
down_revision = "0008_requirement_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("workflow_status", sa.String(length=24),
                                        nullable=False, server_default="DRAFT"))


def downgrade() -> None:
    op.drop_column("analyses", "workflow_status")
