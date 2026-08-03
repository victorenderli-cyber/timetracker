from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.db.session import get_db
from app.core.deps import get_current_active_user, get_current_manager
from app.models import User as UserModel, UserRole
from app.schemas import User, UserUpdate, UserWithRelations


router = APIRouter()


@router.get("", response_model=List[User])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    query = select(UserModel)
    
    if role:
        query = query.where(UserModel.role == role)
    if is_active is not None:
        query = query.where(UserModel.is_active == is_active)
    if search:
        query = query.where(
            UserModel.full_name.ilike(f"%{search}%") | UserModel.email.ilike(f"%{search}%")
        )
    
    query = query.offset(skip).limit(limit).order_by(UserModel.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/me/stats")
async def get_my_stats(
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import TimeEntry, TimeEntryStatus
    from datetime import datetime, timedelta
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    today_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
        .where(TimeEntry.user_id == current_user.id)
        .where(TimeEntry.start_time >= today_start)
        .where(TimeEntry.status == TimeEntryStatus.COMPLETED)
    )
    today_seconds = today_result.scalar() or 0
    
    week_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
        .where(TimeEntry.user_id == current_user.id)
        .where(TimeEntry.start_time >= week_start)
        .where(TimeEntry.status == TimeEntryStatus.COMPLETED)
    )
    week_seconds = week_result.scalar() or 0
    
    month_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
        .where(TimeEntry.user_id == current_user.id)
        .where(TimeEntry.start_time >= month_start)
        .where(TimeEntry.status == TimeEntryStatus.COMPLETED)
    )
    month_seconds = month_result.scalar() or 0
    
    active_result = await db.execute(
        select(TimeEntry)
        .where(TimeEntry.user_id == current_user.id)
        .where(TimeEntry.status.in_([TimeEntryStatus.ACTIVE, TimeEntryStatus.PAUSED]))
        .order_by(TimeEntry.start_time.desc())
    )
    active_entry = active_result.scalar_one_or_none()
    
    return {
        "today_hours": round(today_seconds / 3600, 2),
        "week_hours": round(week_seconds / 3600, 2),
        "month_hours": round(month_seconds / 3600, 2),
        "active_entry": active_entry
    }


@router.get("/{user_id}", response_model=UserWithRelations)
async def get_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserModel)
        .options(selectinload(UserModel.subordinates))
        .where(UserModel.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    await db.commit()