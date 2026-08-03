from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.core.config import settings
from app.db.session import init_db
from app.api import auth, users, projects, tasks, time_entries, hr

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        from seed import seed as run_seed
        await run_seed()
        logger.info("Seed verificado no startup")
    except Exception as exc:
        logger.warning(f"Seed no startup ignorada: {exc}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])
app.include_router(time_entries.router, prefix=f"{settings.API_V1_STR}/time-entries", tags=["time-entries"])
app.include_router(hr.router, prefix=f"{settings.API_V1_STR}/hr", tags=["hr"])


@app.get("/")
async def root():
    return {"message": "TimeTracker API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}