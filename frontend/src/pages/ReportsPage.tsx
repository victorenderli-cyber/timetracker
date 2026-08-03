import { useState, useEffect } from 'react'
import { timeEntriesApi, projectsApi, usersApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download } from 'lucide-react'
import { format } from 'date-fns'
import { TimeReport, Project, User } from '@/types'
import { exportCsv } from '@/utils/csv'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [report, setReport] = useState<TimeReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error)
    usersApi.list().then(setUsers).catch(console.error)
  }, [])

  const generateReport = async () => {
    setLoading(true)
    try {
      const data = await timeEntriesApi.report({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        project_id: projectFilter ? Number(projectFilter) : undefined,
        user_id: userFilter ? Number(userFilter) : undefined,
      })
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!report) return
    exportCsv(
      `relatorio-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Data', 'Horas'],
      report.daily_breakdown.map((d) => [d.date, d.hours])
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500">Análise de horas trabalhadas</p>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="label">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
          <Button onClick={generateReport} loading={loading}>
            Gerar relatório
          </Button>
        </div>
      </Card>

      {report && (
        <>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{report.total_hours}h</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Faturáveis</p>
              <p className="text-2xl font-bold text-green-600">{report.billable_hours}h</p>
            </Card>
            <Card className="text-center">
              <p className="text-sm text-gray-500">Não faturáveis</p>
              <p className="text-2xl font-bold text-gray-600">{report.non_billable_hours}h</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Por projeto">
              {report.by_project.length === 0 ? (
                <p className="text-gray-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {report.by_project.map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-1">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      <span className="text-sm font-mono font-medium">{p.hours}h</span>
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
                      <span className="text-sm">{u.name}</span>
                      <span className="text-sm font-mono font-medium">{u.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}