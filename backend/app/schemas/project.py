from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = {}
    tags: Optional[List[str]] = []


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_archived: Optional[int] = None


class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    is_archived: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
