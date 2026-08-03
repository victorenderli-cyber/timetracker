from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean, Date, Time, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum
from datetime import datetime


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class TimeEntryStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    cpf = Column(String(14), unique=True, nullable=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    hire_date = Column(Date, nullable=True)
    work_hours_per_day = Column(Numeric(5, 2), default=8.0)
    hourly_rate = Column(Numeric(10, 2), nullable=True)

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", remote_side=[id], backref="subordinates")

    time_entries = relationship("TimeEntry", back_populates="user", foreign_keys="TimeEntry.user_id", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_id")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#3B82F6")  # Hex color
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="projects", foreign_keys=[owner_id])
    
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="member")  # owner, admin, member
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    project = relationship("Project", back_populates="members")
    user = relationship("User")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo")  # todo, in_progress, review, done
    priority = Column(Integer, default=0)
    estimated_hours = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    due_date = Column(Date, nullable=True)
    
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project = relationship("Project", back_populates="tasks")
    
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignee = relationship("User", foreign_keys=[assignee_id])
    
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)  # Calculated field
    status = Column(Enum(TimeEntryStatus), default=TimeEntryStatus.ACTIVE, nullable=False)
    is_billable = Column(Boolean, default=True)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="time_entries", foreign_keys=[user_id])
    
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    project = relationship("Project", back_populates="time_entries")
    
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    task = relationship("Task", back_populates="time_entries")
    approver = relationship("User", foreign_keys=[approved_by])