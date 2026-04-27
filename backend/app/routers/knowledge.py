from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.knowledge import KnowledgeCategory, KnowledgeArticle
from ..schemas.knowledge import (
    KnowledgeCategoryCreate, KnowledgeCategoryUpdate, KnowledgeCategoryResponse,
    KnowledgeArticleCreate, KnowledgeArticleUpdate, KnowledgeArticleResponse,
)
from ..deps import get_current_user, get_current_write_user, get_current_admin_user

router = APIRouter(prefix="/knowledge", tags=["知识库"])


@router.get("/categories", response_model=List[KnowledgeCategoryResponse])
def list_categories(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(KnowledgeCategory)
    
    if not include_inactive:
        query = query.filter(KnowledgeCategory.is_active == True)
    
    categories = query.order_by(KnowledgeCategory.sort_order.asc()).all()
    return categories


@router.post("/categories", response_model=KnowledgeCategoryResponse)
def create_category(
    category_in: KnowledgeCategoryCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    category = KnowledgeCategory(
        name=category_in.name,
        icon=category_in.icon,
        color=category_in.color,
        description=category_in.description,
        sort_order=category_in.sort_order,
        is_active=True,
        is_custom=False,
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/categories/{category_id}", response_model=KnowledgeCategoryResponse)
def get_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    category = db.query(KnowledgeCategory).filter(
        KnowledgeCategory.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/categories/{category_id}", response_model=KnowledgeCategoryResponse)
def update_category(
    category_id: int,
    category_in: KnowledgeCategoryUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    category = db.query(KnowledgeCategory).filter(
        KnowledgeCategory.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    update_data = category_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    return category


@router.get("/articles", response_model=List[KnowledgeArticleResponse])
def list_articles(
    category_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(KnowledgeArticle).filter(KnowledgeArticle.is_active == True)
    
    if category_id is not None:
        query = query.filter(KnowledgeArticle.category_id == category_id)
    
    articles = query.order_by(KnowledgeArticle.updated_at.desc()).offset(skip).limit(limit).all()
    return articles


@router.post("/articles", response_model=KnowledgeArticleResponse)
def create_article(
    article_in: KnowledgeArticleCreate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    category = db.query(KnowledgeCategory).filter(
        KnowledgeCategory.id == article_in.category_id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category_id"
        )
    
    article = KnowledgeArticle(
        title=article_in.title,
        summary=article_in.summary,
        content=article_in.content,
        tags=article_in.tags or [],
        difficulty=article_in.difficulty,
        read_time=article_in.read_time,
        category_id=article_in.category_id,
        author_id=current_user.id,
        is_active=True,
        is_custom=True,
        view_count=0,
    )
    
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def get_article(
    article_id: int,
    increment_view: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.is_active == True
    ).first()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    if increment_view:
        article.view_count += 1
        db.commit()
    
    return article


@router.put("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def update_article(
    article_id: int,
    article_in: KnowledgeArticleUpdate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.author_id == current_user.id
    ).first()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found or you don't have permission"
        )
    
    update_data = article_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            setattr(article, key, value)
    
    db.commit()
    db.refresh(article)
    return article


@router.delete("/articles/{article_id}")
def delete_article(
    article_id: int,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    article = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.id == article_id,
        KnowledgeArticle.author_id == current_user.id
    ).first()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found or you don't have permission"
        )
    
    article.is_active = False
    db.commit()
    return {"message": "Article deleted successfully"}
