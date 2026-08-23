"""Employee profile, private info, skills, and certifications models."""

from datetime import date, datetime, timezone
from sqlalchemy import String, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    profile_picture_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    date_of_joining: Mapped[date | None] = mapped_column(Date, nullable=True)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_love_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    hobbies_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="profile", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])


class EmployeePrivateInfo(Base):
    __tablename__ = "employee_private_info"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    home_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    anniversary_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    user = relationship("User", back_populates="private_info")


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)

    user = relationship("User", back_populates="skills")


class EmployeeCertification(Base):
    __tablename__ = "employee_certifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    cert_name: Mapped[str] = mapped_column(String(255), nullable=False)
    issued_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    user = relationship("User", back_populates="certifications")
