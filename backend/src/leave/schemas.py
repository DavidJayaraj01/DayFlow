"""Leave schemas."""

from datetime import date
from pydantic import BaseModel, Field
from typing import Optional, List


class LeaveTypeResponse(BaseModel):
    id: int
    name: str
    default_annual_quota: int
    model_config = {"from_attributes": True}


class LeaveBalanceResponse(BaseModel):
    id: Optional[int] = None
    user_id: Optional[int] = None
    employee_name: Optional[str] = None
    leave_type_id: int
    leave_type_name: str
    year: int
    allocated: int
    used: int
    remaining: int


class CreateLeaveRequest(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    total_days: Optional[int] = None  # auto-computed if not provided

    @property
    def computed_days(self) -> int:
        if self.total_days:
            return self.total_days
        delta = self.end_date - self.start_date
        return delta.days + 1


class LeaveRequestResponse(BaseModel):
    id: int
    user_id: int
    employee_name: Optional[str] = None
    leave_type_id: int
    leave_type_name: Optional[str] = None
    start_date: date
    end_date: date
    total_days: int
    attachment_url: Optional[str] = None
    status: str
    review_comment: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewLeaveRequest(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    review_comment: Optional[str] = None


class AllocationUpdateRequest(BaseModel):
    allocated: int = Field(..., ge=0)
