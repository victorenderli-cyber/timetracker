import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  BarChart3,
  Users,
  LogOut,
  Timer,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { to: '/timesheet', label: 'Timesheet', icon: Clock },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/hr', label: 'RH / DP', icon: Briefcase, managerOnly: true },
  { to: '/users', label: 'Usuários', icon: Users, adminOnly: true },
]

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  employee: 'Funcionário',
}

export function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col sticky top-0 h-screen flex-shrink-0">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl shadow-lg shadow-primary-600/30">
              <Timer className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">TimeTracker</h1>
              <p className="text-xs text-gray-400">Monitoramento de horas</p>
            </div>
          </div>
        </div>

        <div className="px-3 mb-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Menu</p>
          <nav className="space-y-1">
            {navItems
              .filter(
                (item) =>
                  (!item.adminOnly || user?.role === 'admin') &&
                  (!item.managerOnly || user?.role === 'admin' || user?.role === 'manager')
              )
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      'relative',
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-white/90" />}
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
          </nav>
        </div>

        <div className="flex-1" />

        <div className="p-4 border-t border-gray-800 bg-gray-900/95">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-semibold text-white shadow-md">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{roleLabels[user?.role || ''] || user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 min-w-0">
        <div className="max-w-6xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}