from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.db.session import get_db
from app.core.deps import get_current_active_user, get_current_manager
from app.models import User, Project as ProjectModel, ProjectMember as ProjectMemberModel, Task, TimeEntry
from app.schemas import Project, ProjectCreate, ProjectUpdate, ProjectMember, ProjectMemberCreate


router = APIRouter()


@router.get("", response_model=List[Project])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProjectModel)
    
    if current_user.role == "employee":
        subquery = select(ProjectMemberModel.project_id).where(ProjectMemberModel.user_id == current_user.id)
        query = query.where(ProjectModel.id.in_(subquery))
    
    if is_active is not None:
        query = query.where(ProjectModel.is_active == is_active)
    
    query = query.offset(skip).limit(limit).order_by(ProjectModel.created_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()
    
    for project in projects:
        members_result = await db.execute(
            select(func.count(ProjectMemberModel.id)).where(ProjectMemberModel.project_id == ProjectModel.id)
        )
        ProjectModel.members_count = members_result.scalar() or 0
        
        tasks_result = await db.execute(
            select(func.count(Task.id)).where(Task.project_id == ProjectModel.id)
        )
        project.tasks_count = tasks_result.scalar() or 0
        
        hours_result = await db.execute(
            select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
            .where(TimeEntry.project_id == ProjectModel.id)
            .where(TimeEntry.status == "completed")
        )
        project.total_hours = round((hours_result.scalar() or 0) / 3600, 2)
    
    return projects


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = ProjectModel(**project_data.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.flush()
    
    owner_member = ProjectMemberModel(project_id=ProjectModel.id, user_id=current_user.id, role="owner")
    db.add(owner_member)
    
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProjectModel)
        .options(selectinload(ProjectModel.members).selectinload(ProjectMemberModel.user))
        .where(ProjectModel.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user.role == "employee":
        member_result = await db.execute(
            select(ProjectMemberModel).where(
                ProjectMemberModel.project_id == project_id,
                ProjectMemberModel.user_id == current_user.id
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this project")
    
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user.role == "employee":
        member_result = await db.execute(
            select(ProjectMemberModel).where(
                ProjectMemberModel.project_id == project_id,
                ProjectMemberModel.user_id == current_user.id,
                ProjectMemberModel.role.in_(["owner", "admin"])
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/members", response_model=List[ProjectMember])
async def list_project_members(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project_result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user.role == "employee":
        member_result = await db.execute(
            select(ProjectMemberModel).where(
                ProjectMemberModel.project_id == project_id,
                ProjectMemberModel.user_id == current_user.id
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this project")
    
    result = await db.execute(
        select(ProjectMemberModel)
        .options(selectinload(ProjectMemberModel.user))
        .where(ProjectMemberModel.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/{project_id}/members", response_model=ProjectMember, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project_result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user.role == "employee":
        member_result = await db.execute(
            select(ProjectMemberModel).where(
                ProjectMemberModel.project_id == project_id,
                ProjectMemberModel.user_id == current_user.id,
                ProjectMemberModel.role.in_(["owner", "admin"])
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to add members")
    
    user_result = await db.execute(select(User).where(User.id == member_data.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = await db.execute(
        select(ProjectMemberModel).where(
            ProjectMemberModel.project_id == project_id,
            ProjectMemberModel.user_id == member_data.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member")
    
    member = ProjectMemberModel(project_id=project_id, **member_data.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project_result = await db.execute(select(ProjectModel).where(ProjectModel.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user.role == "employee":
        member_result = await db.execute(
            select(ProjectMemberModel).where(
                ProjectMemberModel.project_id == project_id,
                ProjectMemberModel.user_id == current_user.id,
                ProjectMemberModel.role.in_(["owner", "admin"])
            )
        )
        if not member_result.scalar_one_or_none() and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to remove members")
    
    if user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    
    await db.execute(
        delete(ProjectMember).where(
            ProjectMemberModel.project_id == project_id,
            ProjectMemberModel.user_id == user_id
        )
    )
    await db.commit()