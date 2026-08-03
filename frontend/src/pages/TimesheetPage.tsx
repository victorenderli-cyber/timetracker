import { useState, useEffect, useCallback } from 'react'
import { timeEntriesApi, projectsApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Trash2, Pencil, Plus, Download, ClipboardList } from 'lucide-react'
import { TimeEntry, Project } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { exportCsv } from '@/utils/csv'
import { toast, toastError } from '@/store/toastStore'

export function TimesheetPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ description: '', start_time: '', end_time: '' })
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState({ description: '', project_id: '', start_time: '', end_time: '', is_billable: true })

  const load = useCallback(async () => {
    try {
      const [data, projectsData] = await Promise.all([
        timeEntriesApi.list({
          limit: 200,
          project_id: projectFilter ? Number(projectFilter) : undefined,
          start_date: dateFilter || undefined,
          end_date: endDateFilter || undefined,
        }),
        projectsApi.list(),
      ])
      setEntries(data)
      setProjects(projectsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [projectFilter, dateFilter, endDateFilter])

  useEffect(() => { load() }, [load])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const totalSeconds = entries.reduce((acc, e) => acc + e.duration_seconds, 0)

  const handleExport = () => {
    exportCsv(
      `timesheet-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Descrição', 'Projeto', 'Tarefa', 'Início', 'Fim', 'Duração (h)', 'Faturável'],
      entries.map((e) => [
        e.description || '',
        e.project?.name || '',
        e.task?.title || '',
        format(new Date(e.start_time), 'dd/MM/yyyy HH:mm'),
        e.end_time ? format(new Date(e.end_time), 'dd/MM/yyyy HH:mm') : '',
        (e.duration_seconds / 3600).toFixed(2),
        e.is_billable ? 'Sim' : 'Não',
      ])
    )
  }

  const openEdit = (entry: TimeEntry) => {
    setEditing(entry)
    setForm({
      description: entry.description || '',
      start_time: new Date(entry.start_time).toISOString().slice(0, 16),
      end_time: entry.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    await timeEntriesApi.update(editing.id, {
      description: form.description,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
    })
    setEditing(null)
    toast('Registro atualizado!')
    load()
  }

  const handleDelete = async (id: number) => {
    await timeEntriesApi.delete(id)
    toast('Registro excluído')
    load()
  }

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.end_time) {
      toastError('Informe a data de fim')
      return
    }
    try {
      const entry = await timeEntriesApi.start({
        description: manualForm.description || undefined,
        project_id: manualForm.project_id ? Number(manualForm.project_id) : undefined,
        is_billable: manualForm.is_billable,
      })
      await timeEntriesApi.stop(entry.id)
      await timeEntriesApi.update(entry.id, {
        start_time: new Date(manualForm.start_time).toISOString(),
        end_time: new Date(manualForm.end_time).toISOString(),
      })
      setManualOpen(false)
      setManualForm({ description: '', project_id: '', start_time: '', end_time: '', is_billable: true })
      toast('Registro salvo!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao salvar o registro')
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
          <p className="text-gray-500">Histórico de registros de tempo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Button onClick={() => setManualOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Registrar manualmente
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div>
            <label className="label">Projeto</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input"
            >
              <option value="">Todos os projetos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data de início</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data de fim</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 p-3 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-700 font-medium">
            {entries.length} registros no total
          </p>
          <p className="text-sm text-primary-700 font-bold">
            Total: {formatDuration(totalSeconds)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="table-header">Descrição</th>
                <th className="table-header">Projeto</th>
                <th className="table-header">Início</th>
                <th className="table-header">Fim</th>
                <th className="table-header">Duração</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell font-medium text-gray-900">
                    {entry.description || 'Sem descrição'}
                  </td>
                  <td className="table-cell text-gray-600">{entry.project?.name || '-'}</td>
                  <td className="table-cell text-gray-600">
                    {format(new Date(entry.start_time), 'dd/MM HH:mm', { locale: ptBR })}
                  </td>
                  <td className="table-cell text-gray-600">
                    {entry.end_time ? format(new Date(entry.end_time), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                  </td>
                  <td className="table-cell font-mono text-sm text-gray-700">
                    {formatDuration(entry.duration_seconds)}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(entry)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                      <button onClick={() => setDeleteId(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="Nenhum registro encontrado"
              description="Ajuste os filtros ou registre tempo manualmente"
            />
          )}
        </div>
      </Card>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar registro">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="label">Descrição</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Início</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Fim</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={manualOpen} onClose={() => setManualOpen(false)} title="Registrar tempo manualmente">
        <form onSubmit={handleManualCreate} className="space-y-4">
          <div>
            <label className="label">Descrição</label>
            <input
              value={manualForm.description}
              onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
              className="input"
              placeholder="Ex: Reunião de planejamento"
              required
            />
          </div>
          <div>
            <label className="label">Projeto</label>
            <select
              value={manualForm.project_id}
              onChange={(e) => setManualForm({ ...manualForm, project_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Selecione um projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Início</label>
              <input
                type="datetime-local"
                value={manualForm.start_time}
                onChange={(e) => setManualForm({ ...manualForm, start_time: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Fim</label>
              <input
                type="datetime-local"
                value={manualForm.end_time}
                onChange={(e) => setManualForm({ ...manualForm, end_time: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={manualForm.is_billable}
              onChange={(e) => setManualForm({ ...manualForm, is_billable: e.target.checked })}
              className="h-4 w-4 text-primary-600 rounded"
            />
            <label className="text-sm text-gray-700">Faturável</label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar registro</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Excluir registro"
        message="Deseja excluir este registro de tempo? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </div>
  )
}