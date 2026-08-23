"""Attendance router — check-in/out, personal and admin views."""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.database import get_db
from src.auth.dependencies import get_current_active_user, require_admin_or_hr
from src.models.user import User
from src.attendance.schemas import (
    CheckInResponse, CheckOutResponse, AttendanceListResponse,
    AttendanceRecordResponse, TodayStatusResponse,
)
from src.attendance.service import (
    check_in, check_out, get_my_attendance, get_all_attendance, get_today_status
)

router = APIRouter()


@router.post("/check-in", response_model=CheckInResponse)
async def do_check_in(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Check in for today."""
    try:
        result = await check_in(db, current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/check-out", response_model=CheckOutResponse)
async def do_check_out(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Check out for today."""
    try:
        result = await check_out(db, current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=AttendanceListResponse)
async def my_attendance(
    month: int = Query(default=None),
    year: int = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get own attendance for a month."""
    today = date.today()
    m = month or today.month
    y = year or today.year
    result = await get_my_attendance(db, current_user.id, m, y)
    return result


@router.get("/today", response_model=TodayStatusResponse)
async def today_status(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's check-in status for the floating widget."""
    result = await get_today_status(db, current_user.id)
    return result


@router.get("", response_model=list[AttendanceRecordResponse])
async def all_attendance(
    for_date: Optional[str] = Query(None, alias="date"),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Get all employee attendance for a date (admin view)."""
    target_date = date.fromisoformat(for_date) if for_date else date.today()
    result = await get_all_attendance(db, admin.company_id, target_date, search)
    return result
