from pydantic_settings import BaseSettings
from typing import Optional
import os


def _normalize_database_url(url: str) -> str:
    # Render injeta "postgresql://..."; o SQLAlchemy assíncrono exige o driver asyncpg.
    url = (url or "").strip()
    if not url:
        return "sqlite+aiosqlite:///./timetracker.db"
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    PROJECT_NAME: str = "TimeTracker"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./timetracker.db")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Habilita/desabilita o acesso demo (auto-login sem senha) do portal/app.
    ENABLE_DEMO_LOGIN: bool = os.getenv("ENABLE_DEMO_LOGIN", "true").lower() in ("1", "true", "yes")

    # Sincronização automática de notícias em background. Intervalo em segundos;
    # 0 desliga o loop (cai para o fallback sob demanda).
    NEWS_SYNC_ENABLED: bool = os.getenv("NEWS_SYNC_ENABLED", "true").lower() in ("1", "true", "yes")
    NEWS_SYNC_INTERVAL_SECONDS: int = int(os.getenv("NEWS_SYNC_INTERVAL_SECONDS", "600"))
    # Mantém no banco apenas notícias publicadas dentro desta janela.
    NEWS_RETENTION_DAYS: int = int(os.getenv("NEWS_RETENTION_DAYS", "7"))

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "https://localhost", "capacitor://localhost", "http://localhost"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.DATABASE_URL = _normalize_database_url(self.DATABASE_URL)

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()