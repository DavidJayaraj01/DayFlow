"""Salary structure and components models."""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    String, DateTime, ForeignKey, Integer, Numeric, Enum, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class WageType(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"


class CompensationType(str, enum.Enum):
    fixed = "fixed"
    percentage = "percentage"


class PercentageOf(str, enum.Enum):
    wage = "wage"
    basic = "basic"


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    wage_type: Mapped[WageType] = mapped_column(
        Enum(WageType, name="wage_type", create_type=True), default=WageType.monthly
    )
    month_wage: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    yearly_wage: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    working_days_per_week: Mapped[int] = mapped_column(Integer, default=5)
    basic_hours: Mapped[float] = mapped_column(Float, default=8.0)
    pf_employee_pct: Mapped[float] = mapped_column(Float, default=0)
    pf_employer_pct: Mapped[float] = mapped_column(Float, default=0)
    professional_tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="salary_structure", foreign_keys=[user_id])
    updater = relationship("User", foreign_keys=[updated_by])
    components = relationship(
        "SalaryComponent", back_populates="salary_structure", cascade="all, delete-orphan"
    )


class SalaryComponent(Base):
    __tablename__ = "salary_components"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    salary_structure_id: Mapped[int] = mapped_column(
        ForeignKey("salary_structures.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    compensation_type: Mapped[CompensationType] = mapped_column(
        Enum(CompensationType, name="compensation_type", create_type=True),
        default=CompensationType.fixed,
    )
    percentage_of: Mapped[PercentageOf | None] = mapped_column(
        Enum(PercentageOf, name="percentage_of", create_type=True), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    percentage_value: Mapped[float | None] = mapped_column(Float, nullable=True)

    salary_structure = relationship("SalaryStructure", back_populates="components")
