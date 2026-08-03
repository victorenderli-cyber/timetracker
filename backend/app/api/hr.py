from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from calendar import monthrange
from app.db.session import get_db
from app.core.deps import get_current_manager
from app.models import User as UserModel, UserRole, TimeEntry as TimeEntryModel, TimeEntryStatus, ApprovalStatus
from app.schemas import HROverview, PointSheetRow, TimeBankRow, TimeEntryWithRelations, User


router = APIRouter()


def _workdays_in_month(year: int, month: int) -> int:
    days = monthrange(year, month)[1]
    count = 0
    for day in range(1, days + 1):
        if date(year, month, day).weekday() < 5:
            count += 1
    return count


def _workdays_for_user(user: UserModel, year: int, month: int) -> int:
    """Dias úteis no mês, desconsiderando dias anteriores à data de admissão."""
    first = date(year, month, 1)
    if user.hire_date:
        if user.hire_date > date(year, month, monthrange(year, month)[1]):
            return 0
        if user.hire_date > first:
            first = user.hire_date
    count = 0
    days = monthrange(year, month)[1]
    for day in range(1, days + 1):
        d = date(year, month, day)
        if d.weekday() < 5 and d >= first:
            count += 1
    return count


async def _load_entries(db: AsyncSession, user_id: Optional[int], start: datetime, end: datetime) -> List[TimeEntryModel]:
    query = (
        select(TimeEntryModel)
        .options(
            selectinload(TimeEntryModel.user),
            selectinload(TimeEntryModel.project),
            selectinload(TimeEntryModel.task),
            selectinload(TimeEntryModel.approver),
        )
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
        .where(TimeEntryModel.start_time >= start)
        .where(TimeEntryModel.start_time <= end)
    )
    if user_id:
        query = query.where(TimeEntryModel.user_id == user_id)
    query = query.order_by(TimeEntryModel.start_time.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/overview", response_model=HROverview)
async def hr_overview(
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

    employees_result = await db.execute(
        select(UserModel).where(UserModel.role == UserRole.EMPLOYEE)
    )
    employees = employees_result.scalars().all()
    active_employees = [u for u in employees if u.is_active]

    entries = await _load_entries(db, None, month_start, next_month)

    pending_result = await db.execute(
        select(func.count(TimeEntryModel.id)).where(
            TimeEntryModel.status == TimeEntryStatus.COMPLETED,
            TimeEntryModel.approval_status == ApprovalStatus.PENDING,
        )
    )
    pending_approvals = pending_result.scalar() or 0

    total_seconds = sum(e.duration_seconds for e in entries)
    approved_seconds = sum(e.duration_seconds for e in entries if e.approval_status == ApprovalStatus.APPROVED)

    expected_hours = 0.0
    for u in active_employees:
        hours = float(u.work_hours_per_day or 8.0)
        expected_hours += hours * _workdays_for_user(u, today.year, today.month)

    dept_map = {}
    for u in employees:
        dept = u.department or "Sem departamento"
        if dept not in dept_map:
            dept_map[dept] = {"name": dept, "employees": 0, "hours": 0.0}
        dept_map[dept]["employees"] += 1
    for e in entries:
        if e.user:
            dept = e.user.department or "Sem departamento"
            if dept in dept_map:
                dept_map[dept]["hours"] += e.duration_seconds / 3600
    by_department = [
        {"name": d["name"], "employees": d["employees"], "hours": round(d["hours"], 2)}
        for d in sorted(dept_map.values(), key=lambda x: -x["hours"])
    ]

    monthly_trend = []
    for offset in range(5, -1, -1):
        ym = month_start.replace(day=1) - timedelta(days=offset * 31)
        ym = ym.replace(day=1)
        ym_next = (ym.replace(day=28) + timedelta(days=4)).replace(day=1)
        trend_entries = await _load_entries(db, None, ym, ym_next)
        seconds = sum(e.duration_seconds for e in trend_entries)
        monthly_trend.append({
            "month": ym.strftime("%Y-%m"),
            "label": ym.strftime("%b/%Y"),
            "hours": round(seconds / 3600, 2),
        })

    recent = await db.execute(
        select(TimeEntryModel)
        .options(
            selectinload(TimeEntryModel.user),
            selectinload(TimeEntryModel.project),
            selectinload(TimeEntryModel.task),
            selectinload(TimeEntryModel.approver),
        )
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
        .order_by(TimeEntryModel.start_time.desc())
        .limit(8)
    )
    recent_entries = recent.scalars().all()

    return HROverview(
        total_employees=len(employees),
        active_employees=len(active_employees),
        pending_approvals=pending_approvals,
        approved_hours_month=round(approved_seconds / 3600, 2),
        total_hours_month=round(total_seconds / 3600, 2),
        expected_hours_month=round(expected_hours, 2),
        overtime_hours_month=round(max(0, total_seconds / 3600 - expected_hours), 2),
        by_department=by_department,
        monthly_trend=monthly_trend,
        recent_entries=recent_entries,
    )


@router.get("/employees", response_model=List[User])
async def hr_employees(
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserModel).order_by(UserModel.full_name))
    return result.scalars().all()


@router.get("/approvals", response_model=List[TimeEntryWithRelations])
async def hr_approvals(
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(TimeEntryModel)
        .options(
            selectinload(TimeEntryModel.user),
            selectinload(TimeEntryModel.project),
            selectinload(TimeEntryModel.task),
            selectinload(TimeEntryModel.approver),
        )
        .where(TimeEntryModel.status == TimeEntryStatus.COMPLETED)
    )
    if status_filter:
        query = query.where(TimeEntryModel.approval_status == ApprovalStatus(status_filter))
    else:
        query = query.where(TimeEntryModel.approval_status == ApprovalStatus.PENDING)
    if user_id:
        query = query.where(TimeEntryModel.user_id == user_id)
    query = query.order_by(TimeEntryModel.start_time.desc()).limit(200)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/approvals/{entry_id}/{action}", response_model=TimeEntryWithRelations)
async def hr_approve_entry(
    entry_id: int,
    action: str,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    result = await db.execute(
        select(TimeEntryModel)
        .options(
            selectinload(TimeEntryModel.user),
            selectinload(TimeEntryModel.project),
            selectinload(TimeEntryModel.task),
            selectinload(TimeEntryModel.approver),
        )
        .where(TimeEntryModel.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    entry.approval_status = ApprovalStatus.APPROVED if action == "approve" else ApprovalStatus.REJECTED
    entry.approved_by = current_user.id
    entry.approved_at = datetime.utcnow()

    await db.commit()
    await db.refresh(entry)

    result = await db.execute(
        select(TimeEntryModel)
        .options(
            selectinload(TimeEntryModel.user),
            selectinload(TimeEntryModel.project),
            selectinload(TimeEntryModel.task),
            selectinload(TimeEntryModel.approver),
        )
        .where(TimeEntryModel.id == entry.id)
    )
    return result.scalar_one()


@router.get("/point-sheet", response_model=List[PointSheetRow])
async def hr_point_sheet(
    month: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    if month:
        year, mon = int(month[:4]), int(month[5:7])
    else:
        now = datetime.utcnow()
        year, mon = now.year, now.month

    month_start = datetime(year, mon, 1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    workdays = _workdays_in_month(year, mon)

    employees_result = await db.execute(
        select(UserModel).where(UserModel.role == UserRole.EMPLOYEE)
    )
    employees = employees_result.scalars().all()
    if user_id:
        employees = [u for u in employees if u.id == user_id]

    entries = await _load_entries(db, user_id, month_start, next_month)

    by_user = {}
    for e in entries:
        by_user.setdefault(e.user_id, []).append(e)

    rows = []
    for u in employees:
        user_entries = by_user.get(u.id, [])
        expected = float(u.work_hours_per_day or 8.0) * _workdays_for_user(u, year, mon)
        total_seconds = sum(e.duration_seconds for e in user_entries)

        day_map = {}
        for e in user_entries:
            day_key = e.start_time.date().isoformat()
            day = day_map.setdefault(day_key, {"entries": 0, "seconds": 0, "first": None, "last": None})
            day["entries"] += 1
            day["seconds"] += e.duration_seconds
            if day["first"] is None or e.start_time < day["first"]:
                day["first"] = e.start_time
            if e.end_time and (day["last"] is None or e.end_time > day["last"]):
                day["last"] = e.end_time

        days = []
        for day_key in sorted(day_map.keys()):
            d = day_map[day_key]
            days.append({
                "date": day_key,
                "entries": d["entries"],
                "total_hours": round(d["seconds"] / 3600, 2),
                "first_entry": d["first"],
                "last_exit": d["last"],
            })

        rows.append(PointSheetRow(
            user_id=u.id,
            full_name=u.full_name,
            department=u.department,
            total_hours=round(total_seconds / 3600, 2),
            expected_hours=round(expected, 2),
            balance_hours=round(total_seconds / 3600 - expected, 2),
            days=days,
        ))

    return rows


@router.get("/time-bank", response_model=List[TimeBankRow])
async def hr_time_bank(
    month: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    if month:
        year, mon = int(month[:4]), int(month[5:7])
    else:
        now = datetime.utcnow()
        year, mon = now.year, now.month

    month_start = datetime(year, mon, 1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    workdays = _workdays_in_month(year, mon)

    employees_result = await db.execute(
        select(UserModel).where(UserModel.role == UserRole.EMPLOYEE)
    )
    employees = employees_result.scalars().all()
    if user_id:
        employees = [u for u in employees if u.id == user_id]

    entries = await _load_entries(db, user_id, month_start, next_month)

    by_user = {}
    days_with_entry = {}
    for e in entries:
        by_user.setdefault(e.user_id, []).append(e)
        day_key = e.start_time.date().isoformat()
        days_with_entry.setdefault(e.user_id, set()).add(day_key)

    rows = []
    for u in employees:
        user_entries = by_user.get(u.id, [])
        workdays = _workdays_for_user(u, year, mon)
        expected = float(u.work_hours_per_day or 8.0) * workdays
        worked = sum(e.duration_seconds for e in user_entries) / 3600
        balance = worked - expected
        absences = max(0, workdays - len(days_with_entry.get(u.id, set())))
        rows.append(TimeBankRow(
            user_id=u.id,
            full_name=u.full_name,
            department=u.department,
            worked_hours=round(worked, 2),
            expected_hours=round(expected, 2),
            balance_hours=round(balance, 2),
            overtime_hours=round(max(0, balance), 2),
            absences=absences,
        ))

    return rows
