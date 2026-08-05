import time
from typing import Dict, Tuple
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Rate limiter em memória (janela deslizante) por chave (ex.: IP).

    Suficiente para uma instância única no Render. Em um cluster com várias
    instâncias, trocar por Redis (já presente nas dependências).
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Tuple[int, float]] = {}

    def _purge(self, now: float) -> None:
        expired = [
            key for key, (_, ts) in self._hits.items()
            if now - ts >= self.window_seconds
        ]
        for key in expired:
            self._hits.pop(key, None)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        self._purge(now)
        count, _ = self._hits.get(key, (0, now))
        if count >= self.max_requests:
            return False
        self._hits[key] = (count + 1, now)
        return True


# Limites conservadores para formulários públicos de coleta de dados.
lead_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=3600)
quiz_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=3600)


def _client_key(request: Request) -> str:
    """Identifica o cliente pelo IP real (usa o header do proxy, se presente)."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(limiter: SlidingWindowRateLimiter):
    async def dependency(request: Request):
        if not limiter.allow(_client_key(request)):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Tente novamente mais tarde.",
            )
    return dependency
