"""Leave service — requests, approval with side effects, allocations."""

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus
from src.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSource
from src.models.user import User
from src.models.employee import EmployeeProfile
from src.models.audit import AuditLog


async def get_leave_types(db: AsyncSession, company_id: int) -> list[dict]:
    result = await db.execute(
        select(LeaveType).where(LeaveType.company_id == company_id)
    )
    return [
        {"id": lt.id, "name": lt.name, "default_annual_quota": lt.default_annual_quota}
        for lt in result.scalars().all()
    ]


async def get_my_balances(
    db: AsyncSession, user_id: int, company_id: int
) -> list[dict]:
    current_year = date.today().year
    result = await db.execute(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(
            LeaveBalance.user_id == user_id,
            LeaveBalance.year == current_year,
        )
    )
    balances = result.scalars().all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "leave_type_id": b.leave_type_id,
            "leave_type_name": b.leave_type.name,
            "year": b.year,
            "allocated": b.allocated,
            "used": b.used,
            "remaining": b.remaining,
        }
        for b in balances
    ]


async def get_all_allocations(
    db: AsyncSession, company_id: int, year: int | None = None
) -> list[dict]:
    """Get all employees' leave balances/allocations for the company."""
    current_year = year or date.today().year
    stmt = (
        select(LeaveBalance)
        .join(User, LeaveBalance.user_id == User.id)
        .options(
            selectinload(LeaveBalance.user).selectinload(User.profile),
            selectinload(LeaveBalance.leave_type),
        )
        .where(
            User.company_id == company_id,
            LeaveBalance.year == current_year,
        )
    )
    result = await db.execute(stmt)
    balances = result.scalars().all()
    items = []
    for b in balances:
        name = ""
        if b.user and b.user.profile:
            name = f"{b.user.profile.first_name} {b.user.profile.last_name}"
        items.append({
            "id": b.id,
            "user_id": b.user_id,
            "employee_name": name,
            "leave_type_id": b.leave_type_id,
            "leave_type_name": b.leave_type.name if b.leave_type else "",
            "year": b.year,
            "allocated": b.allocated,
            "used": b.used,
            "remaining": b.remaining,
        })
    return items


async def create_leave_request(
    db: AsyncSession,
    user: User,
    leave_type_id: int,
    start_date: date,
    end_date: date,
    total_days: int,
    attachment_url: str | None = None,
) -> dict:
    """Create a leave request with balance check."""
    # Get leave type
    lt = await db.get(LeaveType, leave_type_id)
    if not lt:
        raise ValueError("Invalid leave type")

    # Require attachment for sick leave
    if lt.name.lower() == "sick leave" and not attachment_url:
        raise ValueError("Attachment (sick certificate) is required for sick leave")

    # Check balance (skip for unpaid leave)
    if lt.name.lower() != "unpaid leave":
        current_year = date.today().year
        bal_result = await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.user_id == user.id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.year == current_year,
            )
        )
        balance = bal_result.scalar_one_or_none()
        if balance and balance.remaining < total_days:
            raise ValueError(
                f"Insufficient leave balance. Available: {balance.remaining}, Requested: {total_days}"
            )

    request = LeaveRequest(
        user_id=user.id,
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        total_days=total_days,
        attachment_url=attachment_url,
        status=LeaveStatus.pending,
    )
    db.add(request)
    await db.flush()

    return {
        "id": request.id,
        "user_id": request.user_id,
        "leave_type_id": request.leave_type_id,
        "leave_type_name": lt.name,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "total_days": request.total_days,
        "attachment_url": request.attachment_url,
        "status": request.status.value,
        "created_at": request.created_at.isoformat() if request.created_at else None,
    }


async def get_leave_requests(
    db: AsyncSession, company_id: int, status_filter: str | None = None,
    search: str | None = None, user_id: int | None = None,
) -> list[dict]:
    """Get leave requests (admin view or filtered by user_id)."""
    stmt = (
        select(LeaveRequest)
        .join(User, LeaveRequest.user_id == User.id)
        .options(
            selectinload(LeaveRequest.user).selectinload(User.profile),
            selectinload(LeaveRequest.leave_type),
        )
        .where(User.company_id == company_id)
        .order_by(LeaveRequest.created_at.desc())
    )

    if user_id:
        stmt = stmt.where(LeaveRequest.user_id == user_id)
    if status_filter:
        stmt = stmt.where(LeaveRequest.status == LeaveStatus(status_filter))

    result = await db.execute(stmt)
    requests = result.scalars().all()

    items = []
    for r in requests:
        name = ""
        if r.user and r.user.profile:
            name = f"{r.user.profile.first_name} {r.user.profile.last_name}"
        items.append({
            "id": r.id,
            "user_id": r.user_id,
            "employee_name": name,
            "leave_type_id": r.leave_type_id,
            "leave_type_name": r.leave_type.name if r.leave_type else None,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "total_days": r.total_days,
            "attachment_url": r.attachment_url,
            "status": r.status.value,
            "review_comment": r.review_comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    if search:
        search_lower = search.lower()
        items = [i for i in items if search_lower in (i.get("employee_name") or "").lower()]

    return items


async def review_leave_request(
    db: AsyncSession,
    request_id: int,
    reviewer: User,
    new_status: str,
    comment: str | None = None,
) -> dict:
    """Approve or reject a leave request with side effects.

    On approve:
    1. Update status
    2. Decrement leave balance
    3. Create attendance records with status=on_leave for date range
    """
    request = await db.get(LeaveRequest, request_id)
    if not request:
        raise ValueError("Leave request not found")

    if request.status != LeaveStatus.pending:
        raise ValueError("Can only review pending requests")

    request.status = LeaveStatus(new_status)
    request.reviewed_by = reviewer.id
    request.review_comment = comment
    request.reviewed_at = datetime.now(timezone.utc)

    if new_status == "approved":
        # Decrement balance
        current_year = date.today().year
        bal_result = await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.user_id == request.user_id,
                LeaveBalance.leave_type_id == request.leave_type_id,
                LeaveBalance.year == current_year,
            )
        )
        balance = bal_result.scalar_one_or_none()
        if balance:
            balance.used += request.total_days
            balance.remaining = balance.allocated - balance.used

        # Create attendance records for each day in the range
        current_date = request.start_date
        while current_date <= request.end_date:
            if current_date.weekday() < 5:  # Skip weekends
                # Check for existing attendance record
                existing = await db.execute(
                    select(AttendanceRecord).where(
                        AttendanceRecord.user_id == request.user_id,
                        AttendanceRecord.date == current_date,
                    )
                )
                att = existing.scalar_one_or_none()
                if att:
                    att.status = AttendanceStatus.on_leave
                    att.source = AttendanceSource.auto
                else:
                    db.add(AttendanceRecord(
                        user_id=request.user_id,
                        date=current_date,
                        status=AttendanceStatus.on_leave,
                        source=AttendanceSource.auto,
                    ))
            current_date += timedelta(days=1)

    # Audit log
    db.add(AuditLog(
        actor_id=reviewer.id,
        action=f"leave_{new_status}",
        entity_type="leave_request",
        entity_id=request.id,
        metadata_={
            "employee_id": request.user_id,
            "leave_type_id": request.leave_type_id,
            "days": request.total_days,
        },
    ))

    return {"message": f"Leave request {new_status}", "status": new_status}


async def update_allocation(
    db: AsyncSession,
    user_id: int,
    leave_type_id: int,
    allocated: int,
    admin: User,
) -> dict:
    """Update leave allocation for an employee."""
    current_year = date.today().year

    result = await db.execute(
        select(LeaveBalance).where(
            LeaveBalance.user_id == user_id,
            LeaveBalance.leave_type_id == leave_type_id,
            LeaveBalance.year == current_year,
        )
    )
    balance = result.scalar_one_or_none()

    if balance:
        balance.allocated = allocated
        balance.remaining = allocated - balance.used
    else:
        balance = LeaveBalance(
            user_id=user_id,
            leave_type_id=leave_type_id,
            year=current_year,
            allocated=allocated,
            used=0,
            remaining=allocated,
        )
        db.add(balance)

    db.add(AuditLog(
        actor_id=admin.id,
        action="update_allocation",
        entity_type="leave_balance",
        entity_id=balance.id if balance.id else 0,
        metadata_={"user_id": user_id, "leave_type_id": leave_type_id, "allocated": allocated},
    ))

    return {"message": "Allocation updated", "allocated": allocated}
