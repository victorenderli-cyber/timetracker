"""Serviço de atualização automática de notícias.

Roda no lifespan da aplicação e mantém o banco (tabela news_articles) sempre
atualizado, independente do tráfego: a cada NEWS_SYNC_INTERVAL_SECONDS busca os
feeds RSS configurados, deduplica e grava os novos artigos. Assim o portal nunca
precisa "esperar" o fetch na primeira requisição e os dados sobrevivem a
reinícios (persistidos no banco, não só em memória).

Pode ser desligado via NEWS_SYNC_ENABLED=false (o endpoint /news ainda faz um
refresh sob demanda como fallback).
"""

import asyncio
import logging

from app.core.config import settings
from app.db.session import async_session_maker
from app.api.news import refresh_news_feed

logger = logging.getLogger("uvicorn.error")

_loop_task: "asyncio.Task | None" = None
_stop_event = asyncio.Event()


async def _run():
    logger.info(
        "Sincronização de notícias iniciada (intervalo=%ss, retenção=%sd)",
        settings.NEWS_SYNC_INTERVAL_SECONDS,
        settings.NEWS_RETENTION_DAYS,
    )
    # Primeira sincronização logo ao subir, antes do primeiro ciclo.
    await _sync_once()
    while True:
        try:
            await asyncio.wait_for(_stop_event.wait(), timeout=settings.NEWS_SYNC_INTERVAL_SECONDS)
            break  # stop solicitado
        except asyncio.TimeoutError:
            await _sync_once()


async def _sync_once():
    try:
        async with async_session_maker() as db:
            stored = await refresh_news_feed(db)
            logger.info("Notícias sincronizadas: %s", "sem alterações (em curso)" if stored == -1 else f"{stored} novas")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Erro no ciclo de sincronização de notícias: {exc}")


async def start():
    """Inicia o loop em background. Chamado no lifespan do app."""
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return  # já está rodando
    if not settings.NEWS_SYNC_ENABLED:
        logger.info("Sincronização automática de notícias desligada (NEWS_SYNC_ENABLED=false)")
        return
    _stop_event.clear()
    _loop_task = asyncio.create_task(_run(), name="news-sync")


async def stop():
    """Encerra o loop. Chamado no shutdown do app."""
    global _loop_task
    if _loop_task is None:
        return
    _stop_event.set()
    _loop_task.cancel()
    try:
        await _loop_task
    except (asyncio.CancelledError, Exception):  # noqa: BLE001
        pass
    _loop_task = None
