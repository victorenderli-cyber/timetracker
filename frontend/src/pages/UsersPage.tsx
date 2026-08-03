import { useState, useEffect, useCallback } from 'react'
import { usersApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { UserPlus, UserMinus, UserCheck, UserCog, Search, Pencil } from 'lucide-react'
import { User } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { toast, toastError } from '@/store/toastStore'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  employee: 'Funcionário',
}

const roleBadge: Record<string, 'purple' | 'blue' | 'green'> = {
  admin: 'purple',
  manager: 'blue',
  employee: 'green',
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [toggleUser, setToggleUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    cpf: '',
    department: '',
    position: '',
    hire_date: '',
    work_hours_per_day: '8',
    hourly_rate: '',
  })
  const currentUser = useAuthStore((s) => s.user)

  const load = useCallback(async () => {
    try {
      const data = await usersApi.list({ search: search || undefined })
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [load])

  const resetForm = () =>
    setForm({ full_name: '', email: '', password: '', role: 'employee', cpf: '', department: '', position: '', hire_date: '', work_hours_per_day: '8', hourly_rate: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await usersApi.create({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        cpf: form.cpf || undefined,
        department: form.department || undefined,
        position: form.position || undefined,
        hire_date: form.hire_date || undefined,
        work_hours_per_day: form.work_hours_per_day ? Number(form.work_hours_per_day) : undefined,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
      })
      setModalOpen(false)
      resetForm()
      toast('Usuário criado!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao criar usuário')
    }
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      cpf: user.cpf || '',
      department: user.department || '',
      position: user.position || '',
      hire_date: user.hire_date || '',
      work_hours_per_day: String(user.work_hours_per_day ?? 8),
      hourly_rate: user.hourly_rate ? String(user.hourly_rate) : '',
    })
    setModalOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      await usersApi.update(editingUser.id, {
        full_name: form.full_name,
        role: form.role as User['role'],
        cpf: form.cpf || undefined,
        department: form.department || undefined,
        position: form.position || undefined,
        hire_date: form.hire_date || undefined,
        work_hours_per_day: form.work_hours_per_day ? Number(form.work_hours_per_day) : undefined,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
      })
      setModalOpen(false)
      setEditingUser(null)
      toast('Usuário atualizado!')
      load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro ao atualizar usuário')
    }
  }

  const toggleActive = async (user: User) => {
    if (user.is_active) {
      await usersApi.deactivate(user.id)
      toast('Usuário desativado')
    } else {
      await usersApi.activate(user.id)
      toast('Usuário ativado')
    }
    load()
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-500">Gerencie funcionários e permissões</p>
        </div>
        <Button onClick={() => { setEditingUser(null); resetForm(); setModalOpen(true) }}>
          <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
        </Button>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-9"
            placeholder="Buscar por nome ou email..."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="table-header">Nome</th>
                <th className="table-header">Email</th>
                <th className="table-header">Papel</th>
                <th className="table-header">Status</th>
                <th className="table-header">Criado em</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">
                        {user.full_name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-400">(você)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{user.email}</td>
                  <td className="table-cell">
                    <Badge variant={roleBadge[user.role]}>{roleLabels[user.role]}</Badge>
                    {user.position && (
                      <p className="text-xs text-gray-400 mt-1">{user.position}</p>
                    )}
                  </td>
                  <td className="table-cell">
                    <Badge variant={user.is_active ? 'green' : 'red'}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="table-cell text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          if (user.id === currentUser?.id) {
                            toastError('Você não pode desativar sua própria conta')
                            return
                          }
                          setToggleUser(user)
                        }}
                        disabled={user.id === currentUser?.id}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                        title={user.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {user.is_active ? (
                          <UserMinus className="h-4 w-4 text-red-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <EmptyState
              icon={<UserCog className="h-8 w-8" />}
              title="Nenhum usuário encontrado"
              description="Ajuste a busca ou crie um novo usuário"
            />
          )}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingUser(null)
        }}
        title={editingUser ? 'Editar usuário' : 'Novo usuário'}
      >
        <form onSubmit={editingUser ? handleEdit : handleCreate} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              required
              disabled={!!editingUser}
            />
          </div>
          {!editingUser && (
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                minLength={8}
                required
              />
            </div>
          )}
          <div>
            <label className="label">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input"
            >
              <option value="employee">Funcionário</option>
              <option value="manager">Gestor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Dados de RH / DP</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CPF</label>
                <input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="input"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="input"
                  placeholder="Desenvolvedor"
                />
              </div>
              <div>
                <label className="label">Departamento</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input"
                  placeholder="Engenharia"
                />
              </div>
              <div>
                <label className="label">Data de admissão</label>
                <input
                  type="date"
                  value={form.hire_date}
                  onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Jornada diária (h)</label>
                <input
                  type="number"
                  value={form.work_hours_per_day}
                  onChange={(e) => setForm({ ...form, work_hours_per_day: e.target.value })}
                  className="input"
                  min={1}
                  max={24}
                  step="0.5"
                />
              </div>
              <div>
                <label className="label">Valor/h hora (R$)</label>
                <input
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditingUser(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">{editingUser ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={toggleUser !== null}
        title={toggleUser?.is_active ? 'Desativar usuário' : 'Ativar usuário'}
        message={toggleUser ? `Deseja ${toggleUser.is_active ? 'desativar' : 'ativar'} o usuário ${toggleUser.full_name}?` : ''}
        confirmLabel={toggleUser?.is_active ? 'Desativar' : 'Ativar'}
        variant={toggleUser?.is_active ? 'danger' : 'primary'}
        onClose={() => setToggleUser(null)}
        onConfirm={() => toggleUser && toggleActive(toggleUser)}
      />
    </div>
  )
}