"""Unit tests for the salary calculation engine."""

import pytest
from src.salary.calculator import calculate_salary, ComponentInput


def test_basic_and_hra_cascade_spec_example():
    """Spec example: wage = ₹50,000, Basic = 60% of wage -> ₹30,000.

    HRA = 50% of Basic -> ₹15,000.
    Standard Allowance = fixed ₹5,000.
    Total = ₹50,000.
    """
    components = [
        ComponentInput(
            name="Basic Salary",
            compensation_type="percentage",
            percentage_of="wage",
            percentage_value=60.0,
        ),
        ComponentInput(
            name="House Rent Allowance",
            compensation_type="percentage",
            percentage_of="basic",
            percentage_value=50.0,
        ),
        ComponentInput(
            name="Standard Allowance",
            compensation_type="fixed",
            amount=5000.0,
        ),
    ]

    result = calculate_salary(
        month_wage=50000.0,
        wage_type="monthly",
        yearly_wage=600000.0,
        components=components,
        pf_employee_pct=12.0,
        pf_employer_pct=12.0,
        professional_tax=200.0,
    )

    assert result.is_valid is True
    assert result.month_wage == 50000.0
    assert result.yearly_wage == 600000.0
    assert result.basic_salary_amount == 30000.0

    # Check component amounts
    comp_dict = {c.name: c.amount for c in result.components}
    assert comp_dict["Basic Salary"] == 30000.0
    assert comp_dict["House Rent Allowance"] == 15000.0
    assert comp_dict["Standard Allowance"] == 5000.0

    assert result.total_components == 50000.0

    # PF is calculated on Basic Salary (12% of 30,000 = 3,600)
    assert result.pf_employee_amount == 3600.0
    assert result.pf_employer_amount == 3600.0
    assert result.professional_tax == 200.0


def test_yearly_wage_synchronization():
    """Test yearly wage computes monthly wage correctly (yearly / 12)."""
    components = [
        ComponentInput(
            name="Basic Salary",
            compensation_type="percentage",
            percentage_of="wage",
            percentage_value=50.0,
        ),
    ]

    result = calculate_salary(
        month_wage=0,
        wage_type="yearly",
        yearly_wage=1200000.0,
        components=components,
    )

    assert result.month_wage == 100000.0
    assert result.yearly_wage == 1200000.0
    assert result.basic_salary_amount == 50000.0


def test_validation_fails_when_components_exceed_wage():
    """Test that is_valid is False and error is populated when total > wage."""
    components = [
        ComponentInput(
            name="Basic Salary",
            compensation_type="percentage",
            percentage_of="wage",
            percentage_value=70.0,  # 35,000
        ),
        ComponentInput(
            name="House Rent Allowance",
            compensation_type="percentage",
            percentage_of="basic",
            percentage_value=60.0,  # 21,000 -> total = 56,000 > 50,000
        ),
    ]

    result = calculate_salary(
        month_wage=50000.0,
        wage_type="monthly",
        yearly_wage=600000.0,
        components=components,
    )

    assert result.is_valid is False
    assert result.total_components == 56000.0
    assert "exceed" in result.error
