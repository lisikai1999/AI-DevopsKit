from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.workflow import WorkflowStatus, ExecutionStatus, StepStatus


class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = "🔄"
    template_id: Optional[str] = None
    is_template: Optional[bool] = False
    version: Optional[int] = 1
    steps: List[Dict[str, Any]] = []
    connections: Optional[List[Dict[str, Any]]] = []
    config: Optional[Dict[str, Any]] = {}
    variables: Optional[Dict[str, Any]] = {}
    settings: Optional[Dict[str, Any]] = {}
    tags: Optional[List[str]] = []
    project_id: Optional[int] = None


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    variables: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    status: Optional[WorkflowStatus] = None


class WorkflowResponse(WorkflowBase):
    id: int
    owner_id: int
    status: WorkflowStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowExecutionBase(BaseModel):
    workflow_id: int
    trigger: Optional[str] = "manual"
    parameters: Optional[Dict[str, Any]] = {}
    runtime_variables: Optional[Dict[str, Any]] = {}


class WorkflowExecutionCreate(WorkflowExecutionBase):
    pass


class WorkflowExecutionResponse(BaseModel):
    id: int
    execution_id: Optional[str] = None
    owner_id: int
    workflow_id: int
    workflow_snapshot: Dict[str, Any]
    status: ExecutionStatus
    trigger: Optional[str] = "manual"
    parameters: Optional[Dict[str, Any]] = {}
    runtime_variables: Optional[Dict[str, Any]] = {}
    step_statuses: Optional[Dict[str, Any]] = {}
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    logs: Optional[List[Dict[str, Any]]] = []
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowStepExecutionResponse(BaseModel):
    id: int
    execution_id: int
    step_id: str
    step_snapshot: Dict[str, Any]
    status: StepStatus
    output: Optional[str] = None
    data: Optional[Dict[str, Any]] = {}
    error_message: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
