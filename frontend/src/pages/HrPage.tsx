import { useState, useEffect, useCallback } from 'react'
import { hrApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  LayoutDashboard, CheckCircle2, XCircle, Clock, Download, Users, AlertTriangle,
  CheckCheck, CalendarRange, Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { HROverview, PointSheetRow, TimeBankRow, TimeEntry } from '@/types'
import { exportCsv } from '@/utils/csv'
import { toast, toastError } from '@/store/toastStore'

const DEPT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

const approvalBadge: Record<string, 'yellow' | 'green' | 'red'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

const approvalLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Reprovado',
}

type Tab = 'overview' | 'approvals' | 'point' | 'bank'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtHours(h: number) {
  return `${h.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`
}

function fmtTime(iso?: string) {
  if (!iso) return '-'
  return format(new Date(iso), 'HH:mm')
}

export function HrPage() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RH / Departamento Pessoal</h1>
        <p className="text-gray-500">Gestão de ponto, aprovações e banco de horas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'overview' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          <LayoutDashboard className="h-4 w-4 inline mr-1.5 -mt-0.5" /> Visão geral
        </button>
        <button
          onClick={() => setTab('approvals')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'approvals' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          <CheckCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" /> Aprovações
        </button>
        <button
          onClick={() => setTab('point')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'point' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          <CalendarRange className="h-4 w-4 inline mr-1.5 -mt-0.5" /> Ponto / Frequência
        </button>
        <button
          onClick={() => setTab('bank')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'bank' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          <Wallet className="h-4 w-4 inline mr-1.5 -mt-0.5" /> Banco de horas
        </button>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'point' && <PointTab />}
      {tab === 'bank' && <TimeBankTab />}
    </div>
  )
}

function OverviewTab() {
  const [data, setData] = useState<HROverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hrApi.overview().then(setData).catch(() => toastError('Erro ao carregar visão geral')).finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-80" />

  const cards = [
    { label: 'Funcionários', value: data?.total_employees ?? 0, sub: `${data?.active_employees ?? 0} ativos`, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Aprovações pendentes', value: data?.pending_approvals ?? 0, sub: 'aguardando análise', icon: CheckCheck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Horas no mês', value: fmtHours(data?.total_hours_month ?? 0), sub: `${fmtHours(data?.approved_hours_month ?? 0)} aprovadas`, icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Horas extras no mês', value: fmtHours(data?.overtime_hours_month ?? 0), sub: `meta ${fmtHours(data?.expected_hours_month ?? 0)}`, icon: AlertTriangle, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Horas por mês (últimos 6 meses)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly_trend ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Horas por departamento">
          {(data?.by_department?.length ?? 0) > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.by_department ?? []}
                    dataKey="hours"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={(e: any) => `${e.name}`}
                  >
                    {(data?.by_department ?? []).map((d, i) => (
                      <Cell key={d.name} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem dados de departamentos" description="Cadastre o departamento dos funcionários para ver este gráfico" />
          )}
        </Card>
      </div>

      <Card title="Registros recentes">
        {(data?.recent_entries?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="table-header">Funcionário</th>
                  <th className="table-header">Descrição</th>
                  <th className="table-header">Data</th>
                  <th className="table-header">Duração</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="table-cell font-medium text-gray-900">{e.user?.full_name}</td>
                    <td className="table-cell text-gray-600">{e.description || 'Sem descrição'}</td>
                    <td className="table-cell text-gray-600">{format(new Date(e.start_time), 'dd/MM/yyyy')}</td>
                    <td className="table-cell font-mono text-sm text-gray-700">{fmtHours(e.duration_seconds / 3600)}</td>
                    <td className="table-cell">
                      <Badge variant={approvalBadge[e.approval_status || 'pending']}>
                        {approvalLabels[e.approval_status || 'pending']}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem registros" description="Os registros de tempo aparecerão aqui" />
        )}
      </Card>
    </div>
  )
}

function ApprovalsTab() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rejectTarget, setRejectTarget] = useState<TimeEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hrApi.approvals({ status: filter })
      setEntries(data)
    } catch {
      toastError('Erro ao carregar aprovações')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleApprove = async (entry: TimeEntry) => {
    try {
      await hrApi.approve(entry.id, 'approve')
      toast('Registro aprovado')
      load()
    } catch {
      toastError('Erro ao aprovar registro')
    }
  }

  const handleReject = async (entry: TimeEntry) => {
    try {
      await hrApi.approve(entry.id, 'reject')
      toast('Registro reprovado')
      load()
    } catch {
      toastError('Erro ao reprovar registro')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            {approvalLabels[f]}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <Skeleton className="h-64" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<CheckCheck className="h-8 w-8" />}
            title={`Nenhum registro ${approvalLabels[filter].toLowerCase()}`}
            description="Os registros de tempo dos funcionários aparecerão aqui para análise"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="table-header">Funcionário</th>
                  <th className="table-header">Descrição</th>
                  <th className="table-header">Data</th>
                  <th className="table-header">Duração</th>
                  <th className="table-header">Status</th>
                  {filter === 'pending' && <th className="table-header">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="table-cell font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs">
                          {e.user?.full_name.charAt(0).toUpperCase()}
                        </div>
                        {e.user?.full_name}
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{e.description || 'Sem descrição'}</td>
                    <td className="table-cell text-gray-600">{format(new Date(e.start_time), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="table-cell font-mono text-sm text-gray-700">{fmtHours(e.duration_seconds / 3600)}</td>
                    <td className="table-cell">
                      <Badge variant={approvalBadge[e.approval_status || 'pending']}>
                        {approvalLabels[e.approval_status || 'pending']}
                      </Badge>
                    </td>
                    {filter === 'pending' && (
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApprove(e)}
                            className="p-1.5 rounded-lg hover:bg-green-50"
                            title="Aprovar"
                          >
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => setRejectTarget(e)}
                            className="p-1.5 rounded-lg hover:bg-red-50"
                            title="Reprovar"
                          >
                            <XCircle className="h-5 w-5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={rejectTarget !== null}
        title="Reprovar registro"
        message={rejectTarget ? `Deseja reprovar o registro de ${rejectTarget.user?.full_name} (${fmtHours(rejectTarget.duration_seconds / 3600)})?` : ''}
        confirmLabel="Reprovar"
        onClose={() => setRejectTarget(null)}
        onConfirm={() => rejectTarget && handleReject(rejectTarget)}
      />
    </div>
  )
}

function PointTab() {
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<PointSheetRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hrApi.pointSheet({ month })
      setRows(data)
    } catch {
      toastError('Erro ao carregar ponto')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    const rows2d: (string | number)[][] = []
    rows.forEach((r) => {
      rows2d.push([r.full_name, r.department || '-', r.total_hours, r.expected_hours, r.balance_hours])
    })
    exportCsv(`ponto-${month}.csv`, ['Funcionário', 'Departamento', 'Horas trabalhadas', 'Horas esperadas', 'Saldo'], rows2d)
  }

  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="label">Mês</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input" />
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card>
        {loading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<CalendarRange className="h-8 w-8" />} title="Sem dados para este mês" description="Cadastre funcionários e registros de tempo para gerar o ponto" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="table-header">Funcionário</th>
                  <th className="table-header">Departamento</th>
                  <th className="table-header">Horas</th>
                  <th className="table-header">Esperado</th>
                  <th className="table-header">Saldo</th>
                  <th className="table-header">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <>
                    <tr key={r.user_id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)}>
                      <td className="table-cell font-medium text-gray-900">{r.full_name}</td>
                      <td className="table-cell text-gray-600">{r.department || '-'}</td>
                      <td className="table-cell font-mono text-sm">{fmtHours(r.total_hours)}</td>
                      <td className="table-cell font-mono text-sm text-gray-500">{fmtHours(r.expected_hours)}</td>
                      <td className="table-cell">
                        <Badge variant={r.balance_hours >= 0 ? 'green' : 'red'}>
                          {r.balance_hours >= 0 ? '+' : ''}{fmtHours(r.balance_hours)}
                        </Badge>
                      </td>
                      <td className="table-cell text-gray-400">{r.days.length} dia(s)</td>
                    </tr>
                    {expanded === r.user_id && (
                      <tr key={`${r.user_id}-days`}>
                        <td colSpan={6} className="table-cell bg-gray-50/60">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {r.days.map((d) => (
                              <div key={d.date} className="bg-white rounded-xl border border-gray-100 p-3">
                                <p className="text-xs font-semibold text-gray-900">{format(new Date(`${d.date}T00:00:00`), 'dd/MM')}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {d.entries} registro(s) · {fmtHours(d.total_hours)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {d.first_entry ? fmtTime(d.first_entry) : '--'} → {d.last_exit ? fmtTime(d.last_exit) : '--'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function TimeBankTab() {
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<TimeBankRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hrApi.timeBank({ month })
      setRows(data)
    } catch {
      toastError('Erro ao carregar banco de horas')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    const rows2d: (string | number)[][] = rows.map((r) => [
      r.full_name, r.department || '-', r.worked_hours, r.expected_hours, r.balance_hours, r.overtime_hours, r.absences,
    ])
    exportCsv(`banco-horas-${month}.csv`, ['Funcionário', 'Departamento', 'Trabalhadas', 'Esperadas', 'Saldo', 'Extras', 'Faltas'], rows2d)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="label">Mês</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input" />
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card>
        {loading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8" />} title="Sem dados para este mês" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="table-header">Funcionário</th>
                  <th className="table-header">Departamento</th>
                  <th className="table-header">Trabalhadas</th>
                  <th className="table-header">Esperadas</th>
                  <th className="table-header">Saldo</th>
                  <th className="table-header">Extras</th>
                  <th className="table-header">Faltas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="table-cell font-medium text-gray-900">{r.full_name}</td>
                    <td className="table-cell text-gray-600">{r.department || '-'}</td>
                    <td className="table-cell font-mono text-sm">{fmtHours(r.worked_hours)}</td>
                    <td className="table-cell font-mono text-sm text-gray-500">{fmtHours(r.expected_hours)}</td>
                    <td className="table-cell">
                      <Badge variant={r.balance_hours >= 0 ? 'green' : 'red'}>
                        {r.balance_hours >= 0 ? '+' : ''}{fmtHours(r.balance_hours)}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      {r.overtime_hours > 0 ? (
                        <Badge variant="purple">{fmtHours(r.overtime_hours)}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {r.absences > 0 ? (
                        <Badge variant="red">{r.absences} dia(s)</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
