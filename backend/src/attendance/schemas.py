"""Attendance schemas."""

from datetime import date, time
from pydantic import BaseModel
from typing import Optional, List


class CheckInResponse(BaseModel):
    message: str
    check_in_time: str
    date: date
    status: str


class CheckOutResponse(BaseModel):
    message: str
    check_out_time: str
    work_hours: float
    extra_hours: float
    date: date


class AttendanceRecordResponse(BaseModel):
    id: int
    user_id: int
    employee_name: Optional[str] = None
    date: date
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    work_hours: Optional[float] = None
    extra_hours: Optional[float] = None
    status: str

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    present_days: int
    leave_days: int
    absent_days: int
    total_working_days: int
    month: int
    year: int


class AttendanceListResponse(BaseModel):
    records: List[AttendanceRecordResponse]
    summary: AttendanceSummary


class TodayStatusResponse(BaseModel):
    is_checked_in: bool
    check_in_time: Optional[str] = None
    status_dot: str
