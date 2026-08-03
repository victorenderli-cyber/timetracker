from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models import User, Project, Task as TaskModel, TimeEntry, ProjectMember
from app.schemas import Task, TaskCreate, TaskUpdate


router = APIRouter()


async def check_project_access(db: AsyncSession, project_id: int, user_id: int, required_roles: list = None) -> bool:
    if required_roles is None:
        required_roles = ["owner", "admin", "member"]
    
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.role.in_(required_roles)
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=List[Task])
async def list_tasks(
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(TaskModel).options(selectinload(TaskModel.assignee), selectinload(TaskModel.project))
    
    if current_user.role == "employee":
        project_ids_subquery = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        query = query.where(TaskModel.project_id.in_(project_ids_subquery))
    
    if project_id:
        query = query.where(TaskModel.project_id == project_id)
    if assignee_id:
        query = query.where(TaskModel.assignee_id == assignee_id)
    if status:
        query = query.where(TaskModel.status == status)
    
    query = query.offset(skip).limit(limit).order_by(TaskModel.priority.desc(), TaskModel.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    for task in tasks:
        hours_result = await db.execute(
            select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
            .where(TimeEntry.task_id == TaskModel.id)
            .where(TimeEntry.status == "completed")
        )
        task.total_hours = round((hours_result.scalar() or 0) / 3600, 2)
    
    return tasks


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project_result = await db.execute(select(Project).where(Project.id == task_data.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    has_access = await check_project_access(db, task_data.project_id, current_user.id, ["owner", "admin", "member"])
    if not has_access and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not a member of this project")
    
    if task_data.assignee_id:
        assignee_result = await db.execute(select(User).where(User.id == task_data.assignee_id))
        assignee = assignee_result.scalar_one_or_none()
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        
        assignee_access = await check_project_access(db, task_data.project_id, task_data.assignee_id)
        if not assignee_access:
            raise HTTPException(status_code=400, detail="Assignee is not a member of this project")
    
    task = TaskModel(**task_data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TaskModel)
        .options(selectinload(TaskModel.assignee), selectinload(TaskModel.project))
        .where(TaskModel.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    has_access = await check_project_access(db, TaskModel.project_id, current_user.id)
    if not has_access and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not a member of this project")
    
    hours_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
        .where(TimeEntry.task_id == TaskModel.id)
        .where(TimeEntry.status == "completed")
    )
    task.total_hours = round((hours_result.scalar() or 0) / 3600, 2)
    
    return task


@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TaskModel).options(selectinload(TaskModel.project)).where(TaskModel.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    has_access = await check_project_access(db, TaskModel.project_id, current_user.id, ["owner", "admin"])
    if not has_access and current_user.role == "employee" and TaskModel.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaskModel).where(TaskModel.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    has_access = await check_project_access(db, TaskModel.project_id, current_user.id, ["owner", "admin"])
    if not has_access and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    
    await db.delete(task)
    await db.commit()