"""Seed the initial users so login works out of the box in dev/demo.

Passwords come from settings (dev defaults; override in production). Idempotent.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import User
from app.models.enums import Role

logger = logging.getLogger(__name__)


def seed_users(db: Session) -> None:
    seeds = [
        (settings.seed_admin_email, settings.seed_admin_password, "Administrator", Role.ADMIN),
        (settings.seed_officer_email, settings.seed_officer_password, "Procurement Officer", Role.OFFICER),
        (settings.seed_reviewer_email, settings.seed_reviewer_password, "Reviewer", Role.REVIEWER),
    ]
    created = 0
    for email, password, name, role in seeds:
        email = email.lower()
        exists = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if exists:
            continue
        db.add(User(email=email, full_name=name, password_hash=hash_password(password), role=role.value))
        created += 1
    if created:
        db.commit()
        logger.info("Seeded %d user(s).", created)
