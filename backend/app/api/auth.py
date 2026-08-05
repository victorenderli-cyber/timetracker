from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from app.db.session import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_active_user
from app.models import User as UserModel
from app.schemas import Token, UserCreate, User


router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = UserModel(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        hashed_password=hashed_password,
        **{
            k: v for k, v in user_data.model_dump(exclude_unset=True).items()
            if k in ("cpf", "department", "position", "hire_date", "work_hours_per_day", "hourly_rate", "manager_id")
        }
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserModel).where(UserModel.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=timedelta(minutes=7*24*60)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.post("/demo", response_model=Token, summary="Acesso demo sem senha")
async def demo_login(db: AsyncSession = Depends(get_db)):
    """Emite um token do usuário admin sem exigir senha (para o app abrir direto).

    Pode ser desligado via env ENABLE_DEMO_LOGIN=false.
    """
    if not settings.ENABLE_DEMO_LOGIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo login disabled")
    result = await db.execute(
        select(UserModel).where(UserModel.email == "admin@timetracker.com")
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        result = await db.execute(
            select(UserModel).where(UserModel.role == "admin").limit(1)
        )
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No admin user available")

    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=timedelta(minutes=7 * 24 * 60)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.put("/me", response_model=User)
async def update_me(
    user_update: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.email != current_user.email:
        result = await db.execute(select(User).where(User.email == user_update.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = user_update.email
    
    current_user.full_name = user_update.full_name
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user