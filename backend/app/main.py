from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
from app.core.config import settings
from app.db.session import init_db
from app.api import auth, users, projects, tasks, time_entries, hr, news, contacts

logger = logging.getLogger("uvicorn.error")

# Diretórios onde a interface (build do frontend) pode estar, em ordem de prioridade.
STATIC_CANDIDATES = [
    Path(os.environ.get("STATIC_DIR", "")).resolve() if os.environ.get("STATIC_DIR") else None,
    Path(__file__).resolve().parent.parent.parent / "static",  # <repo>/static
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
]
STATIC_DIR = next((p for p in STATIC_CANDIDATES if p and (p / "index.html").is_file()), None)


import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    # O Postgres free do Render "dorme" quando fica ocioso e leva ~1min para
    # acordar. Retentamos a inicialização para não derrubar o container.
    last_exc = None
    for attempt in range(1, 7):
        try:
            await init_db()
            last_exc = None
            break
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning(f"init_db tentativa {attempt} falhou: {exc}")
            await asyncio.sleep(10)
    if last_exc is not None:
        logger.warning(f"init_db não concluído após retries: {last_exc}")

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

# Compressão gzip para respostas grandes (JS/CSS/API).
app.add_middleware(GZipMiddleware, minimum_size=500)


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Headers de cache: assets com hash podem ficar imutáveis; HTML/API não."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith("/assets/") or path.startswith("/static/") or path.startswith("/icons/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path == "/" or path == "/index.html":
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "public, max-age=3600"
        return response


app.add_middleware(CacheControlMiddleware)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])
app.include_router(time_entries.router, prefix=f"{settings.API_V1_STR}/time-entries", tags=["time-entries"])
app.include_router(hr.router, prefix=f"{settings.API_V1_STR}/hr", tags=["hr"])
app.include_router(news.router, prefix=f"{settings.API_V1_STR}", tags=["news"])
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}", tags=["contacts"])


@app.get("/")
async def root():
    if STATIC_DIR:
        return FileResponse(STATIC_DIR / "index.html")
    return {"message": "TimeTracker API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "static": bool(STATIC_DIR)}


# Serve o build do frontend (SPA) se ele existir no container.
# Assim API + interface compartilham o mesmo domínio (sem CORS no deploy).
if STATIC_DIR:
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        from fastapi import HTTPException
        if full_path.startswith(settings.API_V1_STR):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")