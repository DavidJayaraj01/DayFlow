"""Attendance service — check-in/out, work hours computation."""

import calendar
from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSource
from src.models.user import User
from src.models.employee import EmployeeProfile
from src.models.salary import SalaryStructure


async def check_in(db: AsyncSession, user: User) -> dict:
    """Record check-in for today."""
    today = date.today()
    now = datetime.now(timezone.utc).time()

    # Check if already checked in today
    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.date == today,
        )
    )
    existing = result.scalar_one_or_none()

    if existing and existing.check_in_time and existing.status == AttendanceStatus.present:
        raise ValueError("Already checked in today")

    if existing:
        # Update existing record (e.g., was marked absent by nightly job)
        existing.check_in_time = now
        existing.status = AttendanceStatus.present
        existing.source = AttendanceSource.manual
    else:
        record = AttendanceRecord(
            user_id=user.id,
            date=today,
            check_in_time=now,
            status=AttendanceStatus.present,
            source=AttendanceSource.manual,
        )
        db.add(record)

    return {
        "message": "Checked in successfully",
        "check_in_time": now.strftime("%H:%M:%S"),
        "date": today,
        "status": "present",
    }


async def check_out(db: AsyncSession, user: User) -> dict:
    """Record check-out for today, compute work hours."""
    today = date.today()
    now = datetime.now(timezone.utc).time()

    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.date == today,
        )
    )
    record = result.scalar_one_or_none()

    if not record or not record.check_in_time:
        raise ValueError("Must check in before checking out")

    if record.check_out_time:
        raise ValueError("Already checked out today")

    record.check_out_time = now

    # Compute work hours
    check_in_dt = datetime.combine(today, record.check_in_time)
    check_out_dt = datetime.combine(today, now)
    delta = check_out_dt - check_in_dt
    work_hours = round(delta.total_seconds() / 3600, 2)
    record.work_hours = work_hours

    # Compute extra hours (beyond basic_hours from salary structure)
    basic_hours = 8.0
    salary_result = await db.execute(
        select(SalaryStructure).where(SalaryStructure.user_id == user.id)
    )
    salary = salary_result.scalar_one_or_none()
    if salary:
        basic_hours = salary.basic_hours

    extra_hours = round(max(0, work_hours - basic_hours), 2)
    record.extra_hours = extra_hours

    return {
        "message": "Checked out successfully",
        "check_out_time": now.strftime("%H:%M:%S"),
        "work_hours": work_hours,
        "extra_hours": extra_hours,
        "date": today,
    }


async def get_my_attendance(
    db: AsyncSession, user_id: int, month: int, year: int
) -> dict:
    """Get attendance records for a user for a given month."""
    # Get records
    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    result = await db.execute(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.date >= start_date,
            AttendanceRecord.date <= end_date,
        )
        .order_by(AttendanceRecord.date)
    )
    records = result.scalars().all()

    # Summary
    present_days = sum(1 for r in records if r.status == AttendanceStatus.present)
    leave_days = sum(1 for r in records if r.status == AttendanceStatus.on_leave)
    absent_days = sum(1 for r in records if r.status == AttendanceStatus.absent)

    # Total working days (exclude weekends — simplified as Mon-Fri)
    total_working = 0
    current = start_date
    today = date.today()
    while current <= min(end_date, today):
        if current.weekday() < 5:  # Mon-Fri
            total_working += 1
        current += timedelta(days=1)

    record_list = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "date": r.date,
            "check_in_time": r.check_in_time.strftime("%H:%M:%S") if r.check_in_time else None,
            "check_out_time": r.check_out_time.strftime("%H:%M:%S") if r.check_out_time else None,
            "work_hours": r.work_hours,
            "extra_hours": r.extra_hours,
            "status": r.status.value,
        }
        for r in records
    ]

    return {
        "records": record_list,
        "summary": {
            "present_days": present_days,
            "leave_days": leave_days,
            "absent_days": absent_days,
            "total_working_days": total_working,
            "month": month,
            "year": year,
        },
    }


async def get_all_attendance(
    db: AsyncSession, company_id: int, for_date: date, search: str | None = None
) -> list[dict]:
    """Get all employee attendance for a given date (admin view)."""
    stmt = (
        select(AttendanceRecord)
        .join(User, AttendanceRecord.user_id == User.id)
        .options(selectinload(AttendanceRecord.user).selectinload(User.profile))
        .where(
            User.company_id == company_id,
            AttendanceRecord.date == for_date,
        )
    )

    result = await db.execute(stmt)
    records = result.scalars().all()

    record_list = []
    for r in records:
        name = ""
        if r.user and r.user.profile:
            name = f"{r.user.profile.first_name} {r.user.profile.last_name}"
        record_list.append({
            "id": r.id,
            "user_id": r.user_id,
            "employee_name": name,
            "date": r.date,
            "check_in_time": r.check_in_time.strftime("%H:%M:%S") if r.check_in_time else None,
            "check_out_time": r.check_out_time.strftime("%H:%M:%S") if r.check_out_time else None,
            "work_hours": r.work_hours,
            "extra_hours": r.extra_hours,
            "status": r.status.value,
        })

    if search:
        search_lower = search.lower()
        record_list = [r for r in record_list if search_lower in (r.get("employee_name") or "").lower()]

    return record_list


async def get_today_status(db: AsyncSession, user_id: int) -> dict:
    """Get today's check-in status for the floating widget."""
    today = date.today()
    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.date == today,
        )
    )
    record = result.scalar_one_or_none()

    if record and record.check_in_time and not record.check_out_time:
        return {
            "is_checked_in": True,
            "check_in_time": record.check_in_time.strftime("%H:%M:%S"),
            "status_dot": "green",
        }
    elif record and record.check_in_time and record.check_out_time:
        return {
            "is_checked_in": False,
            "check_in_time": record.check_in_time.strftime("%H:%M:%S"),
            "status_dot": "green",
        }

    return {
        "is_checked_in": False,
        "check_in_time": None,
        "status_dot": "orange",
    }
