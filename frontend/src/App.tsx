import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { TimesheetPage } from '@/pages/TimesheetPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { UsersPage } from '@/pages/UsersPage'
import { HrPage } from '@/pages/HrPage'
import { ToastContainer } from '@/store/toastStore'
import { useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useThemeStore, applyTheme } from '@/store/themeStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center animate-pulse">
          <Clock className="h-7 w-7" />
        </div>
        <div className="text-gray-500 font-medium">Carregando aplicação...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const location = useLocation()
  const theme = useThemeStore((s) => s.theme)
  const initTheme = useThemeStore((s) => s.init)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    fetchMe()
  }, [fetchMe, location.pathname])

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/timesheet" element={<TimesheetPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/hr" element={<HrPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}