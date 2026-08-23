"""Leave router — types, balances, requests, approve/reject, allocations."""

import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.database import get_db
from src.core.config import settings
from src.auth.dependencies import get_current_active_user, require_admin_or_hr
from src.models.user import User
from src.leave.schemas import (
    LeaveTypeResponse, LeaveBalanceResponse, CreateLeaveRequest,
    LeaveRequestResponse, ReviewLeaveRequest, AllocationUpdateRequest,
)
from src.leave.service import (
    get_leave_types, get_my_balances, get_all_allocations, create_leave_request,
    get_leave_requests, review_leave_request, update_allocation,
)

router = APIRouter()


@router.get("/types", response_model=list[LeaveTypeResponse])
async def list_leave_types(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_leave_types(db, current_user.company_id)


@router.get("/balances/me", response_model=list[LeaveBalanceResponse])
async def my_balances(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_my_balances(db, current_user.id, current_user.company_id)


@router.get("/allocations", response_model=list[LeaveBalanceResponse])
async def list_allocations(
    user_id: Optional[int] = Query(None),
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Get allocations — admin/HR only."""
    if user_id:
        return await get_my_balances(db, user_id, admin.company_id)
    return await get_all_allocations(db, admin.company_id)


@router.put("/allocations/{user_id}/{leave_type_id}")
async def set_allocation(
    user_id: int,
    leave_type_id: int,
    request: AllocationUpdateRequest,
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    return await update_allocation(db, user_id, leave_type_id, request.allocated, admin)


@router.post("/requests", response_model=LeaveRequestResponse, status_code=201)
async def submit_leave_request(
    leave_type_id: int = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    total_days: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a leave request. Attachment required for sick leave."""
    s_date = date.fromisoformat(start_date)
    e_date = date.fromisoformat(end_date)

    if e_date < s_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    computed_days = total_days or (e_date - s_date).days + 1

    # Handle attachment
    attachment_url = None
    if attachment:
        allowed = {"application/pdf", "image/jpeg", "image/png"}
        if attachment.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Invalid file type (pdf, jpg, png only)")
        content = await attachment.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large")
        ext = os.path.splitext(attachment.filename)[1] if attachment.filename else ".pdf"
        filename = f"leave_attachments/{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(content)
        attachment_url = f"/uploads/{filename}"

    try:
        result = await create_leave_request(
            db, current_user, leave_type_id, s_date, e_date,
            computed_days, attachment_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requests/me", response_model=list[LeaveRequestResponse])
async def my_leave_requests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_leave_requests(
        db, current_user.company_id, user_id=current_user.id
    )


@router.get("/requests", response_model=list[LeaveRequestResponse])
async def all_leave_requests(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Get all leave requests — admin/HR only."""
    return await get_leave_requests(
        db, admin.company_id, status_filter=status, search=search
    )


@router.patch("/requests/{request_id}", response_model=dict)
async def review_request(
    request_id: int,
    request: ReviewLeaveRequest,
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a leave request — admin/HR only."""
    try:
        result = await review_leave_request(
            db, request_id, admin, request.status, request.review_comment
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
