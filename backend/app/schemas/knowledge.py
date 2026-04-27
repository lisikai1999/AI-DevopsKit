from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class KnowledgeCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str = "📚"
    color: str = "#409eff"
    description: Optional[str] = None
    sort_order: int = 0


class KnowledgeCategoryCreate(KnowledgeCategoryBase):
    pass


class KnowledgeCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class KnowledgeCategoryResponse(KnowledgeCategoryBase):
    id: int
    is_active: bool
    is_custom: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = None
    content: str
    tags: Optional[List[str]] = []
    difficulty: str = "初级"
    read_time: str = "5 分钟"
    category_id: int


class KnowledgeArticleCreate(KnowledgeArticleBase):
    pass


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    difficulty: Optional[str] = None
    read_time: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class KnowledgeArticleResponse(KnowledgeArticleBase):
    id: int
    author_id: int
    is_active: bool
    is_custom: bool
    view_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
