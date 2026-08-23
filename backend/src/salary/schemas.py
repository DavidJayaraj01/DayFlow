"""Salary schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List


class SalaryComponentSchema(BaseModel):
    id: Optional[int] = None
    name: str
    compensation_type: str = "fixed"  # "fixed" or "percentage"
    percentage_of: Optional[str] = None  # "wage" or "basic"
    amount: float = 0.0
    percentage_value: Optional[float] = None


class SalaryStructureResponse(BaseModel):
    id: int
    user_id: int
    wage_type: str
    month_wage: float
    yearly_wage: float
    working_days_per_week: int
    basic_hours: float
    pf_employee_pct: float
    pf_employer_pct: float
    pf_employee_amount: float = 0.0
    pf_employer_amount: float = 0.0
    professional_tax: float
    components: List[SalaryComponentSchema]
    total_components: float = 0.0

    model_config = {"from_attributes": True}


class UpdateSalaryRequest(BaseModel):
    wage_type: str = "monthly"
    month_wage: float = 0
    yearly_wage: float = 0
    working_days_per_week: int = 5
    basic_hours: float = 8.0
    pf_employee_pct: float = 0
    pf_employer_pct: float = 0
    professional_tax: float = 0
    components: List[SalaryComponentSchema] = []


class SalaryCalcPreviewResponse(BaseModel):
    """Preview response after auto-calculation."""
    month_wage: float
    yearly_wage: float
    components: List[SalaryComponentSchema]
    basic_salary_amount: float
    pf_employee_amount: float
    pf_employer_amount: float
    professional_tax: float
    total_components: float
    is_valid: bool
    error: Optional[str] = None
