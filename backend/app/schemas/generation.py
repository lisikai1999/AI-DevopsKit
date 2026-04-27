from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from ..models.generation import GenerationType


class GenerationBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    type: GenerationType
    content: str
    result: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}
    metadata: Optional[Dict[str, Any]] = {}
    project_id: Optional[int] = None


class GenerationCreate(GenerationBase):
    pass


class GenerationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    result: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class GenerationResponse(GenerationBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
