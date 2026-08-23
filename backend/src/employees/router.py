"""Employees router — directory, provisioning, detail view."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from src.core.database import get_db
from src.auth.dependencies import get_current_active_user, require_admin_or_hr
from src.models.user import User
from src.employees.schemas import (
    CreateEmployeeRequest,
    EmployeeCardResponse,
    EmployeeDetailResponse,
    ProvisionedEmployeeResponse,
)
from src.employees.service import (
    provision_employee,
    get_employees_with_status,
    get_employee_detail,
)

router = APIRouter()


@router.post("", response_model=ProvisionedEmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    request: CreateEmployeeRequest,
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Provision a new employee (admin/HR only). Generates Login ID + temp password + sends email."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user, login_id = await provision_employee(
        db=db,
        admin_user=admin,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        department=request.department,
        designation=request.designation,
        manager_id=request.manager_id,
        date_of_joining=request.date_of_joining,
    )

    return ProvisionedEmployeeResponse(
        user_id=user.id,
        login_id=login_id,
        email=request.email,
    )


@router.get("", response_model=list[EmployeeCardResponse])
async def list_employees(
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get employee directory grid with status dots. All roles can view."""
    employees = await get_employees_with_status(
        db, current_user.company_id, search=search
    )
    return employees


@router.get("/{user_id}", response_model=EmployeeDetailResponse)
async def get_employee(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get employee detail. Salary fields OMITTED for non-admin callers."""
    # Verify same company
    target = await db.get(User, user_id)
    if not target or target.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    detail = await get_employee_detail(db, user_id, viewer=current_user)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    return detail
