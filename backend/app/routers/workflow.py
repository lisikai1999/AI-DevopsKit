from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.workflow import (
    Workflow, WorkflowStatus,
    WorkflowExecution, ExecutionStatus,
    WorkflowStepExecution
)
from ..schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowExecutionCreate, WorkflowExecutionResponse,
    WorkflowStepExecutionResponse,
)
from ..deps import get_current_user, get_current_write_user

router = APIRouter(prefix="/workflow", tags=["工作流"])


@router.post("", response_model=WorkflowResponse)
def create_workflow(
    workflow_in: WorkflowCreate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    workflow = Workflow(
        name=workflow_in.name,
        description=workflow_in.description,
        icon=workflow_in.icon,
        steps=workflow_in.steps or [],
        connections=workflow_in.connections or [],
        config=workflow_in.config or {},
        owner_id=current_user.id,
        status=WorkflowStatus.DRAFT,
        is_template=False,
        version=1,
    )
    
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("", response_model=List[WorkflowResponse])
def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[WorkflowStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(Workflow).filter(Workflow.owner_id == current_user.id)
    
    if status:
        query = query.filter(Workflow.status == status)
    
    workflows = query.order_by(Workflow.updated_at.desc()).offset(skip).limit(limit).all()
    return workflows


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.owner_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(
    workflow_id: int,
    workflow_in: WorkflowUpdate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.owner_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    update_data = workflow_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            setattr(workflow, key, value)
    
    db.commit()
    db.refresh(workflow)
    return workflow


@router.delete("/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.owner_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    db.delete(workflow)
    db.commit()
    return {"message": "Workflow deleted successfully"}


@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
def execute_workflow(
    workflow_id: int,
    execution_in: WorkflowExecutionCreate,
    current_user: User = Depends(get_current_write_user),
    db: Session = Depends(get_db)
) -> Any:
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.owner_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    execution = WorkflowExecution(
        workflow_id=workflow.id,
        owner_id=current_user.id,
        workflow_snapshot={
            "name": workflow.name,
            "description": workflow.description,
            "steps": workflow.steps,
            "connections": workflow.connections,
            "config": workflow.config,
            "version": workflow.version,
        },
        parameters=execution_in.parameters or {},
        trigger=execution_in.trigger,
        status=ExecutionStatus.PENDING,
    )
    
    db.add(execution)
    db.commit()
    db.refresh(execution)
    
    return execution


@router.get("/executions", response_model=List[WorkflowExecutionResponse])
def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    workflow_id: Optional[int] = None,
    status: Optional[ExecutionStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(WorkflowExecution).filter(WorkflowExecution.owner_id == current_user.id)
    
    if workflow_id is not None:
        query = query.filter(WorkflowExecution.workflow_id == workflow_id)
    
    if status:
        query = query.filter(WorkflowExecution.status == status)
    
    executions = query.order_by(WorkflowExecution.created_at.desc()).offset(skip).limit(limit).all()
    return executions


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionResponse)
def get_execution(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.owner_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    return execution


@router.get("/executions/{execution_id}/steps", response_model=List[WorkflowStepExecutionResponse])
def get_execution_steps(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.owner_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    steps = db.query(WorkflowStepExecution).filter(
        WorkflowStepExecution.execution_id == execution_id
    ).order_by(WorkflowStepExecution.started_at.asc()).all()
    
    return steps
