from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    customer = "customer"
    admin = "admin"
    staff = "staff"


class OtpRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=32)


class OtpVerify(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    code: str = Field(min_length=4, max_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str


class CreateStaffRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.staff


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: UUID | str
    phone: str
    email: str | None = None
    name: str
    role: str
    is_active: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    detail: str
