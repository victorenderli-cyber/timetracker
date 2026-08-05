import asyncio
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models import NewsArticle

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

# Fontes RSS sobre mercado de trabalho. Podem ser substituídas/adicionadas
# pela variável de ambiente NEWS_FEEDS (formato: nome,url;nome2,url2).
DEFAULT_FEEDS: List[Dict[str, str]] = [
    {"name": "Agência Brasil", "url": "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"},
    {"name": "Exame - Carreira", "url": "https://exame.com/feed/?post_type=post&s=carreira"},
    {"name": "Exame - Carreiras", "url": "https://exame.com/feed/?post_type=post&s=carreiras"},
    {"name": "Exame - Vagas", "url": "https://exame.com/feed/?post_type=post&s=vagas"},
    {"name": "Gazeta do Povo - Economia", "url": "https://www.gazetadopovo.com.br/feed/rss/economia.xml"},
    {"name": "G1 - Concursos e Emprego", "url": "https://g1.globo.com/rss/g1/concursos-e-emprego/"},
    {"name": "G1 - Trabalho e Carreira", "url": "https://g1.globo.com/rss/g1/trabalho-e-carreira/"},
]

REQUEST_TIMEOUT = 10.0
MAX_ITEMS = 100
MAX_ITEMS_PER_FEED = 40

# Estado do último sync (preenchido pelo serviço em background; também serve
# de fallback sob demanda quando o loop está desligado).
_last_sync_at: Optional[datetime] = None
_last_sync_error: Optional[str] = None
_sync_lock = asyncio.Lock()


def _mark_synced(now: Optional[datetime] = None):
    global _last_sync_at, _last_sync_error
    _last_sync_at = now or datetime.now(timezone.utc)
    _last_sync_error = None


def _mark_sync_error(exc: Exception):
    global _last_sync_error
    _last_sync_error = str(exc)

# Agrupa variações de nome de feed na mesma "fonte" para o round-robin.
SOURCE_GROUP: Dict[str, str] = {
    "Exame - Carreira": "Exame",
    "Exame - Carreiras": "Exame",
    "Exame - Vagas": "Exame",
    "G1 - Concursos e Emprego": "G1",
    "G1 - Trabalho e Carreira": "G1",
}

# Palavras-chave do tema "mercado de trabalho". Uma matéria é mantida se o
# título ou resumo contiver ao menos uma delas (normalizada em minúsculas).
WORK_TOPICS = [
    "emprego", "trabalho", "empregos", "carreira", "vagas", "salário", "salarios",
    "demissão", "demissoes", "demitir", "contratação", "contratacao", "recrutamento",
    "rh", "empresa", "empresas", "funcionário", "funcionario", "funcionários",
    "empresário", "empresario", "profissional", "profissionais", "mercado de trabalho",
    "recolocação", "recolocacao", "desemprego", "piso salarial", "carteira assinada",
    "clt", "pj", "teletrabalho", "home office", "trabalho remoto", "estágio", "estagio",
    "estagiário", "estagiario", "jovem aprendiz", "empregabilidade", "carreiras",
    "promoção", "promocao", "liderança", "lideranca", "competência", "competencia",
    "habilidades", "curriculo", "currículo", "entrevista", "treinamento",
    "salarial", "remunera", "cargo", "cargos", "colaborador", "colaboradores",
]


def _is_relevant(item: Dict[str, Any]) -> bool:
    """Retorna True se a notícia trata do tema mercado de trabalho."""
    raw = f"{item.get('title') or ''} {item.get('description') or ''}".lower()
    if not any(tk in raw for tk in WORK_TOPICS):
        return False
    # Exclui temas com forte confusão de vocabulário (esporte/entretenimento),
    # mesmo quando contêm uma palavra da lista (ex.: "contratação" no futebol).
    off_topic = [
        # Esporte / entretenimento
        "futebol", "brasileirão", "champions", "atlético", "corinthians", "flamengo",
        "palmeiras", "gol", "gols", "partida", "rodada",
        "streaming", "assistir", "série", "temporada", "episódio", "episodio",
        "filme", "filmes", "lançamento", "lançamentos", "ingressos", "show",
        "show d", "fifa", "copinha", "rock in rio", "bosshardt", "puyol", "barcelona",
        "ex-capitão", "ex-capitão do barcelona",
        # Política / justiça / segurança
        "magistrado", "magistrada", "desembargador", "senador", "senadora", "deputado",
        "eleitoral", "atentado", "atentados", "polícia", "policial", "suspeit",
        "criminoso", "gilmar", "wewerton", "fachin", "stf", "mpf",
        # Migração / imigração (geralmente não é emprego local)
        "imigrante", "imigração", "imigra", "imigrante", "refugiado",
        # Saúde / apostas
        "saúde mental", "sus ", "teleatendimento", "vício", "bets", "aposta",
        # Clima / ventania / eventos gerais fora do tema
        "ventania", "vento forte", "tempestade", "chuva forte", "pronatec",
        # Finanças pessoais / investimento
        "ações da", "ambev", "poupança",
        # Diplomacia / política externa
        "putin", "lula conversa", "geopolítica", "geopolitica",
    ]
    return not any(tk in raw for tk in off_topic)


# Categorias exibidas no portal. A primeira palavra da lista que aparecer no
# título/resumo define a categoria; senão, usa a default.
CATEGORIES: List[Dict[str, List[str]]] = [
    {"name": "Concursos", "keywords": [
        "concurso", "concursos", "edital", "prova", "seletivo", "inscrições", "inscricoes",
        "resultado do concurso", "caderno de provas",
    ]},
    {"name": "Vagas", "keywords": [
        "vagas", "vaga", "emprego", "empregos", "oportunidade", "oportunidades",
        "processo seletivo", "seleção", "selecao", "recolocação", "recolocacao",
        "primeiro emprego", "trainee", "estágio", "estagio", "estagiário", "estagiario",
        "jovem aprendiz", "admissão", "admissao",
    ]},
    {"name": "Salários", "keywords": [
        "salário", "salarios", "salarial", "remuneração", "remuneracao", "piso",
        "aumento salarial", "reajuste", "piso salarial", "benefícios", "beneficios",
        "vale-refeição", "13º", "folha de pagamento",
    ]},
    {"name": "Carreira", "keywords": [
        "carreira", "carreiras", "profissional", "profissionais", "liderança", "lideranca",
        "competência", "competencia", "habilidade", "habilidades", "currículo", "curriculo",
        "entrevista", "promoção", "promocao", "desenvolvimento", "capacitação", "capacitacao",
        "treinamento", "mentoria", "empreendedorismo", "trabalho remoto", "home office",
        "teletrabalho", "flexível", "flexivel", "produtividade",
    ]},
    {"name": "Economia", "keywords": [
        "economia", "crescimento", "pib", "inflação", "inflacao", "juros", "mercado",
        "empresa", "empresas", "indústria", "industria", "setor", "cnpj", "receita federal",
        "investimento", "produção", "producao", "negócios", "negocios", "finanças",
    ]},
]
DEFAULT_CATEGORY = "Trabalho"


def _category(item: Dict[str, Any]) -> str:
    raw = f"{item.get('title') or ''} {item.get('description') or ''}".lower()
    for cat in CATEGORIES:
        if any(kw in raw for kw in cat["keywords"]):
            return cat["name"]
    return DEFAULT_CATEGORY


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


def _extract_image(node: ET.Element, description: str) -> Optional[str]:
    """Tenta obter uma URL de imagem do item RSS (diversos formatos)."""
    import re

    # Tag própria da Agência Brasil: <imagem-destaque>URL</imagem-destaque>
    featured = node.find("imagem-destaque")
    if featured is not None and featured.text and featured.text.strip():
        return featured.text.strip()

    # enclosure com url em atributo: <enclosure url="..." />
    enc = node.find("enclosure")
    if enc is not None and enc.get("url"):
        return enc.get("url")
    # enclosure com url em elemento filho: <enclosure><url>...</url></enclosure>
    if enc is not None:
        url_nested = enc.find("url") or enc.find("URL")
        if url_nested is not None and url_nested.text:
            return url_nested.text.strip()

    mrss = "{http://search.yahoo.com/mrss/}"
    # media:content url="..."
    mc = node.find(f".//{mrss}content") or node.find("mediaurl")
    if mc is not None:
        url = mc.get("url")
        if url:
            return url
        if mc.text and mc.text.strip():
            return mc.text.strip()

    # media:thumbnail url="..."
    mt = node.find(f".//{mrss}thumbnail")
    if mt is not None and mt.get("url"):
        return mt.get("url")

    # primeira <img> dentro do description (ignora logos .svg)
    if description:
        m = re.search(r'<img[^>]+src="([^"]+\.(?:jpe?g|png|webp))"', description)
        if m:
            return m.group(1)

    return None


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
        image = _extract_image(node, description)

        items.append({
            "title": title or "",
            "link": link or "",
            "description": _clean_html(description),
            "published_at": _parse_date(pub_date),
            "source": source_name,
            "image": image,
            "category": DEFAULT_CATEGORY,
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


async def collect_items() -> List[Dict[str, Any]]:
    """Busca todos os feeds, filtra, deduplica e classifica. Usado pelo serviço
    de sincronização em background e como fallback sob demanda."""
    feeds = _parse_source_feeds()
    all_items: List[Dict[str, Any]] = []
    timeout = httpx.Timeout(REQUEST_TIMEOUT)

    async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": "TimeTrackerNews/1.0"}) as client:
        results = await asyncio.gather(*[_fetch_feed(client, feed) for feed in feeds])
        for items in results:
            all_items.extend(items)

    # Mantém apenas notícias relevantes ao tema mercado de trabalho.
    all_items = [item for item in all_items if _is_relevant(item)]

    # Deduplica por URL (e, como fallback, por título normalizado), mantendo o
    # item mais antigo/recente — feeds variantes podem trazer a mesma matéria.
    seen_url: set = set()
    seen_title: set = set()
    deduped: List[Dict[str, Any]] = []
    for item in all_items:
        url_key = (item.get("link") or "").strip().rstrip("/")
        title_key = re.sub(r"[^a-z0-9]+", "", (item.get("title") or "").lower())
        if url_key and url_key in seen_url:
            continue
        if len(title_key) > 30 and title_key in seen_title:
            continue
        if url_key:
            seen_url.add(url_key)
        if title_key:
            seen_title.add(title_key)
        deduped.append(item)
    all_items = deduped

    # Atribui categoria por palavras-chave (para filtro no portal).
    for item in all_items:
        item["category"] = _category(item)

    # Ordena por data de publicação (mais recentes primeiro); itens sem data vão para o fim.
    all_items.sort(key=lambda item: item["published_at"] or "", reverse=True)
    return all_items


def _to_dict(article: NewsArticle) -> Dict[str, Any]:
    return {
        "id": article.id,
        "title": article.title,
        "link": article.link,
        "description": article.description,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "source": article.source,
        "image": article.image,
        "category": article.category,
    }


def _apply_diversification(items: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    """Intercala (round-robin) as fontes para o topo mostrar variedade, e limita
    a quantidade por fonte para nenhuma dominar a lista."""
    by_source: Dict[str, List[Dict[str, Any]]] = {}
    for item in items:
        src = SOURCE_GROUP.get(item.get("source", "?"), item.get("source", "?"))
        by_source.setdefault(src, []).append(item)
    sources = list(by_source.keys())
    cap = max(1, min(limit, MAX_ITEMS))
    max_per_source = max(1, int(round(cap / max(1, len(sources)))))

    diversified: List[Dict[str, Any]] = []
    counts: Dict[str, int] = {}
    idx = 0
    while len(diversified) < cap:
        took = 0
        for src in sources:
            bucket = by_source.get(src, [])
            if counts.get(src, 0) >= max_per_source:
                continue
            if idx < len(bucket):
                diversified.append(bucket[idx])
                counts[src] = counts.get(src, 0) + 1
                took += 1
                if len(diversified) >= cap:
                    break
        if took == 0:
            break
        idx += 1
    return diversified


async def refresh_news_feed(db: AsyncSession) -> int:
    """Sincroniza o banco com os feeds RSS. Retorna o nº de notícias armazenadas.

    Usada pelo serviço de background e pelo fallback sob demanda. Evita corridas
    com um lock em memória (única instância).
    """
    global _last_sync_at, _last_sync_error
    if _sync_lock.locked():
        return -1  # outro refresh em andamento
    async with _sync_lock:
        try:
            items = await collect_items()
            cutoff = datetime.now(timezone.utc) - timedelta(days=settings.NEWS_RETENTION_DAYS)
            stored = 0
            for item in items:
                published = _parse_datetime(item.get("published_at"))
                # Não reinsere notícias fora da janela de retenção (a purga as
                # removeria logo em seguida; evita re-trabalho a cada ciclo).
                if published is not None and published < cutoff:
                    continue
                existing = await db.execute(
                    select(NewsArticle.id).where(NewsArticle.link == item["link"])
                )
                if existing.scalar_one_or_none() is not None:
                    continue
                db.add(NewsArticle(
                    title=item.get("title") or "",
                    link=item.get("link") or "",
                    description=item.get("description"),
                    source=item.get("source") or "?",
                    category=item.get("category") or DEFAULT_CATEGORY,
                    image=item.get("image"),
                    published_at=published,
                ))
                stored += 1
            await db.commit()
            await _purge_old(db)
            _last_sync_at = datetime.now(timezone.utc)
            _last_sync_error = None
            return stored
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Falha na sincronização de notícias: {exc}")
            _last_sync_error = str(exc)
            await db.rollback()
            return -1


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Converte ISO string (produzida por _parse_date) em datetime UTC."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


async def _purge_old(db: AsyncSession):
    """Remove notícias publicadas fora da janela de retenção."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.NEWS_RETENTION_DAYS)
    result = await db.execute(
        select(NewsArticle.id).where(
            (NewsArticle.published_at.is_(None)) | (NewsArticle.published_at < cutoff)
        )
    )
    ids = [row[0] for row in result]
    for article_id in ids:
        article = await db.get(NewsArticle, article_id)
        if article:
            await db.delete(article)
    await db.commit()


@router.get("/news", summary="Agrega notícias sobre mercado de trabalho")
async def get_news(limit: int = MAX_ITEMS, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    feeds = _parse_source_feeds()

    # Lê do banco (populado pelo serviço em background). Se ainda estiver vazio
    # (primeiro boot / loop desligado), faz um refresh sob demanda para nunca
    # devolver a página sem notícias.
    result = await db.execute(
        select(NewsArticle).order_by(NewsArticle.published_at.desc().nulls_last(), NewsArticle.id.desc())
    )
    articles = list(result.scalars().all())

    if not articles:
        await refresh_news_feed(db)
        result = await db.execute(
            select(NewsArticle).order_by(NewsArticle.published_at.desc().nulls_last(), NewsArticle.id.desc())
        )
        articles = list(result.scalars().all())

    items = [_to_dict(a) for a in articles]
    diversified = _apply_diversification(items, limit)

    return {
        "feeds": feeds,
        "count": len(diversified),
        "items": diversified,
        "stored": len(items),
        "last_sync": _last_sync_at.isoformat() if _last_sync_at else None,
        "last_error": _last_sync_error,
        "sync_interval_seconds": settings.NEWS_SYNC_INTERVAL_SECONDS,
        "sync_enabled": settings.NEWS_SYNC_ENABLED,
    }


@router.get("/news/status", summary="Estado da sincronização automática de notícias")
async def news_status(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    result = await db.execute(
        select(NewsArticle.id).order_by(NewsArticle.published_at.desc().nulls_last())
    )
    stored = len(list(result.scalars().all()))
    return {
        "enabled": settings.NEWS_SYNC_ENABLED,
        "interval_seconds": settings.NEWS_SYNC_INTERVAL_SECONDS,
        "retention_days": settings.NEWS_RETENTION_DAYS,
        "stored": stored,
        "last_sync": _last_sync_at.isoformat() if _last_sync_at else None,
        "last_error": _last_sync_error,
    }