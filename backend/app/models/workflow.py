from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="🔄")
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    
    template_id = Column(String(100), nullable=True)
    is_template = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    
    steps = Column(JSON, default=list, nullable=False)
    connections = Column(JSON, default=list, nullable=True)
    config = Column(JSON, default=dict, nullable=True)
    variables = Column(JSON, default=dict, nullable=True)
    settings = Column(JSON, default=dict, nullable=True)
    tags = Column(JSON, default=list, nullable=True)
    
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.DRAFT, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="workflows")
    project = relationship("Project", back_populates="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String(100), unique=True, index=True, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False, index=True)
    workflow_snapshot = Column(JSON, nullable=False)
    
    status = Column(SQLEnum(ExecutionStatus), default=ExecutionStatus.PENDING, nullable=False)
    
    trigger = Column(String(50), default="manual")
    parameters = Column(JSON, default=dict, nullable=True)
    runtime_variables = Column(JSON, default=dict, nullable=True)
    step_statuses = Column(JSON, default=dict, nullable=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    logs = Column(JSON, default=list, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workflow = relationship("Workflow", back_populates="executions")
    step_executions = relationship("WorkflowStepExecution", back_populates="execution", cascade="all, delete-orphan")


class WorkflowStepExecution(Base):
    __tablename__ = "workflow_step_executions"

    id = Column(Integer, primary_key=True, index=True)
    
    execution_id = Column(Integer, ForeignKey("workflow_executions.id"), nullable=False, index=True)
    step_id = Column(String(100), nullable=False, index=True)
    step_snapshot = Column(JSON, nullable=False)
    
    status = Column(SQLEnum(StepStatus), default=StepStatus.PENDING, nullable=False)
    
    output = Column(Text, nullable=True)
    data = Column(JSON, default=dict, nullable=True)
    error_message = Column(Text, nullable=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    execution = relationship("WorkflowExecution", back_populates="step_executions")
