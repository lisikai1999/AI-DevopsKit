from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class GenerationType(str, enum.Enum):
    JENKINSFILE = "jenkinsfile"
    DOCKERFILE = "dockerfile"
    BILLING = "billing"
    LOG = "log"
    CICD = "cicd"


class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    type = Column(SQLEnum(GenerationType), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    
    parameters = Column(JSON, default=dict, nullable=True)
    meta = Column(JSON, default=dict, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="generations")
