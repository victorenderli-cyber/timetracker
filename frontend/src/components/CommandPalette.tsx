import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Clock, BarChart3, Briefcase,
  Users, Play, Plus, Search, CornerDownLeft, UserPlus,
} from 'lucide-react'
import { projectsApi, tasksApi } from '@/api'
import { timeEntriesApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { toast, toastError, toastInfo } from '@/store/toastStore'

interface CommandItem {
  group: string
  label: string
  hint?: string
  icon: React.ReactNode
  onSelect: () => void
  keywords?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CommandItem[]>([])
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const inputRef = useRef<HTMLInputElement>(null)

  const isMgmt = user?.role === 'admin' || user?.role === 'manager'

  const buildItems = useCallback(async () => {
    const navPages: CommandItem[] = [
      { group: 'NavegaÃ§Ã£o', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, onSelect: () => navigate('/app') },
      { group: 'NavegaÃ§Ã£o', label: 'Projetos', icon: <FolderKanban className="h-4 w-4" />, onSelect: () => navigate('/app/projects') },
      { group: 'NavegaÃ§Ã£o', label: 'Tarefas', icon: <CheckSquare className="h-4 w-4" />, onSelect: () => navigate('/app/tasks') },
      { group: 'NavegaÃ§Ã£o', label: 'Timesheet', icon: <Clock className="h-4 w-4" />, onSelect: () => navigate('/app/timesheet') },
      { group: 'NavegaÃ§Ã£o', label: 'RelatÃ³rios', icon: <BarChart3 className="h-4 w-4" />, onSelect: () => navigate('/app/reports') },
      ...(isMgmt ? [{ group: 'NavegaÃ§Ã£o', label: 'RH / DP', icon: <Briefcase className="h-4 w-4" />, onSelect: () => navigate('/app/hr') }] : []),
      ...(user?.role === 'admin' ? [{ group: 'NavegaÃ§Ã£o', label: 'UsuÃ¡rios', icon: <Users className="h-4 w-4" />, onSelect: () => navigate('/app/users') }] : []),
    ]

    const actions: CommandItem[] = [
      {
        group: 'AÃ§Ãµes', label: 'Iniciar timer', icon: <Play className="h-4 w-4" />,
        onSelect: async () => {
          try { await timeEntriesApi.start({}); toast('Timer iniciado!'); close() }
          catch (err: any) { toastError(err.response?.data?.detail || 'Erro ao iniciar') }
        },
      },
      {
        group: 'AÃ§Ãµes', label: 'Registrar tempo manualmente', icon: <Plus className="h-4 w-4" />,
        onSelect: () => { navigate('/app/timesheet'); toastInfo('Abra o registro manual no timesheet') },
      },
      {
        group: 'AÃ§Ãµes', label: 'Criar projeto', icon: <FolderKanban className="h-4 w-4" />,
        onSelect: () => navigate('/app/projects'),
      },
      ...(isMgmt ? [{
        group: 'AÃ§Ãµes', label: 'Criar usuÃ¡rio', icon: <UserPlus className="h-4 w-4" />,
        onSelect: () => navigate('/app/users'),
      }] : []),
    ]

    const base = [...navPages, ...actions]

    // fetch data for richer search
    let projItems: CommandItem[] = []
    try {
      const projData = await projectsApi.list()
      projItems = (projData as any[]).slice(0, 6).map((p) => ({
        group: 'Projetos', label: p.name, hint: 'Abrir projeto',
        icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />,
        onSelect: () => navigate(`/projects/${p.id}`),
      }))
    } catch { /* ignore */ }

    let taskItems: CommandItem[] = []
    try {
      const taskData = await tasksApi.list()
      taskItems = (taskData as any[]).slice(0, 6).map((t) => ({
        group: 'Tarefas', label: t.title, hint: t.project?.name,
        icon: <CheckSquare className="h-4 w-4" />,
        onSelect: () => t.project_id ? navigate(`/projects/${t.project_id}`) : navigate('/app/tasks'),
      }))
    } catch { /* ignore */ }

    const all = [...base, ...projItems, ...taskItems]
    setItems(all)
    setIndex(0)
  }, [navigate, isMgmt, user?.role])

  useEffect(() => {
    if (!open) return
    buildItems()
  }, [open, buildItems])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const close = useCallback(() => { onClose(); setQuery('') }, [onClose])

  if (!open) return null

  // filtrar por query
  const q = query.trim().toLowerCase()
  const filtered = q
    ? items.filter((it) => (it.label + ' ' + (it.keywords || '') + ' ' + it.group).toLowerCase().includes(q))
    : items

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it)
    return acc
  }, {})

  const flat = filtered

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => (i + 1) % flat.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i - 1 + flat.length) % flat.length) }
    else if (e.key === 'Enter') { e.preventDefault(); flat[index]?.onSelect(); close() }
    else if (e.key === 'Escape') { close() }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={close} />
      <div className="flex min-h-full items-start justify-center p-4 pt-[12vh]">
        <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Buscar pÃ¡ginas, projetos, tarefas ou aÃ§Ãµes..."
            />
            <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {Object.keys(grouped).length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Nenhum resultado para "{query}"
              </div>
            ) : (
              Object.entries(grouped).map(([group, groupItems]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {group}
                  </p>
                  {groupItems.map((it, gi) => {
                    const actualIndex = filtered.indexOf(it)
                    return (
                      <button
                        key={gi}
                        onMouseEnter={() => setIndex(actualIndex)}
                        onClick={() => { it.onSelect(); close() }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${actualIndex === index ? 'bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        <span className="shrink-0">{it.icon}</span>
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.hint && <span className="text-xs text-gray-400 truncate max-w-[180px]">{it.hint}</span>}
                        {actualIndex === index && <CornerDownLeft className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">â†‘â†“</kbd> navegar</span>
            <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3 w-3" /> selecionar</span>
            <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl K</kbd> abrir/fechar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
