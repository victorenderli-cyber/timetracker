"""Testes de API do TimeTracker / portal.

Usam um banco SQLite temporário, separado do banco de desenvolvimento.
"""

import asyncio
import os
import sys
import tempfile

import pytest

# Garante que o app é importável a partir do diretório do backend.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Banco de teste: SQLite em arquivo temporário (evita poluir timetracker.db).
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp.name}"
_tmp.close()

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.db.session import init_db, async_session_maker  # noqa: E402
from app.models import NewsArticle  # noqa: E402
from sqlalchemy import select  # noqa: E402
from datetime import datetime, timezone  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    asyncio.run(init_db())

    async def _seed_news():
        # Dados fake para o endpoint /news não depender de rede no CI.
        async with async_session_maker() as session:
            existing = await session.execute(select(NewsArticle.id).limit(1))
            if existing.scalar_one_or_none() is None:
                session.add_all([
                    NewsArticle(
                        title="Empresa abre vagas de estágio",
                        link="https://exemplo.com/noticia-1",
                        description="Processo seletivo aberto para estudantes.",
                        source="Exame",
                        category="Vagas",
                        published_at=datetime.now(timezone.utc),
                    ),
                    NewsArticle(
                        title="Salário mínimo e mercado de trabalho",
                        link="https://exemplo.com/noticia-2",
                        description="Análise do piso salarial no país.",
                        source="Agência Brasil",
                        category="Salários",
                        published_at=datetime.now(timezone.utc),
                    ),
                ])
                await session.commit()

    from seed import seed

    asyncio.run(seed())
    asyncio.run(_seed_news())
    yield


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_headers(client):
    resp = client.post("/api/v1/auth/demo")
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
