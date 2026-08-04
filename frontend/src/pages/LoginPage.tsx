import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Timer, Mail, Lock } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer login')
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
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">TimeTracker</h1>
          <p className="text-center text-gray-500 mb-8">Entre para registrar seu tempo de trabalho</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm animate-fade-in flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full !py-2.5" loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Criar conta
            </Link>
          </div>
          <div className="mt-4 text-center text-xs text-gray-400">
            Conta admin de teste: admin@timetracker.com / admin123
          </div>
        </div>
      </div>
    </div>
  )
}