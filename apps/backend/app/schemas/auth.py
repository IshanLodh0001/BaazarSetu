"""
BaazarSetu — Auth Schemas
"""
import re
import uuid
from typing import Optional
from pydantic import BaseModel, field_validator
from app.models.user import UserRole


PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")


class SendOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_REGEX.match(v):
            raise ValueError("Phone must be in E.164 format, e.g. +919876543210")
        return v


class SendOTPResponse(BaseModel):
    message: str
    verification_id: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    verification_id: str
    role: Optional[UserRole] = UserRole.artisan  # role selected at registration

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_REGEX.match(v):
            raise ValueError("Phone must be in E.164 format")
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class UserOut(BaseModel):
    user_id: uuid.UUID
    phone: str
    name: Optional[str] = None
    role: UserRole
    preferred_language: str
    profile_image: Optional[str] = None
    is_verified: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str
