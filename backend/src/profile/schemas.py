"""Profile schemas — field-level update models."""

from datetime import date
from pydantic import BaseModel, Field
from typing import Optional, List


class UpdatePersonalRequest(BaseModel):
    """Update personal/profile info.
    Employee (self): only phone, home_address, profile_picture_url allowed.
    Admin/HR: all fields.
    """
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None
    date_of_joining: Optional[date] = None
    about: Optional[str] = None
    job_love_note: Optional[str] = None
    hobbies_note: Optional[str] = None
    phone: Optional[str] = None
    home_address: Optional[str] = None

    # Skills and certifications as separate lists
    skills: Optional[List[str]] = None
    certifications: Optional[List[dict]] = None


class UpdatePrivateInfoRequest(BaseModel):
    """Update private info — admin/HR only for all fields except address/phone by self."""
    date_of_birth: Optional[date] = None
    home_address: Optional[str] = None
    anniversary_date: Optional[date] = None
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None


class UploadProfilePictureResponse(BaseModel):
    profile_picture_url: str
