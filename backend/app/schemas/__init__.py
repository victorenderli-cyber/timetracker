from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from app.models import UserRole, TimeEntryStatus, ApprovalStatus


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EMPLOYEE


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    cpf: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    work_hours_per_day: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None
    manager_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    manager_id: Optional[int] = None
    cpf: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    work_hours_per_day: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    manager_id: Optional[int] = None
    cpf: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    work_hours_per_day: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None


class UserWithRelations(User):
    subordinates: List["User"] = []
    projects_count: int = 0
    active_time_entry: Optional["TimeEntry"] = None


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None


class Project(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    owner_id: int
    members_count: int = 0
    tasks_count: int = 0
    total_hours: float = 0.0


class ProjectMemberBase(BaseModel):
    user_id: int
    role: str = "member"


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMember(ProjectMemberBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    project_id: int
    joined_at: datetime
    user: User


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "todo"
    priority: int = 0
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    project_id: int
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None
    assignee_id: Optional[int] = None


class Task(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    project_id: int
    assignee_id: Optional[int]
    total_hours: float = 0.0


class TimeEntryBase(BaseModel):
    description: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    is_billable: bool = True


class TimeEntryCreate(TimeEntryBase):
    start_time: datetime


class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    is_billable: Optional[bool] = None
    status: Optional[TimeEntryStatus] = None


class TimeEntry(TimeEntryBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: int
    status: TimeEntryStatus
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: int
    user: Optional[User] = None
    project: Optional[Project] = None
    task: Optional[Task] = None
    approver: Optional[User] = None
    
    @property
    def duration_hours(self) -> float:
        return round(self.duration_seconds / 3600, 2)


class TimeEntryWithRelations(TimeEntry):
    user: User
    project: Optional[Project] = None
    task: Optional[Task] = None


class TimeEntryStart(BaseModel):
    description: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    is_billable: bool = True


class TimeEntryStop(BaseModel):
    description: Optional[str] = None


class DashboardStats(BaseModel):
    today_hours: float
    week_hours: float
    month_hours: float
    active_entry: Optional[TimeEntry] = None
    recent_entries: List[TimeEntryWithRelations] = []
    projects_summary: List[dict] = []
    weekly_breakdown: List[dict] = []


class ReportFilters(BaseModel):
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    billable_only: bool = False


class TimeReport(BaseModel):
    total_hours: float
    billable_hours: float
    non_billable_hours: float
    entries_count: int
    by_project: List[dict] = []
    by_user: List[dict] = []
    by_task: List[dict] = []
    daily_breakdown: List[dict] = []
    entries: List[TimeEntryWithRelations] = []


class ApprovalAction(BaseModel):
    entry_id: int
    action: str  # "approve" | "reject"


class HREmployeeRow(BaseModel):
    user_id: int
    full_name: str
    email: str
    department: Optional[str] = None
    position: Optional[str] = None
    cpf: Optional[str] = None
    hire_date: Optional[date] = None
    work_hours_per_day: Optional[Decimal] = None
    role: UserRole
    is_active: bool


class HROverview(BaseModel):
    total_employees: int
    active_employees: int
    pending_approvals: int
    approved_hours_month: float
    total_hours_month: float
    expected_hours_month: float
    overtime_hours_month: float
    by_department: List[dict] = []
    monthly_trend: List[dict] = []
    recent_entries: List[TimeEntryWithRelations] = []


class PointSheetDay(BaseModel):
    date: str
    entries: int
    total_hours: float
    first_entry: Optional[datetime] = None
    last_exit: Optional[datetime] = None


class PointSheetRow(BaseModel):
    user_id: int
    full_name: str
    department: Optional[str] = None
    total_hours: float
    expected_hours: float
    balance_hours: float
    days: List[PointSheetDay] = []


class TimeBankRow(BaseModel):
    user_id: int
    full_name: str
    department: Optional[str] = None
    worked_hours: float
    expected_hours: float
    balance_hours: float
    overtime_hours: float
    absences: int


# Pydantic v2 only builds forward references (User <-> TimeEntry etc.)
# on first use; force resolution here so load works on Python 3.11 too.
for _model in (UserWithRelations, TimeEntry, TimeEntryWithRelations, DashboardStats, TimeReport, HROverview):
    _model.model_rebuild()


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    area: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    source: str = Field("portal", max_length=50)
    newsletter_optin: bool = False
    consent: Optional[bool] = None  # LGPD: usuário aceitou a política de privacidade


class Lead(LeadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    consent: Optional[datetime] = None


class QuizResponseCreate(BaseModel):
    email: Optional[EmailStr] = None
    question_key: str = Field(..., max_length=100)
    answer: str = Field(..., max_length=1000)


class QuizResponse(QuizResponseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ContactSummary(BaseModel):
    total_leads: int
    total_quiz: int