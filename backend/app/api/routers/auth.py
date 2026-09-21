"""Authentication: login + current user. User creation is ADMIN-only."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, hash_password
from app.db import get_db
from app.models import User
from app.models.enums import Role
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    # DEV MODE: password check is intentionally disabled — any password logs in
    # the user with the given email. Re-enable verify_password() before any real
    # deployment.
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No account for that email")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")
    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
) -> User:
    """Only an admin can provision officers/reviewers/admins."""
    exists = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.flush()
    return user
