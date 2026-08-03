from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models import User, Project, Task, TimeEntry as TimeEntryModel, TimeEntryStatus, ProjectMember
from app.schemas import TimeEntry, TimeEntryCreate, TimeEntryUpdate, TimeEntryStart, TimeEntryStop, TimeEntryWithRelations, DashboardStats, ReportFilters, TimeReport


router = APIRouter()


async def check_project_access(db: AsyncSession, project_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=List[TimeEntryWithRelations])
async def list_time_entries(
    project_id: Optional[int] = None,
    task_id: Optional[int] = None,
    status: Optional[TimeEntryStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(TimeEntryModel).options(
        selectinload(TimeEntryModel.user),
        selectinload(TimeEntryModel.project),
        selectinload(TimeEntryModel.task)
    )
    
    if current_user.role == "employee":
        query = query.where(TimeEntryModel.user_id == current_user.id)
    else:
        if project_id:
            query = query.where(TimeEntryModel.project_id == project_id)
    
    if task_id:
        query = query.where(TimeEntryModel.task_id == task_id)
    if status:
        query = query.where(TimeEntryModel.status == status)
    if start_date:
        query = query.where(TimeEntryModel.start_time >= start_date)
    if end_date:
        query = query.where(TimeEntryModel.start_time <= end_date)
    
    query = query.offset(skip).limit(limit).order_by(TimeEntryModel.start_time.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TimeEntryWithRelations, status_code=status.HTTP_201_CREATED)
async def create_manual_entry(
    entry_data: TimeEntryStart,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if entry_data.project_id:
        project_result = await db.execute(select(Project).where(Project.id == entry_data.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if current_user.role == "employee":
            has_access = await check_project_access(db, entry_data.project_id, current_user.id)
            if not has_access:
                raise HTTPException(status_code=403, detail="Not a member of this project")

    entry = TimeEntryModel(
        user_id=current_user.id,
        start_time=datetime.utcnow(),
        status=TimeEntryStatus.ACTIVE,
        **entry_data.model_dump()
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.post("/start", response_model=TimeEntryWithRelations, status_code=status.HTTP_201_CREATED)
async def start_time_entry(
    entry_data: TimeEntryStart,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    active_result = await db.execute(
        select(TimeEntryModel).where(
            TimeEntryModel.user_id == current_user.id,
            TimeEntryModel.status.in_([TimeEntryStatus.ACTIVE, TimeEntryStatus.PAUSED])
        )
    )
    active_entry = active_result.scalar_one_or_none()
    if active_entry:
        raise HTTPException(status_code=400, detail="You already have an active time entry")
    
    if entry_data.project_id:
        project_result = await db.execute(select(Project).where(Project.id == entry_data.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        has_access = await check_project_access(db, entry_data.project_id, current_user.id)
        if not has_access and current_user.role == "employee":
            raise HTTPException(status_code=403, detail="Not a member of this project")
    
    if entry_data.task_id:
        task_result = await db.execute(select(Task).where(Task.id == entry_data.task_id))
        task = task_result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        has_access = await check_project_access(db, task.project_id, current_user.id)
        if not has_access and current_user.role == "employee":
            raise HTTPException(status_code=403, detail="Not a member of this project's project")
    
    entry = TimeEntryModel(
        user_id=current_user.id,
        start_time=datetime.utcnow(),
        status=TimeEntryStatus.ACTIVE,
        **entry_data.model_dump()
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.post("/{entry_id}/stop", response_model=TimeEntryWithRelations)
async def stop_time_entry(
    entry_id: int,
    stop_data: TimeEntryStop,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TimeEntryModel).where(TimeEntryModel.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if entry.user_id != current_user.id and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized to stop this entry")
    
    if entry.status not in [TimeEntryStatus.ACTIVE, TimeEntryStatus.PAUSED]:
        raise HTTPException(status_code=400, detail="Time entry is not active")
    
    end_time = datetime.utcnow()
    entry.end_time = end_time
    entry.duration_seconds = int((end_time - entry.start_time).total_seconds())
    entry.status = TimeEntryStatus.COMPLETED
    
    if stop_data.description:
        entry.description = stop_data.description
    
    await db.commit()
    await db.refresh(entry)
    
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.post("/{entry_id}/pause", response_model=TimeEntryWithRelations)
async def pause_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TimeEntryModel).where(TimeEntryModel.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if entry.user_id != current_user.id and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if entry.status != TimeEntryStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only pause active entries")
    
    now = datetime.utcnow()
    entry.duration_seconds += int((now - entry.start_time).total_seconds())
    entry.start_time = now
    entry.status = TimeEntryStatus.PAUSED
    
    await db.commit()
    await db.refresh(entry)
    
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.post("/{entry_id}/resume", response_model=TimeEntryWithRelations)
async def resume_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TimeEntryModel).where(TimeEntryModel.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if entry.user_id != current_user.id and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if entry.status != TimeEntryStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Can only resume paused entries")
    
    entry.start_time = datetime.utcnow()
    entry.status = TimeEntryStatus.ACTIVE
    
    await db.commit()
    await db.refresh(entry)
    
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.get("/active/current", response_model=TimeEntryWithRelations)
async def get_current_active_entry(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.status.in_([TimeEntryStatus.ACTIVE, TimeEntryStatus.PAUSED]))
        .order_by(TimeEntryModel.start_time.desc())
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="No active time entry")
    return entry


@router.put("/{entry_id}", response_model=TimeEntryWithRelations)
async def update_time_entry(
    entry_id: int,
    entry_update: TimeEntryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TimeEntryModel).where(TimeEntryModel.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if entry.user_id != current_user.id and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if entry.status == TimeEntryStatus.COMPLETED and current_user.role == "employee":
        raise HTTPException(status_code=400, detail="Cannot edit completed entries")
    
    update_data = entry_update.model_dump(exclude_unset=True)
    
    if "end_time" in update_data and entry.start_time and update_data["end_time"]:
        if update_data["end_time"] < entry.start_time:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        entry.duration_seconds = int((update_data["end_time"] - entry.start_time).total_seconds())
    
    for field, value in update_data.items():
        if field != "end_time":
            setattr(entry, field, value)
    
    await db.commit()
    await db.refresh(entry)
    
    result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TimeEntryModel).where(TimeEntryModel.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if entry.user_id != current_user.id and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.delete(entry)
    await db.commit()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    today_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntryModel.duration_seconds), 0))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.start_time >= today_start)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
    )
    today_hours = round((today_result.scalar() or 0) / 3600, 2)
    
    week_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntryModel.duration_seconds), 0))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.start_time >= week_start)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
    )
    week_hours = round((week_result.scalar() or 0) / 3600, 2)
    
    month_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntryModel.duration_seconds), 0))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.start_time >= month_start)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
    )
    month_hours = round((month_result.scalar() or 0) / 3600, 2)
    
    active_result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.status.in_([TimeEntryStatus.ACTIVE, TimeEntryStatus.PAUSED]))
        .order_by(TimeEntryModel.start_time.desc())
    )
    active_entry = active_result.scalar_one_or_none()
    
    recent_result = await db.execute(
        select(TimeEntryModel)
        .options(selectinload(TimeEntryModel.user), selectinload(TimeEntryModel.project), selectinload(TimeEntryModel.task))
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
        .order_by(TimeEntryModel.start_time.desc())
        .limit(10)
    )
    recent_entries = recent_result.scalars().all()
    
    projects_result = await db.execute(
        select(
            Project.id,
            Project.name,
            Project.color,
            func.coalesce(func.sum(TimeEntryModel.duration_seconds), 0).label("total_seconds")
        )
        .join(TimeEntryModel, TimeEntryModel.project_id == Project.id)
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.start_time >= month_start)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
        .group_by(Project.id, Project.name, Project.color)
        .order_by(func.sum(TimeEntryModel.duration_seconds).desc())
        .limit(5)
    )
    projects_summary = [
        {"id": p.id, "name": p.name, "color": p.color, "hours": round(p.total_seconds / 3600, 2)}
        for p in projects_result.all()
    ]

    weekly_result = await db.execute(
        select(
            func.date(TimeEntryModel.start_time).label("day"),
            func.coalesce(func.sum(TimeEntryModel.duration_seconds), 0).label("total_seconds")
        )
        .where(TimeEntryModel.user_id == current_user.id)
        .where(TimeEntryModel.start_time >= week_start)
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
        .group_by(func.date(TimeEntryModel.start_time))
    )
    weekly_map = {str(row.day): row.total_seconds for row in weekly_result.all()}

    from datetime import date as date_cls
    weekly_breakdown = []
    for i in range(7):
        day = (week_start + timedelta(days=i)).date()
        total_seconds = weekly_map.get(str(day), 0)
        weekly_breakdown.append({
            "date": day.isoformat(),
            "hours": round(total_seconds / 3600, 2),
        })

    return DashboardStats(
        today_hours=today_hours,
        week_hours=week_hours,
        month_hours=month_hours,
        active_entry=active_entry,
        recent_entries=recent_entries,
        projects_summary=projects_summary,
        weekly_breakdown=weekly_breakdown
    )


@router.post("/reports", response_model=TimeReport)
async def generate_report(
    filters: ReportFilters,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(TimeEntryModel).options(
        selectinload(TimeEntryModel.user),
        selectinload(TimeEntryModel.project),
        selectinload(TimeEntryModel.task),
        selectinload(TimeEntryModel.approver)
    ).where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
    
    if current_user.role == "employee":
        query = query.where(TimeEntryModel.user_id == current_user.id)
    elif filters.user_id:
        query = query.where(TimeEntryModel.user_id == filters.user_id)
    
    if filters.project_id:
        query = query.where(TimeEntryModel.project_id == filters.project_id)
    if filters.task_id:
        query = query.where(TimeEntryModel.task_id == filters.task_id)
    if filters.start_date:
        query = query.where(TimeEntryModel.start_time >= filters.start_date)
    if filters.end_date:
        query = query.where(TimeEntryModel.start_time <= filters.end_date)
    if filters.billable_only:
        query = query.where(TimeEntryModel.is_billable == True)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    total_seconds = sum(e.duration_seconds for e in entries)
    billable_seconds = sum(e.duration_seconds for e in entries if e.is_billable)
    
    by_project = {}
    by_user = {}
    by_task = {}
    daily = {}
    
    for entry in entries:
        hours = entry.duration_seconds / 3600
        
        if entry.project:
            pid = entry.project.id
            if pid not in by_project:
                by_project[pid] = {"id": pid, "name": entry.project.name, "color": entry.project.color, "hours": 0}
            by_project[pid]["hours"] += hours
        
        if entry.user:
            uid = entry.user.id
            if uid not in by_user:
                by_user[uid] = {"id": uid, "name": entry.user.full_name, "hours": 0}
            by_user[uid]["hours"] += hours
        
        if entry.task:
            tid = entry.task.id
            if tid not in by_task:
                by_task[tid] = {"id": tid, "title": entry.task.title, "hours": 0}
            by_task[tid]["hours"] += hours
        
        day_key = entry.start_time.date().isoformat()
        if day_key not in daily:
            daily[day_key] = {"date": day_key, "hours": 0}
        daily[day_key]["hours"] += hours
    
    return TimeReport(
        total_hours=round(total_seconds / 3600, 2),
        billable_hours=round(billable_seconds / 3600, 2),
        non_billable_hours=round((total_seconds - billable_seconds) / 3600, 2),
        entries_count=len(entries),
        by_project=list(by_project.values()),
        by_user=list(by_user.values()),
        by_task=list(by_task.values()),
        daily_breakdown=sorted(daily.values(), key=lambda x: x["date"]),
        entries=entries,
    )