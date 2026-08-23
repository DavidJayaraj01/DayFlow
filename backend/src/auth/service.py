"""Auth service — signup, login, token management."""

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token
)
from src.models.company import Company
from src.models.user import User, UserRole
from src.models.employee import EmployeeProfile, EmployeePrivateInfo
from src.models.leave import LeaveType


async def create_company_and_admin(
    db: AsyncSession,
    company_name: str,
    admin_name: str,
    email: str,
    phone: str | None,
    password: str,
    logo_url: str | None = None,
) -> tuple[Company, User]:
    """Create a new company and its first admin user. Also seeds default leave types."""
    # Create company
    company = Company(name=company_name, logo_url=logo_url)
    db.add(company)
    await db.flush()

    # Parse name into first/last
    name_parts = admin_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Create admin user — admin uses email as login_id
    login_id = email  # Admins login with their email
    user = User(
        company_id=company.id,
        login_id=login_id,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=UserRole.admin,
        must_change_password=False,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create profile for admin
    profile = EmployeeProfile(
        user_id=user.id,
        first_name=first_name,
        last_name=last_name,
        department="Management",
        designation="Administrator",
    )
    db.add(profile)

    # Create private info
    private_info = EmployeePrivateInfo(user_id=user.id, phone=phone)
    db.add(private_info)

    # Seed default leave types for the company
    default_leave_types = [
        LeaveType(company_id=company.id, name="Paid Time Off", default_annual_quota=24),
        LeaveType(company_id=company.id, name="Sick Leave", default_annual_quota=7),
        LeaveType(company_id=company.id, name="Unpaid Leave", default_annual_quota=0),
    ]
    db.add_all(default_leave_types)

    return company, user


async def authenticate_user(
    db: AsyncSession, login: str, password: str
) -> User | None:
    """Authenticate by email or login_id. Returns user or None."""
    stmt = select(User).where(
        or_(User.email == login, User.login_id == login),
        User.is_active == True,
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user and verify_password(password, user.password_hash):
        return user
    return None


def generate_tokens(user: User) -> dict:
    """Generate access and refresh tokens for a user."""
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "company_id": user.company_id,
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role.value,
        "must_change_password": user.must_change_password,
    }
