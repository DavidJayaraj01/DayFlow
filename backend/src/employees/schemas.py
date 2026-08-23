"""Employee schemas — request/response models."""

from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class CreateEmployeeRequest(BaseModel):
    """Admin/HR creates a new employee."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    manager_id: Optional[int] = None
    date_of_joining: date = Field(default_factory=date.today)


class EmployeeCardResponse(BaseModel):
    """Employee card for the directory grid."""
    id: int
    user_id: int
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    login_id: str
    email: str
    status_dot: str = "orange"  # green, yellow, orange
    role: str

    model_config = {"from_attributes": True}


class EmployeeDetailResponse(BaseModel):
    """Full employee detail — salary fields OMITTED for non-admin."""
    id: int
    user_id: int
    login_id: str
    email: str
    phone: Optional[str] = None
    role: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    date_of_joining: Optional[date] = None
    about: Optional[str] = None
    job_love_note: Optional[str] = None
    hobbies_note: Optional[str] = None
    status_dot: str = "orange"
    skills: List[str] = []
    certifications: List[dict] = []

    # Private info (visible to self + admin)
    date_of_birth: Optional[date] = None
    home_address: Optional[str] = None
    anniversary_date: Optional[date] = None
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None

    model_config = {"from_attributes": True}


class ProvisionedEmployeeResponse(BaseModel):
    """Response after provisioning a new employee."""
    user_id: int
    login_id: str
    email: str
    message: str = "Employee provisioned successfully. Credentials sent via email."
