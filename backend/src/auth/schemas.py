"""Auth schemas — request/response models for authentication endpoints."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

from src.core.security import validate_password_strength


class SignUpRequest(BaseModel):
    """Creates a company + first admin user."""
    company_name: str = Field(..., min_length=2, max_length=255)
    name: str = Field(..., min_length=2, max_length=200, description="Full name of the admin user")
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters with 1 uppercase, "
                "1 number, and 1 special character"
            )
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    """Login with email or Login ID + password."""
    login: str = Field(..., description="Email or Login ID")
    password: str


class ChangePasswordRequest(BaseModel):
    """Forced password change for new employees."""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters with 1 uppercase, "
                "1 number, and 1 special character"
            )
        return v

    @field_validator("confirm_new_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    must_change_password: bool = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    login_id: str
    email: str
    role: str
    company_id: int
    must_change_password: bool

    model_config = {"from_attributes": True}
