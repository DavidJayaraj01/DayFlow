"""Salary router — admin/HR only. 403 for non-admin callers."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.auth.dependencies import require_admin_or_hr
from src.models.user import User
from src.salary.schemas import (
    SalaryStructureResponse, UpdateSalaryRequest, SalaryCalcPreviewResponse
)
from src.salary.service import get_salary_structure, update_salary_structure

router = APIRouter()


@router.get("/{user_id}/salary", response_model=SalaryStructureResponse)
async def get_employee_salary(
    user_id: int,
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Get salary structure — admin/HR ONLY. Returns 403 for non-admin callers."""
    # Same company check
    target = await db.get(User, user_id)
    if not target or target.company_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    result = await get_salary_structure(db, user_id)
    if not result:
        # Return empty structure
        return SalaryStructureResponse(
            id=0,
            user_id=user_id,
            wage_type="monthly",
            month_wage=0,
            yearly_wage=0,
            working_days_per_week=5,
            basic_hours=8.0,
            pf_employee_pct=0,
            pf_employer_pct=0,
            pf_employee_amount=0,
            pf_employer_amount=0,
            professional_tax=0,
            components=[],
            total_components=0,
        )
    return result


@router.put("/{user_id}/salary", response_model=dict)
async def update_employee_salary(
    user_id: int,
    request: UpdateSalaryRequest,
    admin: User = Depends(require_admin_or_hr),
    db: AsyncSession = Depends(get_db),
):
    """Update salary structure with auto-calc — admin/HR ONLY."""
    target = await db.get(User, user_id)
    if not target or target.company_id != admin.company_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    try:
        result = await update_salary_structure(
            db, user_id, admin, request.model_dump()
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
