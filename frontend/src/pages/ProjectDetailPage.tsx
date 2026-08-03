import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, usersApi, tasksApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ArrowLeft, UserMinus, Trash2, Plus, Users, Clock, CheckSquare } from 'lucide-react'
import { Project, ProjectMember, User, Task } from '@/types'
import { toast, toastError } from '@/store/toastStore'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee_id: '' })
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const [p, m, t] = await Promise.all([
        projectsApi.get(Number(projectId)),
        projectsApi.members(Number(projectId)),
        tasksApi.list({ project_id: Number(projectId) }),
      ])
      setProject(p)
      setMembers(m)
      setTasks(t)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
    usersApi.list().then(setUsers).catch(() => {})
  }, [load])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      await projectsApi.addMember(Number(projectId), { user_id: Number(selectedUser) })
      setAddMemberOpen(false)
      setSelectedUser('')
      toast('Membro adicionado!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao adicionar membro')
    }
  }

  const handleRemoveMember = async (userId: number) => {
    await projectsApi.removeMember(Number(projectId), userId)
    toast('Membro removido')
    load()
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await tasksApi.create({
      title: taskForm.title,
      description: taskForm.description || undefined,
      project_id: Number(projectId),
      assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : undefined,
    })
    setTaskModalOpen(false)
    setTaskForm({ title: '', description: '', assignee_id: '' })
    toast('Tarefa criada!')
    load()
  }

  const handleDeleteTask = async (taskId: number) => {
    await tasksApi.delete(taskId)
    toast('Tarefa excluída')
    load()
  }

  if (loading) return <PageSkeleton />
  if (!project) return <div className="text-gray-500">Projeto não encontrado</div>

  const availableUsers = users.filter(
    (u) => !members.some((m) => m.user_id === u.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-lg hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500">{project.description || 'Sem descrição'}</p>
            </div>
          </div>
        </div>
        <Badge variant={project.is_active ? 'green' : 'gray'}>
          {project.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center">
          <Users className="h-5 w-5 text-primary-600 mx-auto mb-1" />
          <p className="text-sm text-gray-500">Membros</p>
          <p className="text-2xl font-bold text-gray-900">{members.length}</p>
        </Card>
        <Card className="text-center">
          <CheckSquare className="h-5 w-5 text-primary-600 mx-auto mb-1" />
          <p className="text-sm text-gray-500">Tarefas</p>
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
        </Card>
        <Card className="text-center">
          <Clock className="h-5 w-5 text-primary-600 mx-auto mb-1" />
          <p className="text-sm text-gray-500">Horas registradas</p>
          <p className="text-2xl font-bold text-gray-900">{project.total_hours || 0}h</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Members */}
        <Card
          title="Membros"
          action={
            <Button size="sm" variant="secondary" onClick={() => setAddMemberOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          }
        >
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                    {member.user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{member.user.full_name}</p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'owner' ? 'purple' : 'blue'}>
                    {member.role === 'owner' ? 'Dono' : member.role}
                  </Badge>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => setRemoveMemberId(member.user_id)}
                      className="p-1.5 rounded-lg hover:bg-red-50"
                      title="Remover"
                    >
                      <UserMinus className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="Sem membros"
                description="Adicione usuários a este projeto"
              />
            )}
          </div>
        </Card>

        {/* Tasks */}
        <Card
          title="Tarefas"
          action={
            <Button size="sm" variant="secondary" onClick={() => setTaskModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova tarefa
            </Button>
          }
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    {task.assignee ? task.assignee.full_name : 'Sem responsável'} · {task.total_hours || 0}h
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.status === 'done' ? 'green' : 'blue'}>
                    {task.status === 'done' ? 'Concluído' : 'A fazer'}
                  </Badge>
                  <button
                    onClick={() => setDeleteTaskId(task.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <EmptyState
                icon={<CheckSquare className="h-8 w-8" />}
                title="Nenhuma tarefa"
                description="Crie a primeira tarefa deste projeto"
              />
            )}
          </div>
        </Card>
      </div>

      {/* Add member modal */}
      <Modal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Adicionar membro">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="label">Usuário</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="input"
              required
            >
              <option value="">Selecione um usuário</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Todos os usuários já são membros</p>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddMemberOpen(false)}>Cancelar</Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </Modal>

      {/* Create task modal */}
      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Nova tarefa">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div>
            <label className="label">Responsável</label>
            <select
              value={taskForm.assignee_id}
              onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
              className="input"
            >
              <option value="">Sem responsável</option>
              {members.map((m) => (
                <option key={m.id} value={m.user_id}>{m.user.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={removeMemberId !== null}
        title="Remover membro"
        message="Deseja remover este membro do projeto?"
        confirmLabel="Remover"
        onClose={() => setRemoveMemberId(null)}
        onConfirm={() => removeMemberId && handleRemoveMember(removeMemberId)}
      />

      <ConfirmDialog
        isOpen={deleteTaskId !== null}
        title="Excluir tarefa"
        message="Deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onClose={() => setDeleteTaskId(null)}
        onConfirm={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
      />
    </div>
  )
}