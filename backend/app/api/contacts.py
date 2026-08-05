from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.db.session import get_db
from app.models import Lead as LeadModel, QuizResponse as QuizResponseModel, User as UserModel
from app.schemas import LeadCreate, Lead, QuizResponseCreate, QuizResponse, ContactSummary
from app.core.deps import get_current_active_user
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
    _: UserModel = Depends(get_current_active_user),
):
    """Resumo agregado de dados coletados. Acesso restrito a usuário autenticado."""
    leads = await db.execute(select(func.count(LeadModel.id)))
    quiz = await db.execute(select(func.count(QuizResponseModel.id)))
    return {"total_leads": leads.scalar() or 0, "total_quiz": quiz.scalar() or 0}
