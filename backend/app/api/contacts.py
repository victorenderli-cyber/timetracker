import csv
import io
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime
from app.db.session import get_db
from app.models import Lead as LeadModel, QuizResponse as QuizResponseModel, User as UserModel
from app.schemas import LeadCreate, Lead, QuizResponseCreate, QuizResponse, ContactSummary
from app.core.deps import require_role
from app.core.rate_limit import lead_limiter, quiz_limiter, enforce_rate_limit


router = APIRouter()

# Campo honeypot: preenchido apenas por bots. Mantemos aqui a lista de campos
# que um humano nunca preenche (escondidos via CSS no frontend).
_HONEYPOT_FIELDS = {"website", "company_website", "fax"}


def _is_spam(data: dict) -> bool:
    """Detecta bots via campos honeypot (preenchidos apenas por automação)."""
    return any(data.get(f) for f in _HONEYPOT_FIELDS)


_LEAD_COLUMNS = {c.name for c in LeadModel.__table__.columns}


@router.post(
    "/leads",
    response_model=Lead,
    status_code=status.HTTP_201_CREATED,
    summary="Coleta de dados (opcional)",
    dependencies=[Depends(enforce_rate_limit(lead_limiter))],
)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
):
    """Registra um cadastro/newsletter preenchido voluntariamente no portal.

    Sujeito a rate limiting por IP e a um honeypot anti-spam. O cadastro é
    opcional e nunca obrigatório para usar o portal.
    """
    payload = data.model_dump()

    if _is_spam(payload):
        # Responde 201 de mentira para não ensinar o bot — mas não grava nada.
        return Lead(**{k: v for k, v in payload.items() if k in _LEAD_COLUMNS}, id=0, created_at=datetime.utcnow())

    if payload.get("consent"):
        payload["consent"] = datetime.utcnow()

    lead = LeadModel(**{k: v for k, v in payload.items() if k in _LEAD_COLUMNS})
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.post(
    "/quiz",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Resposta de quiz/pesquisa",
    dependencies=[Depends(enforce_rate_limit(quiz_limiter))],
)
async def create_quiz(
    data: QuizResponseCreate,
    db: AsyncSession = Depends(get_db),
):
    """Registra uma resposta da pesquisa opcional. Sujeito a rate limiting."""
    resp = QuizResponseModel(**data.model_dump())
    db.add(resp)
    await db.commit()
    await db.refresh(resp)
    return resp


@router.get(
    "/contacts/summary",
    response_model=ContactSummary,
    summary="Resumo de dados coletados (somente admin)",
)
async def contacts_summary(
    db: AsyncSession = Depends(get_db),
    _: UserModel = Depends(require_role("admin", "manager")),
):
    """Resumo agregado de dados coletados. Acesso restrito a admin/manager."""
    leads = await db.execute(select(func.count(LeadModel.id)))
    quiz = await db.execute(select(func.count(QuizResponseModel.id)))
    return {"total_leads": leads.scalar() or 0, "total_quiz": quiz.scalar() or 0}


@router.get(
    "/contacts/leads",
    response_model=List[Lead],
    summary="Lista de leads (somente admin)",
)
async def list_leads(
    db: AsyncSession = Depends(get_db),
    _: UserModel = Depends(require_role("admin", "manager")),
):
    """Lista os cadastros coletados no portal, mais recentes primeiro."""
    result = await db.execute(select(LeadModel).order_by(desc(LeadModel.created_at)).limit(500))
    return result.scalars().all()


@router.get(
    "/contacts/quiz",
    response_model=List[QuizResponse],
    summary="Lista de respostas de quiz (somente admin)",
)
async def list_quiz(
    db: AsyncSession = Depends(get_db),
    _: UserModel = Depends(require_role("admin", "manager")),
):
    """Lista as respostas da pesquisa, mais recentes primeiro."""
    result = await db.execute(select(QuizResponseModel).order_by(desc(QuizResponseModel.created_at)).limit(500))
    return result.scalars().all()


@router.get(
    "/contacts/export.csv",
    summary="Exporta leads em CSV (somente admin)",
    response_class=Response,
)
async def export_leads_csv(
    db: AsyncSession = Depends(get_db),
    _: UserModel = Depends(require_role("admin", "manager")),
):
    """Exporta os leads para CSV (compatível com planilhas) — utilitário LGPD."""
    result = await db.execute(select(LeadModel).order_by(desc(LeadModel.created_at)))
    rows = result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "email", "nome", "cargo", "area", "cidade", "origem", "newsletter", "consentimento", "criado_em"])
    for row in rows:
        writer.writerow([
            row.id,
            row.email or "",
            row.full_name or "",
            row.role or "",
            row.area or "",
            row.city or "",
            row.source or "",
            "sim" if row.newsletter_optin else "nao",
            row.consent.strftime("%Y-%m-%d %H:%M") if row.consent else "",
            row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else "",
        ])

    now = datetime.utcnow().strftime("%Y%m%d-%H%M")
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="leads-{now}.csv"'},
    )
