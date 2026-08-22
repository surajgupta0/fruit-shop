from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    customer = "customer"
    admin = "admin"
    staff = "staff"


class AddressCreate(BaseModel):
    label: str = Field(default="home", max_length=64)
    line1: str = Field(min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=1, max_length=20)
    country: str = Field(default="IN", min_length=2, max_length=2)
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=64)
    line1: str | None = Field(default=None, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, min_length=2, max_length=2)
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: UUID | str
    label: str
    line1: str
    line2: str | None = None
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.staff


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=8, max_length=32)


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserPasswordUpdate(BaseModel):
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: UUID | str
    phone: str
    email: str | None = None
    name: str
    role: str
    is_active: bool
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int


class PermissionResponse(BaseModel):
    id: UUID | str
    code: str
    description: str | None = None

    model_config = {"from_attributes": True}


class RoleResponse(BaseModel):
    id: UUID | str
    name: str
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
