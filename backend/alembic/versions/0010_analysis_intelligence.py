"""analysis product profile, decision trace, languages

Revision ID: 0010_analysis_intelligence
Revises: 0009_workflow_status
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa


revision = "0010_analysis_intelligence"
down_revision = "0009_workflow_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("product_profile_json", sa.JSON(), nullable=True))
    op.add_column("analyses", sa.Column("decision_trace_json", sa.JSON(), nullable=True))
    op.add_column("analyses", sa.Column("languages_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "languages_json")
    op.drop_column("analyses", "decision_trace_json")
    op.drop_column("analyses", "product_profile_json")
