import { useState, useEffect, useCallback } from 'react'
import { tasksApi, projectsApi, usersApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Plus, CheckSquare, Trash2, Pencil, ListChecks } from 'lucide-react'
import { Task, Project, User } from '@/types'
import { toast, toastError } from '@/store/toastStore'

type TaskStatus = Task['status']

const statusColors: Record<string, 'blue' | 'yellow' | 'purple' | 'green' | 'gray'> = {
  todo: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  done: 'green',
}

const statusLabels: Record<string, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Revisão',
  done: 'Concluído',
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    status: 'todo',
    priority: 0,
    assignee_id: '',
  })

  const load = useCallback(async () => {
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        tasksApi.list({
          status: statusFilter || undefined,
          project_id: projectFilter ? Number(projectFilter) : undefined,
        }),
        projectsApi.list(),
        usersApi.list(),
      ])
      setTasks(tasksData)
      setProjects(projectsData)
      setUsers(usersData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectFilter])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await tasksApi.create({
        title: form.title,
        description: form.description || undefined,
        project_id: Number(form.project_id),
        status: form.status as TaskStatus,
        priority: form.priority,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
})

      setModalOpen(false)
      setForm({ title: '', description: '', project_id: '', status: 'todo', priority: 0, assignee_id: '' })
      toast('Tarefa criada!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao criar a tarefa')
    }
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      project_id: String(task.project_id),
      status: task.status,
      priority: task.priority ?? 0,
      assignee_id: task.assignee_id ? String(task.assignee_id) : '',
    })
    setModalOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    try {
      await tasksApi.update(editingTask.id, {
        title: form.title,
        description: form.description || undefined,
        project_id: Number(form.project_id),
        status: form.status as TaskStatus,
        priority: form.priority,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
      })
      setModalOpen(false)
      setEditingTask(null)
      toast('Tarefa atualizada!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao atualizar a tarefa')
    }
  }
  const handleStatusChange = async (task: Task, status: string) => {
    await tasksApi.update(task.id, { status: status as TaskStatus })
    load()
  }

  const handleDelete = async (task: Task) => {
    await tasksApi.delete(task.id)
    toast('Tarefa excluída')
    load()
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-gray-500">Gerencie suas tarefas</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setForm({ title: '', description: '', project_id: '', status: 'todo', priority: 0, assignee_id: '' }); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Nova tarefa
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">Todos os status</option>
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="review">Revisão</option>
              <option value="done">Concluído</option>
            </select>
          </div>
          <div className="flex-1">
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
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary-600" />
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{task.project?.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(task)}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4 text-gray-500" />
                </button>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task, e.target.value)}
                  className="input !w-auto !py-1 text-sm"
                >
                  <option value="todo">A fazer</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="review">Revisão</option>
                  <option value="done">Concluído</option>
                </select>
                <button
                  onClick={() => setDeleteTask(task)}
                  className="p-1.5 rounded-lg hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <Badge variant={statusColors[task.status] || 'gray'}>
                  {statusLabels[task.status] || task.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  {task.total_hours || 0}h registradas
                </span>
              </div>
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs">
                    {task.assignee.full_name.charAt(0).toUpperCase()}
                  </div>
                  {task.assignee.full_name}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card>
          <EmptyState
            icon={<ListChecks className="h-8 w-8" />}
            title="Nenhuma tarefa encontrada"
            description="Crie uma nova tarefa ou ajuste os filtros"
            actionLabel="Nova tarefa"
            onAction={() => { setEditingTask(null); setForm({ title: '', description: '', project_id: '', status: 'todo', priority: 0, assignee_id: '' }); setModalOpen(true) }}
          />
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingTask(null)
        }}
        title={editingTask ? 'Editar tarefa' : 'Nova tarefa'}
      >
        <form onSubmit={editingTask ? handleEdit : handleSubmit} className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Projeto</label>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Selecione um projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Responsável</label>
            <select
              value={form.assignee_id}
              onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
              className="input"
            >
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditingTask(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">{editingTask ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTask !== null}
        title="Excluir tarefa"
        message={deleteTask ? `Deseja excluir a tarefa "${deleteTask.title}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        onClose={() => setDeleteTask(null)}
        onConfirm={() => deleteTask && handleDelete(deleteTask)}
      />
    </div>
  )
}