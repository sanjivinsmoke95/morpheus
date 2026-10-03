"""requirement multilingual text (original + normalized)

Revision ID: 0012_requirement_multilingual_text
Revises: 0011_analysis_comments
Create Date: 2026-09-30
"""
from alembic import op
import sqlalchemy as sa


revision = "0012_requirement_multilingual_text"
down_revision = "0011_analysis_comments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("requirements") as batch_op:
        batch_op.add_column(sa.Column("original_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("normalized_text", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("requirements") as batch_op:
        batch_op.drop_column("normalized_text")
        batch_op.drop_column("original_text")
