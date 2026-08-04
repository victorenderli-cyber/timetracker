import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Plus, Pencil, Trash2, Users, Clock, ExternalLink, FolderKanban } from 'lucide-react'
import { Project } from '@/types'
import { toast, toastError } from '@/store/toastStore'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6' })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', color: '#3B82F6' })
    setModalOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditing(project)
    setForm({ name: project.name, description: project.description || '', color: project.color })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await projectsApi.update(editing.id, form)
        toast('Projeto atualizado!')
      } else {
        await projectsApi.create(form)
        toast('Projeto criado!')
      }
      setModalOpen(false)
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao salvar o projeto')
    }
  }

  const handleDelete = async (id: number) => {
    await projectsApi.delete(id)
    toast('Projeto excluído')
    load()
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500">Gerencie seus projetos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (          <Card key={project.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
                <button
                  onClick={() => navigate(`/app/projects/${project.id}`)}
                  className="font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {project.name}
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => navigate(`/app/projects/${project.id}`)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Ver detalhes">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                </button>
                <button onClick={() => openEdit(project)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <Pencil className="h-4 w-4 text-gray-500" />
                </button>
                <button onClick={() => setDeleteId(project.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {project.members_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {project.total_hours || 0}h
              </span>
              <Badge variant={project.is_active ? 'green' : 'gray'}>
                {project.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto para começar a registrar horas"
            actionLabel="Criar projeto"
            onAction={openCreate}
          />
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar projeto' : 'Novo projeto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
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
          <div>
            <label className="label">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-16 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{form.color}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Excluir projeto"
        message="Esta ação não pode ser desfeita. O projeto e seus registros de tempo serão removidos."
        confirmLabel="Excluir"
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </div>
  )
}