"""Employee service — provisioning, directory, status dot computation."""

from datetime import date, datetime, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.security import hash_password, generate_temp_password
from src.core.email import send_employee_credentials_email
from src.employees.login_id import generate_login_id
from src.models.user import User, UserRole
from src.models.company import Company
from src.models.employee import EmployeeProfile, EmployeePrivateInfo
from src.models.attendance import AttendanceRecord, AttendanceStatus
from src.models.leave import LeaveRequest, LeaveStatus, LeaveBalance, LeaveType
from src.models.audit import AuditLog


async def provision_employee(
    db: AsyncSession,
    admin_user: User,
    first_name: str,
    last_name: str,
    email: str,
    phone: str | None,
    department: str | None,
    designation: str | None,
    manager_id: int | None,
    date_of_joining: date,
) -> tuple[User, str]:
    """Create a new employee: generates Login ID, temp password, sends email."""
    # Get company name
    company = await db.get(Company, admin_user.company_id)

    # Generate Login ID
    login_id = await generate_login_id(
        db=db,
        company_name=company.name,
        first_name=first_name,
        last_name=last_name,
        joining_year=date_of_joining.year,
        company_id=company.id,
    )

    # Generate temp password
    temp_password = generate_temp_password()

    # Create user
    user = User(
        company_id=company.id,
        login_id=login_id,
        email=email,
        phone=phone,
        password_hash=hash_password(temp_password),
        role=UserRole.employee,
        must_change_password=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create profile
    profile = EmployeeProfile(
        user_id=user.id,
        first_name=first_name,
        last_name=last_name,
        department=department,
        designation=designation,
        manager_id=manager_id,
        date_of_joining=date_of_joining,
    )
    db.add(profile)

    # Create private info
    private_info = EmployeePrivateInfo(user_id=user.id, phone=phone)
    db.add(private_info)

    # Create default leave balances
    leave_types_result = await db.execute(
        select(LeaveType).where(LeaveType.company_id == company.id)
    )
    leave_types = leave_types_result.scalars().all()
    current_year = date.today().year
    for lt in leave_types:
        balance = LeaveBalance(
            user_id=user.id,
            leave_type_id=lt.id,
            year=current_year,
            allocated=lt.default_annual_quota,
            used=0,
            remaining=lt.default_annual_quota,
        )
        db.add(balance)

    # Audit log
    audit = AuditLog(
        actor_id=admin_user.id,
        action="create_employee",
        entity_type="user",
        entity_id=user.id,
        metadata_={"login_id": login_id, "email": email},
    )
    db.add(audit)

    # Send credentials email
    await send_employee_credentials_email(
        to_email=email,
        employee_name=f"{first_name} {last_name}",
        login_id=login_id,
        temp_password=temp_password,
        company_name=company.name,
    )

    return user, login_id


async def compute_status_dot(
    db: AsyncSession, user_id: int, for_date: date | None = None
) -> str:
    """Compute status dot for an employee.

    - green: checked in today (has attendance record with check_in)
    - yellow: on approved leave today
    - orange: no check-in and no approved leave (unexplained absence)
    """
    today = for_date or date.today()

    # Check attendance record
    att_result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.date == today,
        )
    )
    attendance = att_result.scalar_one_or_none()

    if attendance:
        if attendance.status == AttendanceStatus.on_leave:
            return "yellow"
        if attendance.check_in_time is not None:
            return "green"

    # Check for approved leave covering today
    leave_result = await db.execute(
        select(LeaveRequest).where(
            LeaveRequest.user_id == user_id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
        )
    )
    leave = leave_result.scalar_one_or_none()
    if leave:
        return "yellow"

    return "orange"


async def get_employees_with_status(
    db: AsyncSession, company_id: int, search: str | None = None
) -> list[dict]:
    """Get all employees for a company with status dots."""
    stmt = (
        select(User)
        .options(selectinload(User.profile))
        .where(User.company_id == company_id, User.is_active == True)
    )

    if search:
        stmt = stmt.join(User.profile).where(
            EmployeeProfile.first_name.ilike(f"%{search}%")
            | EmployeeProfile.last_name.ilike(f"%{search}%")
            | User.email.ilike(f"%{search}%")
            | User.login_id.ilike(f"%{search}%")
        )

    result = await db.execute(stmt)
    users = result.scalars().all()

    employees = []
    for user in users:
        if not user.profile:
            continue
        status_dot = await compute_status_dot(db, user.id)
        employees.append({
            "id": user.profile.id,
            "user_id": user.id,
            "first_name": user.profile.first_name,
            "last_name": user.profile.last_name,
            "profile_picture_url": user.profile.profile_picture_url,
            "department": user.profile.department,
            "designation": user.profile.designation,
            "login_id": user.login_id,
            "email": user.email,
            "status_dot": status_dot,
            "role": user.role.value,
        })

    return employees


async def get_employee_detail(
    db: AsyncSession, user_id: int, viewer: User
) -> dict | None:
    """Get full employee detail. Salary fields OMITTED for non-admin viewers."""
    stmt = (
        select(User)
        .options(
            selectinload(User.profile),
            selectinload(User.private_info),
            selectinload(User.skills),
            selectinload(User.certifications),
        )
        .where(User.id == user_id, User.is_active == True)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.profile:
        return None

    status_dot = await compute_status_dot(db, user.id)

    # Get manager name if exists
    manager_name = None
    if user.profile.manager_id:
        mgr_result = await db.execute(
            select(User).options(selectinload(User.profile)).where(
                User.id == user.profile.manager_id
            )
        )
        mgr = mgr_result.scalar_one_or_none()
        if mgr and mgr.profile:
            manager_name = f"{mgr.profile.first_name} {mgr.profile.last_name}"

    data = {
        "id": user.profile.id,
        "user_id": user.id,
        "login_id": user.login_id,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "first_name": user.profile.first_name,
        "last_name": user.profile.last_name,
        "profile_picture_url": user.profile.profile_picture_url,
        "department": user.profile.department,
        "designation": user.profile.designation,
        "manager_id": user.profile.manager_id,
        "manager_name": manager_name,
        "date_of_joining": user.profile.date_of_joining,
        "about": user.profile.about,
        "job_love_note": user.profile.job_love_note,
        "hobbies_note": user.profile.hobbies_note,
        "status_dot": status_dot,
        "skills": [s.skill_name for s in user.skills],
        "certifications": [
            {
                "id": c.id,
                "cert_name": c.cert_name,
                "issued_by": c.issued_by,
                "issued_date": c.issued_date.isoformat() if c.issued_date else None,
            }
            for c in user.certifications
        ],
    }

    # Private info — visible to self + admin/hr
    if viewer.id == user.id or viewer.is_admin_or_hr:
        pi = user.private_info
        if pi:
            data.update({
                "date_of_birth": pi.date_of_birth,
                "home_address": pi.home_address,
                "anniversary_date": pi.anniversary_date,
                "personal_email": pi.personal_email,
                "gender": pi.gender,
                "marital_status": pi.marital_status,
                "blood_group": pi.blood_group,
            })

    # Salary is NEVER included here — it's a separate endpoint with admin-only access

    return data
