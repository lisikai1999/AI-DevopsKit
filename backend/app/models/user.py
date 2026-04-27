from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    READONLY = "readonly"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    knowledge_articles = relationship("KnowledgeArticle", back_populates="author", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="owner", cascade="all, delete-orphan")
    
    def has_permission(self, required_role: UserRole) -> bool:
        role_hierarchy = {
            UserRole.READONLY: 0,
            UserRole.USER: 1,
            UserRole.ADMIN: 2,
        }
        return role_hierarchy.get(self.role, 0) >= role_hierarchy.get(required_role, 0)
    
    def can_write(self) -> bool:
        return self.role in [UserRole.USER, UserRole.ADMIN]
    
    def can_admin(self) -> bool:
        return self.role == UserRole.ADMIN
