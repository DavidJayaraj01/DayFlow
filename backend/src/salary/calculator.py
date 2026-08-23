"""Salary auto-calculation engine — pure functions, no DB dependency.

Core rules:
1. If compensation_type = percentage and percentage_of = wage:
   amount = percentage_value / 100 × month_wage
2. If compensation_type = percentage and percentage_of = basic:
   amount = percentage_value / 100 × basic_salary_amount
3. Monthly ↔ Yearly kept in sync: yearly = monthly × 12
4. Sum of all component amounts must NOT exceed month_wage
5. PF amounts: pf_employee_pct / 100 × basic_salary_amount

Spec example: wage=₹50,000, Basic=60% of wage → ₹30,000, HRA=50% of Basic → ₹15,000.
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ComponentInput:
    """Input for a salary component."""
    name: str
    compensation_type: str  # "fixed" or "percentage"
    percentage_of: Optional[str] = None  # "wage" or "basic"
    amount: float = 0.0
    percentage_value: Optional[float] = None


@dataclass
class ComponentResult:
    """Result after calculation."""
    name: str
    compensation_type: str
    percentage_of: Optional[str]
    amount: float
    percentage_value: Optional[float]


@dataclass
class SalaryCalcResult:
    """Full salary calculation result."""
    month_wage: float
    yearly_wage: float
    components: List[ComponentResult]
    basic_salary_amount: float
    pf_employee_amount: float
    pf_employer_amount: float
    professional_tax: float
    total_components: float
    is_valid: bool
    error: Optional[str] = None


def calculate_salary(
    month_wage: float,
    wage_type: str,
    yearly_wage: float,
    components: List[ComponentInput],
    pf_employee_pct: float = 0.0,
    pf_employer_pct: float = 0.0,
    professional_tax: float = 0.0,
) -> SalaryCalcResult:
    """Calculate all salary components based on the auto-calc rules.

    Two-pass algorithm:
    1. First pass: compute Basic Salary (must be computed first as other components
       may depend on it)
    2. Second pass: compute all other components that may depend on Basic
    """
    # Sync monthly/yearly
    if wage_type == "yearly":
        month_wage = yearly_wage / 12
    else:
        yearly_wage = month_wage * 12

    # First pass: find and compute Basic Salary
    basic_amount = 0.0
    results: List[ComponentResult] = []

    for comp in components:
        if comp.name.lower() == "basic salary":
            if comp.compensation_type == "percentage" and comp.percentage_of == "wage":
                pct = comp.percentage_value or 0
                basic_amount = round(pct / 100 * month_wage, 2)
                results.append(ComponentResult(
                    name=comp.name,
                    compensation_type=comp.compensation_type,
                    percentage_of=comp.percentage_of,
                    amount=basic_amount,
                    percentage_value=comp.percentage_value,
                ))
            else:
                basic_amount = comp.amount
                results.append(ComponentResult(
                    name=comp.name,
                    compensation_type=comp.compensation_type,
                    percentage_of=comp.percentage_of,
                    amount=comp.amount,
                    percentage_value=comp.percentage_value,
                ))
            break

    # Second pass: compute all other components
    for comp in components:
        if comp.name.lower() == "basic salary":
            continue  # Already handled

        if comp.compensation_type == "percentage":
            pct = comp.percentage_value or 0
            if comp.percentage_of == "wage":
                amount = round(pct / 100 * month_wage, 2)
            elif comp.percentage_of == "basic":
                amount = round(pct / 100 * basic_amount, 2)
            else:
                amount = comp.amount
            results.append(ComponentResult(
                name=comp.name,
                compensation_type=comp.compensation_type,
                percentage_of=comp.percentage_of,
                amount=amount,
                percentage_value=comp.percentage_value,
            ))
        else:
            # Fixed amount
            results.append(ComponentResult(
                name=comp.name,
                compensation_type=comp.compensation_type,
                percentage_of=comp.percentage_of,
                amount=comp.amount,
                percentage_value=comp.percentage_value,
            ))

    # Compute totals
    total_components = round(sum(r.amount for r in results), 2)

    # PF calculations (based on Basic Salary)
    pf_employee_amount = round(pf_employee_pct / 100 * basic_amount, 2)
    pf_employer_amount = round(pf_employer_pct / 100 * basic_amount, 2)

    # Validate: total components must not exceed wage
    is_valid = total_components <= month_wage
    error = None
    if not is_valid:
        error = (
            f"Total salary components ({total_components}) exceed "
            f"monthly wage ({month_wage}). Difference: {total_components - month_wage}"
        )

    return SalaryCalcResult(
        month_wage=round(month_wage, 2),
        yearly_wage=round(yearly_wage, 2),
        components=results,
        basic_salary_amount=basic_amount,
        pf_employee_amount=pf_employee_amount,
        pf_employer_amount=pf_employer_amount,
        professional_tax=professional_tax,
        total_components=total_components,
        is_valid=is_valid,
        error=error,
    )
