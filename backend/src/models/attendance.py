"""Attendance records model."""

import enum
from datetime import date, time, datetime, timezone
from sqlalchemy import (
    String, Date, Time, DateTime, ForeignKey, Float, Enum, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"
    on_leave = "on_leave"


class AttendanceSource(str, enum.Enum):
    manual = "manual"
    auto = "auto"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in_time: Mapped[time | None] = mapped_column(Time(timezone=True), nullable=True)
    check_out_time: Mapped[time | None] = mapped_column(Time(timezone=True), nullable=True)
    work_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    extra_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status", create_type=True),
        default=AttendanceStatus.present,
    )
    source: Mapped[AttendanceSource] = mapped_column(
        Enum(AttendanceSource, name="attendance_source", create_type=True),
        default=AttendanceSource.manual,
    )

    user = relationship("User", back_populates="attendance_records")
