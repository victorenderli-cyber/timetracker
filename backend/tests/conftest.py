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
from app.db.session import init_db  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    asyncio.run(init_db())
    from seed import seed

    asyncio.run(seed())
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
