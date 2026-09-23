"""requirement notes

Revision ID: 0008_requirement_notes
Revises: 0007_evaluation
Create Date: 2026-09-23
"""
from alembic import op
import sqlalchemy as sa


revision = "0008_requirement_notes"
down_revision = "0007_evaluation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "requirement_notes",
        sa.Column("requirement_id", sa.String(length=36), nullable=False),
        sa.Column("analysis_id", sa.String(length=36), nullable=False),
        sa.Column("author_id", sa.String(length=36), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_requirement_notes_requirement_id", "requirement_notes", ["requirement_id"])
    op.create_index("ix_requirement_notes_analysis_id", "requirement_notes", ["analysis_id"])


def downgrade() -> None:
    op.drop_index("ix_requirement_notes_analysis_id", table_name="requirement_notes")
    op.drop_index("ix_requirement_notes_requirement_id", table_name="requirement_notes")
    op.drop_table("requirement_notes")
