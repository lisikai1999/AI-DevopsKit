from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from ..models.user import UserRole
import re


def validate_email(email: str) -> str:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError('Invalid email format')
    return email


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    full_name: Optional[str] = Field(None, max_length=100)
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        return validate_email(v)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        if v is None:
            return v
        return validate_email(v)


class UserUpdateAdmin(UserUpdate):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[int] = None
