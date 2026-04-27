from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.generation import GenerationRecord, GenerationType
from ..schemas.generation import GenerationCreate, GenerationUpdate, GenerationResponse
from ..deps import get_current_user, get_current_write_user

router = APIRouter(prefix="/generations", tags=["生成记录"])


@router.post("", response_model=GenerationResponse)
def create_generation(
    generation_in: GenerationCreate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    generation = GenerationRecord(
        title=generation_in.title,
        type=generation_in.type,
        content=generation_in.content,
        result=generation_in.result,
        parameters=generation_in.parameters or {},
        metadata=generation_in.metadata or {},
        owner_id=current_user.id,
        project_id=generation_in.project_id,
    )
    
    db.add(generation)
    db.commit()
    db.refresh(generation)
    return generation


@router.get("", response_model=List[GenerationResponse])
def list_generations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    type: Optional[GenerationType] = None,
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(GenerationRecord).filter(GenerationRecord.owner_id == current_user.id)
    
    if type:
        query = query.filter(GenerationRecord.type == type)
    
    if project_id is not None:
        query = query.filter(GenerationRecord.project_id == project_id)
    
    generations = query.order_by(GenerationRecord.created_at.desc()).offset(skip).limit(limit).all()
    return generations


@router.get("/{generation_id}", response_model=GenerationResponse)
def get_generation(
    generation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    generation = db.query(GenerationRecord).filter(
        GenerationRecord.id == generation_id,
        GenerationRecord.owner_id == current_user.id
    ).first()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )
    return generation


@router.put("/{generation_id}", response_model=GenerationResponse)
def update_generation(
    generation_id: int,
    generation_in: GenerationUpdate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    generation = db.query(GenerationRecord).filter(
        GenerationRecord.id == generation_id,
        GenerationRecord.owner_id == current_user.id
    ).first()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )
    
    update_data = generation_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            setattr(generation, key, value)
    
    db.commit()
    db.refresh(generation)
    return generation


@router.delete("/{generation_id}")
def delete_generation(
    generation_id: int,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    generation = db.query(GenerationRecord).filter(
        GenerationRecord.id == generation_id,
        GenerationRecord.owner_id == current_user.id
    ).first()
    
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )
    
    db.delete(generation)
    db.commit()
    return {"message": "Generation deleted successfully"}


@router.get("/history/export")
def export_history(
    type: Optional[GenerationType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(GenerationRecord).filter(GenerationRecord.owner_id == current_user.id)
    
    if type:
        query = query.filter(GenerationRecord.type == type)
    
    generations = query.order_by(GenerationRecord.created_at.desc()).all()
    
    export_data = [
        {
            "id": g.id,
            "title": g.title,
            "type": g.type.value if hasattr(g.type, 'value') else g.type,
            "content": g.content,
            "result": g.result,
            "parameters": g.parameters,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        }
        for g in generations
    ]
    
    return {
        "count": len(export_data),
        "exported_at": None,
        "data": export_data
    }
