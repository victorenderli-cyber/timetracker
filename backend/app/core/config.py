from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "TimeTracker"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./timetracker.db")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()