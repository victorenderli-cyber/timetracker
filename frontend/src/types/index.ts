export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'employee';
  is_active: boolean;
  created_at: string;
  manager_id?: number;
  cpf?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  work_hours_per_day?: number;
  hourly_rate?: number;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  owner_id: number;
  members_count?: number;
  tasks_count?: number;
  total_hours?: number;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  user: User;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: number;
  estimated_hours?: number;
  created_at: string;
  updated_at?: string;
  due_date?: string;
  project_id: number;
  assignee_id?: number;
  assignee?: User;
  project?: Project;
  total_hours?: number;
}

export type TimeEntryStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: number;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  status: TimeEntryStatus;
  is_billable: boolean;
  approval_status?: ApprovalStatus;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
  user_id: number;
  user?: User;
  project_id?: number;
  project?: Project;
  task_id?: number;
  task?: Task;
  approver?: User;
}

export interface TimeEntryWithRelations extends TimeEntry {
  user: User;
  project?: Project;
  task?: Task;
}

export interface DashboardStats {
  today_hours: number;
  week_hours: number;
  month_hours: number;
  active_entry?: TimeEntryWithRelations;
  recent_entries: TimeEntryWithRelations[];
  projects_summary: Array<{
    id: number;
    name: string;
    color: string;
    hours: number;
  }>;
  weekly_breakdown: Array<{
    date: string;
    hours: number;
  }>;
}

export interface TimeReport {
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  entries_count: number;
  by_project: Array<{
    id: number;
    name: string;
    color: string;
    hours: number;
  }>;
  by_user: Array<{
    id: number;
    name: string;
    hours: number;
  }>;
  by_task: Array<{
    id: number;
    title: string;
    hours: number;
  }>;
  daily_breakdown: Array<{
    date: string;
    hours: number;
  }>;
}

export interface ReportFilters {
  user_id?: number;
  project_id?: number;
  task_id?: number;
  start_date?: string;
  end_date?: string;
  billable_only?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface HROverview {
  total_employees: number;
  active_employees: number;
  pending_approvals: number;
  approved_hours_month: number;
  total_hours_month: number;
  expected_hours_month: number;
  overtime_hours_month: number;
  by_department: Array<{
    name: string;
    employees: number;
    hours: number;
  }>;
  monthly_trend: Array<{
    month: string;
    label: string;
    hours: number;
  }>;
  recent_entries: TimeEntryWithRelations[];
}

export interface PointSheetDay {
  date: string;
  entries: number;
  total_hours: number;
  first_entry?: string;
  last_exit?: string;
}

export interface PointSheetRow {
  user_id: number;
  full_name: string;
  department?: string;
  total_hours: number;
  expected_hours: number;
  balance_hours: number;
  days: PointSheetDay[];
}

export interface TimeBankRow {
  user_id: number;
  full_name: string;
  department?: string;
  worked_hours: number;
  expected_hours: number;
  balance_hours: number;
  overtime_hours: number;
  absences: number;
}