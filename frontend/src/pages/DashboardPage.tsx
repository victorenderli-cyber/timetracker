import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { timeEntriesApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { Play, Pause, Square, Plus, Timer, CalendarDays, CalendarRange, Clock, FolderKanban } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast, toastError } from '@/store/toastStore'
import { DashboardStats } from '@/types'
import { cn } from '@/utils/cn'

const statCards = [
  {
    key: 'today_hours',
    label: 'Hoje',
    icon: Clock,
    gradient: 'from-blue-500 to-blue-600',
    ring: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'week_hours',
    label: 'Esta semana',
    icon: CalendarDays,
    gradient: 'from-emerald-500 to-emerald-600',
    ring: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'month_hours',
    label: 'Este mês',
    icon: CalendarRange,
    gradient: 'from-purple-500 to-purple-600',
    ring: 'bg-purple-50 text-purple-600',
  },
]

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const loadStats = useCallback(async () => {
    try {
      const data = await timeEntriesApi.dashboard()
      setStats(data)
      if (data.active_entry) {
        const start = new Date(data.active_entry.start_time).getTime()
        const now = Date.now()
        const base = data.active_entry.status === 'paused'
          ? data.active_entry.duration_seconds
          : Math.max(0, Math.floor((now - start) / 1000))
        setElapsed(base)
      } else {
        setElapsed(0)
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao carregar o dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [loadStats])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    try {
      await timeEntriesApi.start({})
      toast('Timer iniciado!')
      loadStats()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao iniciar o timer')
    }
  }

  const handleStop = async (id: number) => {
    try {
      await timeEntriesApi.stop(id)
      setElapsed(0)
      toast('Registro salvo!')
      loadStats()
    } catch (err: any) {
      toastError('Erro ao parar o timer')
    }
  }

  const handlePause = async (id: number) => {
    try {
      await timeEntriesApi.pause(id)
      toast('Timer pausado')
      loadStats()
    } catch (err: any) {
      toastError('Erro ao pausar o timer')
    }
  }

  const handleResume = async (id: number) => {
    try {
      await timeEntriesApi.resume(id)
      toast('Timer retomado')
      loadStats()
    } catch (err: any) {
      toastError('Erro ao retomar o timer')
    }
  }

  if (loading) return <PageSkeleton />

  const isPaused = stats?.active_entry?.status === 'paused'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Bem-vindo, {user?.full_name}</p>
        </div>
        <Button onClick={() => navigate('/projects')}>
          <Plus className="h-4 w-4 mr-2" /> Novo projeto
        </Button>
      </div>

      {/* Timer card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stats?.active_entry ? (isPaused ? 'bg-yellow-500 text-white' : 'bg-primary-600 text-white') : 'bg-gray-300 text-gray-600'}`}>
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {stats?.active_entry?.description || (isPaused ? 'Timer pausado' : 'Nenhum timer ativo')}
              </p>
              <p className="text-3xl font-mono font-bold text-gray-900">
                {stats?.active_entry ? formatDuration(elapsed) : '00:00:00'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {stats?.active_entry ? (
              <>
                {isPaused ? (
                  <Button onClick={() => handleResume(stats.active_entry!.id)} data-testid="resume">
                    <Play className="h-4 w-4 mr-2" /> Retomar
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => handlePause(stats.active_entry!.id)}>
                    <Pause className="h-4 w-4 mr-2" /> Pausar
                  </Button>
                )}
                <Button variant="danger" onClick={() => handleStop(stats.active_entry!.id)}>
                  <Square className="h-4 w-4 mr-2" /> Parar
                </Button>
              </>
            ) : (
              <Button onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" /> Iniciar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.key} className="relative overflow-hidden">
            <div className={cn('absolute inset-0 bg-gradient-to-br', card.gradient, 'opacity-[0.03]')} />
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {typeof stats?.[card.key as keyof DashboardStats] === 'number' ? (stats?.[card.key as keyof DashboardStats] as number) : 0}
                  <span className="text-lg font-semibold text-gray-400 ml-1">h</span>
                </p>
              </div>
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', card.ring)}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly chart */}
      <Card title="Horas esta semana">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(stats?.weekly_breakdown || []).map((d) => ({
                name: format(new Date(d.date), 'EEE', { locale: ptBR }),
                hours: d.hours,
              }))}
              margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v}h`} />
              <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent entries */}
        <Card title="Registros recentes">
          {!stats?.recent_entries?.length ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="Nenhum registro ainda"
              description="Clique em iniciar no timer para começar a registrar suas horas"
            />
          ) : (
            <div className="space-y-1">
              {stats.recent_entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-2 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{entry.description || 'Sem descrição'}</p>
                    <p className="text-sm text-gray-500">
                      {entry.project?.name || 'Sem projeto'} · {format(new Date(entry.start_time), 'dd/MM', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-gray-900">
                      {formatDuration(entry.duration_seconds)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Project summary */}
        <Card title="Horas por projeto (este mês)">
          {!stats?.projects_summary?.length ? (
            <EmptyState
              icon={<FolderKanban className="h-8 w-8" />}
              title="Sem dados de projetos"
              description="Complete registros de tempo para ver o resumo por projeto"
            />
          ) : (
            <div className="space-y-4">
              {stats.projects_summary.map((p) => {
                const max = Math.max(...stats.projects_summary.map((x) => x.hours), 1)
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-900 font-medium">{p.name}</span>
                      <span className="font-mono font-medium text-gray-700">{p.hours}h</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(p.hours / max) * 100}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}