import api from './client'
import { User, Project, ProjectMember, Task, TimeEntry, DashboardStats, TimeReport, ReportFilters, HROverview, PointSheetRow, TimeBankRow } from '@/types'

export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const { data } = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },
  register: async (userData: { email: string; full_name: string; password: string; role?: string }) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },
  me: async () => {
    const { data } = await api.get('/auth/me')
    return data as User
  },
}

export const usersApi = {
  list: async (params?: { role?: string; search?: string; is_active?: boolean }) => {
    const { data } = await api.get('/users', { params })
    return data as User[]
  },
  get: async (id: number) => {
    const { data } = await api.get(`/users/${id}`)
    return data as User
  },
  create: async (userData: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    cpf?: string;
    department?: string;
    position?: string;
    hire_date?: string;
    work_hours_per_day?: number;
    hourly_rate?: number;
  }) => {
    const { data } = await api.post('/auth/register', userData)
    return data as User
  },
  update: async (id: number, userData: Partial<User>) => {
    const { data } = await api.put(`/users/${id}`, userData)
    return data as User
  },
  deactivate: async (id: number) => {
    const { data } = await api.put(`/users/${id}`, { is_active: false })
    return data as User
  },
  activate: async (id: number) => {
    const { data } = await api.put(`/users/${id}`, { is_active: true })
    return data as User
  },
  getStats: async () => {
    const { data } = await api.get('/users/me/stats')
    return data
  },
}

export const projectsApi = {
  list: async (params?: { is_active?: boolean }) => {
    const { data } = await api.get('/projects', { params })
    return data as Project[]
  },
  get: async (id: number) => {
    const { data } = await api.get(`/projects/${id}`)
    return data as Project
  },
  create: async (project: { name: string; description?: string; color?: string }) => {
    const { data } = await api.post('/projects', project)
    return data as Project
  },
  update: async (id: number, project: Partial<Project>) => {
    const { data } = await api.put(`/projects/${id}`, project)
    return data as Project
  },
  delete: async (id: number) => {
    await api.delete(`/projects/${id}`)
  },
  members: async (projectId: number) => {
    const { data } = await api.get(`/projects/${projectId}/members`)
    return data as ProjectMember[]
  },
  addMember: async (projectId: number, member: { user_id: number; role?: string }) => {
    const { data } = await api.post(`/projects/${projectId}/members`, member)
    return data as ProjectMember
  },
  removeMember: async (projectId: number, userId: number) => {
    await api.delete(`/projects/${projectId}/members/${userId}`)
  },
}

export const tasksApi = {
  list: async (params?: { project_id?: number; assignee_id?: number; status?: string }) => {
    const { data } = await api.get('/tasks', { params })
    return data as Task[]
  },
  get: async (id: number) => {
    const { data } = await api.get(`/tasks/${id}`)
    return data as Task
  },
  create: async (task: Partial<Task> & { title: string; project_id: number }) => {
    const { data } = await api.post('/tasks', task)
    return data as Task
  },
  update: async (id: number, task: Partial<Task>) => {
    const { data } = await api.put(`/tasks/${id}`, task)
    return data as Task
  },
  delete: async (id: number) => {
    await api.delete(`/tasks/${id}`)
  },
}

export const timeEntriesApi = {
  list: async (params?: {
    project_id?: number;
    task_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }) => {
    const { data } = await api.get('/time-entries', { params })
    return data as TimeEntry[]
  },
  create: async (entry: { description?: string; project_id?: number; task_id?: number; is_billable?: boolean }) => {
    const { data } = await api.post('/time-entries', entry)
    return data as TimeEntry
  },
  start: async (entry: { description?: string; project_id?: number; task_id?: number; is_billable?: boolean }) => {
    const { data } = await api.post('/time-entries/start', entry)
    return data as TimeEntry
  },
  stop: async (id: number, description?: string) => {
    const { data } = await api.post(`/time-entries/${id}/stop`, { description })
    return data as TimeEntry
  },
  pause: async (id: number) => {
    const { data } = await api.post(`/time-entries/${id}/pause`)
    return data as TimeEntry
  },
  resume: async (id: number) => {
    const { data } = await api.post(`/time-entries/${id}/resume`)
    return data as TimeEntry
  },
  getActive: async () => {
    const { data } = await api.get('/time-entries/active/current')
    return data as TimeEntry
  },
  update: async (id: number, entry: Partial<TimeEntry>) => {
    const { data } = await api.put(`/time-entries/${id}`, entry)
    return data as TimeEntry
  },
  delete: async (id: number) => {
    await api.delete(`/time-entries/${id}`)
  },
  dashboard: async () => {
    const { data } = await api.get('/time-entries/dashboard/stats')
    return data as DashboardStats
  },
  report: async (filters: ReportFilters) => {
    const { data } = await api.post('/time-entries/reports', filters)
    return data as TimeReport
  },
}

export const hrApi = {
  overview: async () => {
    const { data } = await api.get('/hr/overview')
    return data as HROverview
  },
  approvals: async (params?: { status?: string; user_id?: number }) => {
    const { data } = await api.get('/hr/approvals', { params })
    return data as TimeEntry[]
  },
  approve: async (entryId: number, action: 'approve' | 'reject') => {
    const { data } = await api.post(`/hr/approvals/${entryId}/${action}`)
    return data as TimeEntry
  },
  pointSheet: async (params?: { month?: string; user_id?: number }) => {
    const { data } = await api.get('/hr/point-sheet', { params })
    return data as PointSheetRow[]
  },
  timeBank: async (params?: { month?: string; user_id?: number }) => {
    const { data } = await api.get('/hr/time-bank', { params })
    return data as TimeBankRow[]
  },
  employees: async () => {
    const { data } = await api.get('/hr/employees')
    return data as User[]
  },
}