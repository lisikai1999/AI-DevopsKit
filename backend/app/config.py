from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "AI-DevOpsKit API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    DATABASE_URL: str = "sqlite:///./ai_devops.db"
    
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_API_BASE_URL: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
