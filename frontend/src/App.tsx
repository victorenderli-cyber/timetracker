import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getToken } from '@/utils/auth'
import { Layout } from '@/components/Layout'
import { DownloadPage } from '@/pages/DownloadPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { TimesheetPage } from '@/pages/TimesheetPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { UsersPage } from '@/pages/UsersPage'
import { HrPage } from '@/pages/HrPage'
import { NewsHomePage } from '@/pages/news/NewsHomePage'
import { PrivacyPage } from '@/pages/news/PrivacyPage'
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
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const demoLogin = useAuthStore((s) => s.demoLogin)
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
    if (getToken()) {
      fetchMe()
    } else {
      demoLogin().catch(() => {})
    }
  }, [fetchMe, demoLogin, location.pathname])

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Portal público de notícias */}
        <Route path="/" element={<NewsHomePage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />

        {/* TimeTracker: aplicativo (web) e app Android */}
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/projects" element={<ProjectsPage />} />
          <Route path="/app/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/app/tasks" element={<TasksPage />} />
          <Route path="/app/timesheet" element={<TimesheetPage />} />
          <Route path="/app/reports" element={<ReportsPage />} />
          <Route path="/app/hr" element={<HrPage />} />
          <Route path="/app/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}