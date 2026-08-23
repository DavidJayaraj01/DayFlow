"""User model — authentication and role management."""

import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    hr_officer = "hr_officer"
    employee = "employee"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    login_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=True), nullable=False
    )
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    company = relationship("Company", back_populates="users")
    profile = relationship(
        "EmployeeProfile",
        back_populates="user",
        uselist=False,
        foreign_keys="[EmployeeProfile.user_id]",
    )
    private_info = relationship(
        "EmployeePrivateInfo",
        back_populates="user",
        uselist=False,
        foreign_keys="[EmployeePrivateInfo.user_id]",
    )
    skills = relationship("EmployeeSkill", back_populates="user")
    certifications = relationship("EmployeeCertification", back_populates="user")
    salary_structure = relationship(
        "SalaryStructure",
        back_populates="user",
        uselist=False,
        foreign_keys="[SalaryStructure.user_id]",
    )
    attendance_records = relationship("AttendanceRecord", back_populates="user")
    leave_balances = relationship("LeaveBalance", back_populates="user")
    leave_requests = relationship(
        "LeaveRequest",
        back_populates="user",
        foreign_keys="[LeaveRequest.user_id]",
    )
    audit_logs = relationship("AuditLog", back_populates="actor")

    @property
    def is_admin_or_hr(self) -> bool:
        return self.role in (UserRole.admin, UserRole.hr_officer)
