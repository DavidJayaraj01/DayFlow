"""Profile router — personal and private info endpoints."""

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.config import settings
from src.auth.dependencies import get_current_active_user
from src.models.user import User
from src.profile.schemas import (
    UpdatePersonalRequest, UpdatePrivateInfoRequest, UploadProfilePictureResponse
)
from src.profile.service import update_personal_info, update_private_info

router = APIRouter()


@router.patch("/{user_id}/personal")
async def update_employee_personal(
    user_id: int,
    request: UpdatePersonalRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update personal info. Employees: address/phone/photo only. Admin/HR: full edit."""
    # Same company check
    target = await db.get(User, user_id)
    if not target or target.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    try:
        result = await update_personal_info(
            db, user_id, current_user, request.model_dump(exclude_unset=True)
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{user_id}/private-info")
async def update_employee_private_info(
    user_id: int,
    request: UpdatePrivateInfoRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update private info. Admin/HR: full edit. Employee: address/phone only."""
    target = await db.get(User, user_id)
    if not target or target.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    try:
        result = await update_private_info(
            db, user_id, current_user, request.model_dump(exclude_unset=True)
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{user_id}/profile-picture", response_model=UploadProfilePictureResponse)
async def upload_profile_picture(
    user_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile picture. Self or admin/HR."""
    if current_user.id != user_id and not current_user.is_admin_or_hr:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Validate file
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"profile_pictures/{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/{filename}"

    # Update profile
    from sqlalchemy import select
    from src.models.employee import EmployeeProfile
    result = await db.execute(
        select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        profile.profile_picture_url = url

    return UploadProfilePictureResponse(profile_picture_url=url)
