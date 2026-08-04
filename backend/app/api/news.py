import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

# Fontes RSS sobre mercado de trabalho. Podem ser substituídas/adicionadas
# pela variável de ambiente NEWS_FEEDS (formato: nome,url;nome2,url2).
DEFAULT_FEEDS: List[Dict[str, str]] = [
    {"name": "Agência Brasil", "url": "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"},
    {"name": "Exame", "url": "https://exame.com/feed/"},
    {"name": "Gazeta do Povo - Economia", "url": "https://www.gazetadopovo.com.br/feed/rss/economia.xml"},
]

REQUEST_TIMEOUT = 10.0
MAX_ITEMS = 50


def _parse_source_feeds() -> List[Dict[str, str]]:
    """Lê a lista de feeds configuráveis por ambiente."""
    import os
    raw = os.environ.get("NEWS_FEEDS", "")
    if not raw.strip():
        return DEFAULT_FEEDS
    feeds: List[Dict[str, str]] = []
    for item in raw.split(";"):
        item = item.strip()
        if not item or "," not in item:
            continue
        name, url = item.split(",", 1)
        feeds.append({"name": name.strip(), "url": url.strip()})
    return feeds or DEFAULT_FEEDS


def _clean_html(text: str | None) -> str:
    """Remove tags HTML e encolhe espaços em branco."""
    if not text:
        return ""
    import re
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    from email.utils import parsedate_to_datetime
    try:
        dt: datetime = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return None


def _ns(tag: str, ns: Optional[str] = None) -> str:
    """Adiciona namespace padrão RSS/Atom a uma tag paciente (ex.: item/title)."""
    if ns:
        return f"{{{ns}}}{tag}"
    return tag


def _parse_feed_items(xml_text: str, source_name: str) -> List[Dict[str, Any]]:
    """Extrai itens de um XML RSS 2.0 ou Atom, de forma leniente."""
    items: List[Dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning(f"Falha ao parsear feed {source_name}: {exc}")
        return items

    def find_text(element: ET.Element, tag: str) -> Optional[str]:
        node = element.find(tag)
        if node is None or node.text is None:
            return None
        return node.text.strip()

    candidates = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in candidates:
        title = find_text(node, "title")
        if not title:
            title = find_text(node, "{http://www.w3.org/2005/Atom}title")
        link = find_text(node, "link")
        if link and "http" not in link:
            link = find_text(node, "{http://www.w3.org/2005/Atom}link")
        if link and "http" not in link:
            link = None

        description = (find_text(node, "description") or find_text(node, "summary")
                       or find_text(node, "{http://www.w3.org/2005/Atom}summary"))
        pub_date = (find_text(node, "pubDate") or find_text(node, "published")
                    or find_text(node, "{http://www.w3.org/2005/Atom}published"))

        items.append({
            "title": title or "",
            "link": link or "",
            "description": _clean_html(description),
            "published_at": _parse_date(pub_date),
            "source": source_name,
        })

    return items


async def _fetch_feed(client: httpx.AsyncClient, feed: Dict[str, str]) -> List[Dict[str, Any]]:
    try:
        resp = await client.get(feed["url"], timeout=REQUEST_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        # Garante UTF-8, respeitando o charset declarado no XML quando presente.
        encoding = resp.charset_encoding or resp.encoding or "utf-8"
        try:
            xml_text = resp.content.decode(encoding, errors="replace")
        except Exception:
            xml_text = resp.text
        return _parse_feed_items(xml_text, feed["name"])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Feed falhou {feed.get('name')}: {exc}")
        return []


@router.get("/news", summary="Agrega notícias sobre mercado de trabalho")
async def get_news(limit: int = MAX_ITEMS) -> Dict[str, Any]:
    feeds = _parse_source_feeds()
    all_items: List[Dict[str, Any]] = []
    timeout = httpx.Timeout(REQUEST_TIMEOUT)

    async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": "TimeTrackerNews/1.0"}) as client:
        results = await asyncio.gather(*[_fetch_feed(client, feed) for feed in feeds])
        for items in results:
            all_items.extend(items)

    # Ordena por data de publicação (mais recentes primeiro); itens sem data vão para o fim.
    def _sort_key(item: Dict[str, Any]) -> str:
        return item["published_at"] or ""

    all_items.sort(key=_sort_key, reverse=True)
    all_items = all_items[: max(1, min(limit, MAX_ITEMS))]

    return {"feeds": feeds, "count": len(all_items), "items": all_items}