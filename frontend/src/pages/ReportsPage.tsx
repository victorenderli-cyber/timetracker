import { useState, useEffect, useCallback } from 'react'
import { timeEntriesApi, projectsApi, usersApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download } from 'lucide-react'
import { format, subDays, startOfMonth, startOfYear, endOfMonth } from 'date-fns'
import { Project, User } from '@/types'
import { exportCsv } from '@/utils/csv'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const toDateInput = (d: Date) => d.toISOString().slice(0, 10)

function presets(): Record<string, { label: string; start: string; end: string }> {
  const today = new Date()
  return {
    today: { label: 'Hoje', start: toDateInput(today), end: toDateInput(today) },
    '7d': { label: 'Últimos 7 dias', start: toDateInput(subDays(today, 6)), end: toDateInput(today) },
    'month': { label: 'Este mês', start: toDateInput(startOfMonth(today)), end: toDateInput(endOfMonth(today)) },
    'lastmonth': { label: 'Mês passado', start: toDateInput(startOfMonth(subDays(startOfMonth(today), 1))), end: toDateInput(endOfMonth(subDays(startOfMonth(today), 1))) },
    'year': { label: 'Este ano', start: toDateInput(startOfYear(today)), end: toDateInput(today) },
  }
}

export function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [report, setReport] = useState<null | {
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
    entries_count: number;
    by_project: { id: number; name: string; color: string; hours: number }[];
    by_user: { id: number; name: string; hours: number }[];
    by_task: { id: number; title: string; hours: number }[];
    daily_breakdown: { date: string; hours: number }[];
    entries: any[];
  }>(null)
  const [loading, setLoading] = useState(false)
  const [activePreset, setActivePreset] = useState('')

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error)
    usersApi.list().then(setUsers).catch(console.error)
  }, [])

  const generateReport = useCallback(async (s = startDate, e = endDate) => {
    setLoading(true)
    try {
      const data = await timeEntriesApi.report({
        start_date: s || undefined,
        end_date: e || undefined,
        project_id: projectFilter ? Number(projectFilter) : undefined,
        user_id: userFilter ? Number(userFilter) : undefined,
      })
      setReport(data as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, projectFilter, userFilter])

  const applyPreset = (key: string) => {
    const p = presets()[key]
    setStartDate(p.start)
    setEndDate(p.end)
    setActivePreset(key)
    generateReport(p.start, p.end)
  }

  const handleExport = () => {
    if (!report) return
    exportCsv(
      `relatorio-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Funcionário', 'Projeto', 'Tarefa', 'Descrição', 'Data', 'Horas', 'Faturável', 'Status'],
      report.entries.map((e) => [
        e.user?.full_name || '',
        e.project?.name || '',
        e.task?.title || '',
        e.description || '',
        format(new Date(e.start_time), 'dd/MM/yyyy HH:mm'),
        (e.duration_seconds / 3600).toFixed(2),
        e.is_billable ? 'Sim' : 'Não',
        e.approval_status || '',
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <p className="text-gray-500">Análise de horas trabalhadas</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(presets()).map(([key, p]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePreset === key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
          <div>
            <label className="label">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActivePreset('') }}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActivePreset('') }}
              className="input"
            />
          </div>
          <div>
            <label className="label">Projeto</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Usuário</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => generateReport()} loading={loading}>
            Gerar relatório
          </Button>
        </div>
      </Card>

      {report && (
        <>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{report.total_hours}h</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Faturáveis</p>
              <p className="text-2xl font-bold text-green-600">{report.billable_hours}h</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Não faturáveis</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{report.non_billable_hours}h</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Lançamentos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{report.entries_count}</p>
            </Card>
          </div>

          <Card title="Horas por dia">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.daily_breakdown.map((d) => ({
                  name: format(new Date(d.date), 'dd/MM'),
                  hours: d.hours,
                }))} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {report.by_project.length > 0 && (
              <Card title="Distribuição por projeto">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.by_project}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={(e: any) => `${e.name}: ${e.hours}h`}
                      >
                        {report.by_project.map((p, i) => (
                          <Cell key={p.id} fill={p.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {report.by_task.length > 0 && (
              <Card title="Horas por tarefa">
                <div className="space-y-3 h-72 overflow-y-auto">
                  {report.by_task.slice(0, 10).map((t) => {
                    const max = Math.max(...report.by_task.map((x) => x.hours), 1)
                    return (
                      <div key={t.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-800 dark:text-gray-200 font-medium truncate pr-2">{t.title}</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">{t.hours}h</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500" style={{ width: `${(t.hours / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Por projeto">
              {report.by_project.length === 0 ? (
                <p className="text-gray-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {report.by_project.map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-1">
                      <span className="flex items-center gap-2 text-sm dark:text-gray-200">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{p.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Por usuário">
              {report.by_user.length === 0 ? (
                <p className="text-gray-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {report.by_user.map((u) => (
                    <div key={u.id} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                      <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{u.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Lançamentos detalhados">
            {report.entries.length === 0 ? (
              <p className="text-gray-500 text-sm">Sem dados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100 dark:border-gray-700">
                      <th className="table-header">Funcionário</th>
                      <th className="table-header">Projeto</th>
                      <th className="table-header">Tarefa</th>
                      <th className="table-header">Descrição</th>
                      <th className="table-header">Data</th>
                      <th className="table-header">Horas</th>
                      <th className="table-header">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.entries.slice(0, 100).map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="table-cell font-medium text-gray-900 dark:text-gray-100">{e.user?.full_name || '-'}</td>
                        <td className="table-cell text-gray-600 dark:text-gray-300">{e.project?.name || '-'}</td>
                        <td className="table-cell text-gray-600 dark:text-gray-300">{e.task?.title || '-'}</td>
                        <td className="table-cell text-gray-600 dark:text-gray-300">{e.description || 'Sem descrição'}</td>
                        <td className="table-cell text-gray-600 dark:text-gray-300">{format(new Date(e.start_time), 'dd/MM/yy HH:mm')}</td>
                        <td className="table-cell font-mono text-sm text-gray-700 dark:text-gray-300">{(e.duration_seconds / 3600).toFixed(2)}h</td>
                        <td className="table-cell text-gray-600 dark:text-gray-300">{e.is_billable ? 'Faturável' : 'Não faturável'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}