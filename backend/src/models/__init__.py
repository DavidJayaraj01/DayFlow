"""Import all SQLAlchemy models to ensure complete declarative registry."""

from src.models.company import Company
from src.models.user import User, UserRole
from src.models.employee import (
    EmployeeProfile,
    EmployeePrivateInfo,
    EmployeeSkill,
    EmployeeCertification,
)
from src.models.salary import (
    SalaryStructure,
    SalaryComponent,
    WageType,
    CompensationType,
    PercentageOf,
)
from src.models.attendance import (
    AttendanceRecord,
    AttendanceStatus,
    AttendanceSource,
)
from src.models.leave import (
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    LeaveStatus,
)
from src.models.audit import AuditLog
from src.models.login_id_counter import LoginIdCounter

__all__ = [
    "Company",
    "User",
    "UserRole",
    "EmployeeProfile",
    "EmployeePrivateInfo",
    "EmployeeSkill",
    "EmployeeCertification",
    "SalaryStructure",
    "SalaryComponent",
    "WageType",
    "CompensationType",
    "PercentageOf",
    "AttendanceRecord",
    "AttendanceStatus",
    "AttendanceSource",
    "LeaveType",
    "LeaveBalance",
    "LeaveRequest",
    "LeaveStatus",
    "AuditLog",
    "LoginIdCounter",
]
