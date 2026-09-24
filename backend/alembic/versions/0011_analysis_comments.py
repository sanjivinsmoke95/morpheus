"""analysis comments (collaboration)

Revision ID: 0011_analysis_comments
Revises: 0010_analysis_intelligence
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa


revision = "0011_analysis_comments"
down_revision = "0010_analysis_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "analysis_comments",
        sa.Column("analysis_id", sa.String(length=36), nullable=False),
        sa.Column("author_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="comment"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_comments_analysis_id", "analysis_comments", ["analysis_id"])


def downgrade() -> None:
    op.drop_index("ix_analysis_comments_analysis_id", table_name="analysis_comments")
    op.drop_table("analysis_comments")
