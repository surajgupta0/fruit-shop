from pydantic import BaseModel, EmailStr, Field


class OtpRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=32)


class OtpVerify(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    code: str = Field(min_length=4, max_length=8)
    name: str | None = Field(default=None, min_length=1, max_length=255)


class EmailOtpRequest(BaseModel):
    email: EmailStr


class EmailOtpVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    name: str | None = Field(default=None, min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
