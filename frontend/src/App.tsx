import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getToken } from '@/utils/auth'
import { Layout } from '@/components/Layout'
import { DownloadPage } from '@/pages/DownloadPage'
import { NewsHomePage } from '@/pages/news/NewsHomePage'
import { NewsDetailPage } from '@/pages/news/NewsDetailPage'
import { PrivacyPage } from '@/pages/news/PrivacyPage'
import { TermsPage } from '@/pages/news/TermsPage'
import { AboutPage } from '@/pages/news/AboutPage'
import { AdminPage } from '@/pages/news/AdminPage'
import { ToastContainer } from '@/store/toastStore'
import { lazy, Suspense, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useThemeStore, applyTheme } from '@/store/themeStore'

// Lazy: o TimeTracker (app) só carrega quando o usuário abre /app. A home do
// portal continua leve para SEO/primeira pintura. As páginas usam export
// nomeado; o lazy só aceita default, então adaptamos.
const namedLazy = (loader: () => Promise<Record<string, unknown>>) =>
  lazy(async () => {
    const mod = await loader()
    const key = Object.keys(mod).find((k) => k !== '__esModule')
    const component = key ? (mod[key] as React.ComponentType) : null
    if (!component) throw new Error('named export não encontrado')
    return { default: component }
  })

const DashboardPage = namedLazy(() => import('@/pages/DashboardPage'))
const ProjectsPage = namedLazy(() => import('@/pages/ProjectsPage'))
const ProjectDetailPage = namedLazy(() => import('@/pages/ProjectDetailPage'))
const TasksPage = namedLazy(() => import('@/pages/TasksPage'))
const TimesheetPage = namedLazy(() => import('@/pages/TimesheetPage'))
const ReportsPage = namedLazy(() => import('@/pages/ReportsPage'))
const UsersPage = namedLazy(() => import('@/pages/UsersPage'))
const HrPage = namedLazy(() => import('@/pages/HrPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center animate-pulse">
        <Clock className="h-6 w-6" />
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <PageLoader />
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
        <Route path="/noticia/:id" element={<NewsDetailPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/admin" element={<AdminPage />} />

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
          <Route
            path="/app"
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/app/projects"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProjectsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/projects/:projectId"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProjectDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/app/tasks"
            element={
              <Suspense fallback={<PageLoader />}>
                <TasksPage />
              </Suspense>
            }
          />
          <Route
            path="/app/timesheet"
            element={
              <Suspense fallback={<PageLoader />}>
                <TimesheetPage />
              </Suspense>
            }
          />
          <Route
            path="/app/reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="/app/hr"
            element={
              <Suspense fallback={<PageLoader />}>
                <HrPage />
              </Suspense>
            }
          />
          <Route
            path="/app/users"
            element={
              <Suspense fallback={<PageLoader />}>
                <UsersPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}