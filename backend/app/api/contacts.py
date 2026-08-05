from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.db.session import get_db
from app.models import Lead as LeadModel, QuizResponse as QuizResponseModel
from app.schemas import LeadCreate, Lead, QuizResponseCreate, QuizResponse, ContactSummary


router = APIRouter()


@router.post("/leads", response_model=Lead, status_code=status.HTTP_201_CREATED, summary="Coleta de dados (opcional)")
async def create_lead(data: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Registra um cadastro/newsletter preenchido voluntariamente no portal."""
    lead = LeadModel(**data.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.post("/quiz", response_model=QuizResponse, status_code=status.HTTP_201_CREATED, summary="Resposta de quiz/pesquisa")
async def create_quiz(data: QuizResponseCreate, db: AsyncSession = Depends(get_db)):
    """Registra uma resposta da pesquisa opcional."""
    resp = QuizResponseModel(**data.model_dump())
    db.add(resp)
    await db.commit()
    await db.refresh(resp)
    return resp


@router.get("/contacts/summary", response_model=ContactSummary, summary="Resumo de dados coletados")
async def contacts_summary(db: AsyncSession = Depends(get_db)):
    leads = await db.execute(select(func.count(LeadModel.id)))
    quiz = await db.execute(select(func.count(QuizResponseModel.id)))
    return {"total_leads": leads.scalar() or 0, "total_quiz": quiz.scalar() or 0}
