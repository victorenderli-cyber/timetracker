import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Timer, Mail, Lock, User, Briefcase } from 'lucide-react'

export function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<'manager' | 'employee'>('employee')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register({ email, full_name: fullName, password, role })
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-900">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative w-full max-w-md m-auto px-6 py-10">
        <div className="bg-white/95 backdrop-blur p-8 rounded-3xl shadow-2xl animate-slide-up">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-3 rounded-2xl shadow-lg shadow-primary-600/30">
              <Timer className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Criar conta</h1>
          <p className="text-center text-gray-500 mb-8">Cadastre-se para registrar seu tempo de trabalho</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm animate-fade-in flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-gray-700">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input !pl-10"
                  placeholder="Seu nome"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input !pl-10"
                  placeholder="voce@empresa.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label text-gray-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input !pl-10"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label text-gray-700">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input !pl-10"
                  placeholder="Repita a senha"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label text-gray-700">Cargo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('employee')}
                  className={`flex flex-col items-center gap-1 border-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    role === 'employee'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <User className="h-5 w-5" />
                  Funcionário
                </button>
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`flex flex-col items-center gap-1 border-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    role === 'manager'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Briefcase className="h-5 w-5" />
                  Gerente
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full !py-2.5" loading={loading}>
              Criar conta
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}