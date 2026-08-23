"""Profile service — field-level permission enforcement."""

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.employee import (
    EmployeeProfile, EmployeePrivateInfo, EmployeeSkill, EmployeeCertification
)
from src.models.audit import AuditLog

# Fields an employee can edit on their own profile
EMPLOYEE_SELF_ALLOWED_PERSONAL = {"phone", "home_address", "profile_picture_url"}
EMPLOYEE_SELF_ALLOWED_PRIVATE = {"home_address", "phone"}


async def update_personal_info(
    db: AsyncSession,
    target_user_id: int,
    viewer: User,
    data: dict,
) -> dict:
    """Update personal/profile info with permission enforcement."""
    is_self = viewer.id == target_user_id
    is_admin = viewer.is_admin_or_hr

    if not is_self and not is_admin:
        raise PermissionError("You can only edit your own profile")

    # Get profile
    result = await db.execute(
        select(EmployeeProfile).where(EmployeeProfile.user_id == target_user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise ValueError("Profile not found")

    # Filter fields based on permission
    if is_self and not is_admin:
        # Employee self-edit: strip disallowed fields
        allowed_data = {}
        for key, value in data.items():
            if key in EMPLOYEE_SELF_ALLOWED_PERSONAL and value is not None:
                allowed_data[key] = value
    else:
        allowed_data = {k: v for k, v in data.items() if v is not None}

    # Update profile fields
    profile_fields = {
        "first_name", "last_name", "profile_picture_url", "department",
        "designation", "manager_id", "date_of_joining", "about",
        "job_love_note", "hobbies_note"
    }
    for key, value in allowed_data.items():
        if key in profile_fields:
            setattr(profile, key, value)

    # Update user-level phone
    if "phone" in allowed_data:
        target_user = await db.get(User, target_user_id)
        if target_user:
            target_user.phone = allowed_data["phone"]

    # Update home_address in private_info
    if "home_address" in allowed_data:
        pi_result = await db.execute(
            select(EmployeePrivateInfo).where(
                EmployeePrivateInfo.user_id == target_user_id
            )
        )
        pi = pi_result.scalar_one_or_none()
        if pi:
            pi.home_address = allowed_data["home_address"]

    # Handle skills
    if "skills" in data and data["skills"] is not None and is_admin:
        await db.execute(
            delete(EmployeeSkill).where(EmployeeSkill.user_id == target_user_id)
        )
        for skill_name in data["skills"]:
            db.add(EmployeeSkill(user_id=target_user_id, skill_name=skill_name))

    # Handle certifications
    if "certifications" in data and data["certifications"] is not None and is_admin:
        await db.execute(
            delete(EmployeeCertification).where(
                EmployeeCertification.user_id == target_user_id
            )
        )
        for cert in data["certifications"]:
            db.add(EmployeeCertification(
                user_id=target_user_id,
                cert_name=cert.get("cert_name", ""),
                issued_by=cert.get("issued_by"),
                issued_date=cert.get("issued_date"),
            ))

    # Audit log for admin edits
    if is_admin and not is_self:
        db.add(AuditLog(
            actor_id=viewer.id,
            action="update_personal",
            entity_type="employee_profile",
            entity_id=profile.id,
            metadata_={"updated_fields": list(allowed_data.keys())},
        ))

    return {"message": "Profile updated successfully"}


async def update_private_info(
    db: AsyncSession,
    target_user_id: int,
    viewer: User,
    data: dict,
) -> dict:
    """Update private info with permission enforcement."""
    is_self = viewer.id == target_user_id
    is_admin = viewer.is_admin_or_hr

    if not is_self and not is_admin:
        raise PermissionError("You can only edit your own info")

    result = await db.execute(
        select(EmployeePrivateInfo).where(
            EmployeePrivateInfo.user_id == target_user_id
        )
    )
    pi = result.scalar_one_or_none()
    if not pi:
        raise ValueError("Private info not found")

    if is_self and not is_admin:
        allowed_data = {
            k: v for k, v in data.items()
            if k in EMPLOYEE_SELF_ALLOWED_PRIVATE and v is not None
        }
    else:
        allowed_data = {k: v for k, v in data.items() if v is not None}

    for key, value in allowed_data.items():
        if hasattr(pi, key):
            setattr(pi, key, value)

    if is_admin and not is_self:
        db.add(AuditLog(
            actor_id=viewer.id,
            action="update_private_info",
            entity_type="employee_private_info",
            entity_id=pi.id,
            metadata_={"updated_fields": list(allowed_data.keys())},
        ))

    return {"message": "Private info updated successfully"}
