"""Salary service — DB operations with auto-calc engine."""

from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.salary import (
    SalaryStructure, SalaryComponent, WageType, CompensationType, PercentageOf
)
from src.models.user import User
from src.models.audit import AuditLog
from src.salary.calculator import calculate_salary, ComponentInput


async def get_salary_structure(
    db: AsyncSession, user_id: int
) -> dict | None:
    """Get salary structure with components for a user."""
    result = await db.execute(
        select(SalaryStructure)
        .options(selectinload(SalaryStructure.components))
        .where(SalaryStructure.user_id == user_id)
    )
    ss = result.scalar_one_or_none()
    if not ss:
        return None

    # Run calc to get computed values
    comp_inputs = [
        ComponentInput(
            name=c.name,
            compensation_type=c.compensation_type.value,
            percentage_of=c.percentage_of.value if c.percentage_of else None,
            amount=float(c.amount),
            percentage_value=c.percentage_value,
        )
        for c in ss.components
    ]
    calc = calculate_salary(
        month_wage=float(ss.month_wage),
        wage_type=ss.wage_type.value,
        yearly_wage=float(ss.yearly_wage),
        components=comp_inputs,
        pf_employee_pct=ss.pf_employee_pct,
        pf_employer_pct=ss.pf_employer_pct,
        professional_tax=float(ss.professional_tax),
    )

    return {
        "id": ss.id,
        "user_id": ss.user_id,
        "wage_type": ss.wage_type.value,
        "month_wage": calc.month_wage,
        "yearly_wage": calc.yearly_wage,
        "working_days_per_week": ss.working_days_per_week,
        "basic_hours": ss.basic_hours,
        "pf_employee_pct": ss.pf_employee_pct,
        "pf_employer_pct": ss.pf_employer_pct,
        "pf_employee_amount": calc.pf_employee_amount,
        "pf_employer_amount": calc.pf_employer_amount,
        "professional_tax": calc.professional_tax,
        "total_components": calc.total_components,
        "components": [
            {
                "id": None,
                "name": c.name,
                "compensation_type": c.compensation_type,
                "percentage_of": c.percentage_of,
                "amount": c.amount,
                "percentage_value": c.percentage_value,
            }
            for c in calc.components
        ],
    }


async def update_salary_structure(
    db: AsyncSession,
    user_id: int,
    admin: User,
    data: dict,
) -> dict:
    """Update salary structure. Runs auto-calc server-side, validates, saves."""
    # Run the calculation engine
    comp_inputs = [
        ComponentInput(
            name=c.get("name", ""),
            compensation_type=c.get("compensation_type", "fixed"),
            percentage_of=c.get("percentage_of"),
            amount=c.get("amount", 0),
            percentage_value=c.get("percentage_value"),
        )
        for c in data.get("components", [])
    ]

    calc = calculate_salary(
        month_wage=data.get("month_wage", 0),
        wage_type=data.get("wage_type", "monthly"),
        yearly_wage=data.get("yearly_wage", 0),
        components=comp_inputs,
        pf_employee_pct=data.get("pf_employee_pct", 0),
        pf_employer_pct=data.get("pf_employer_pct", 0),
        professional_tax=data.get("professional_tax", 0),
    )

    if not calc.is_valid:
        raise ValueError(calc.error)

    # Get or create salary structure
    result = await db.execute(
        select(SalaryStructure)
        .options(selectinload(SalaryStructure.components))
        .where(SalaryStructure.user_id == user_id)
    )
    ss = result.scalar_one_or_none()

    if not ss:
        ss = SalaryStructure(user_id=user_id)
        db.add(ss)
        await db.flush()

    # Update structure fields
    ss.wage_type = WageType(data.get("wage_type", "monthly"))
    ss.month_wage = calc.month_wage
    ss.yearly_wage = calc.yearly_wage
    ss.working_days_per_week = data.get("working_days_per_week", 5)
    ss.basic_hours = data.get("basic_hours", 8.0)
    ss.pf_employee_pct = data.get("pf_employee_pct", 0)
    ss.pf_employer_pct = data.get("pf_employer_pct", 0)
    ss.professional_tax = data.get("professional_tax", 0)
    ss.updated_by = admin.id
    ss.effective_from = datetime.now(timezone.utc)

    # Replace components
    await db.execute(
        delete(SalaryComponent).where(SalaryComponent.salary_structure_id == ss.id)
    )
    await db.flush()

    for comp_result in calc.components:
        sc = SalaryComponent(
            salary_structure_id=ss.id,
            name=comp_result.name,
            compensation_type=CompensationType(comp_result.compensation_type),
            percentage_of=PercentageOf(comp_result.percentage_of) if comp_result.percentage_of else None,
            amount=comp_result.amount,
            percentage_value=comp_result.percentage_value,
        )
        db.add(sc)

    # Audit log
    db.add(AuditLog(
        actor_id=admin.id,
        action="update_salary",
        entity_type="salary_structure",
        entity_id=ss.id,
        metadata_={"month_wage": calc.month_wage, "total_components": calc.total_components},
    ))

    return {
        "message": "Salary structure updated",
        "month_wage": calc.month_wage,
        "yearly_wage": calc.yearly_wage,
        "total_components": calc.total_components,
        "is_valid": calc.is_valid,
    }
