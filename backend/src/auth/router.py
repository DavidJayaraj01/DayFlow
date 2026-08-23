"""Auth router — signup, login, change password, refresh, logout."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import uuid

from src.core.database import get_db
from src.core.config import settings
from src.core.security import (
    hash_password, verify_password, decode_token, create_access_token
)
from src.auth.schemas import (
    SignUpRequest, LoginRequest, ChangePasswordRequest,
    TokenResponse, RefreshTokenRequest, UserResponse,
)
from src.auth.service import create_company_and_admin, authenticate_user, generate_tokens
from src.auth.dependencies import get_current_user
from src.models.user import User

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    company_name: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    password: str = Form(...),
    confirm_password: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Create a new company and admin account."""
    # Validate passwords match
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Passwords do not match",
        )

    # Validate password strength
    from src.core.security import validate_password_strength
    if not validate_password_strength(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character",
        )

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Handle logo upload
    logo_url = None
    if logo:
        ext = os.path.splitext(logo.filename)[1] if logo.filename else ".png"
        filename = f"company_logos/{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        content = await logo.read()
        with open(filepath, "wb") as f:
            f.write(content)
        logo_url = f"/uploads/{filename}"

    company, user = await create_company_and_admin(
        db=db,
        company_name=company_name,
        admin_name=name,
        email=email,
        phone=phone,
        password=password,
        logo_url=logo_url,
    )

    tokens = generate_tokens(user)
    return TokenResponse(**tokens)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return tokens."""
    user = await authenticate_user(db, request.login, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = generate_tokens(user)
    return TokenResponse(**tokens)


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password. Used for forced password change on first login."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    current_user.must_change_password = False
    db.add(current_user)

    return {"message": "Password changed successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using a valid refresh token."""
    payload = decode_token(request.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(User).where(User.id == int(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    tokens = generate_tokens(user)
    return TokenResponse(**tokens)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout — client should discard tokens. Server-side is stateless."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user
