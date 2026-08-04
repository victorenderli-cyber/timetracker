import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Mail, Lock, X, Timer } from 'lucide-react'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      onClose()
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center mb-2">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-3 rounded-2xl shadow-lg shadow-primary-600/30">
            <Timer className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-1">Acessar seus projetos</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
          Entre para usar o TimeTracker
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label text-gray-700 dark:text-gray-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input !pl-10"
                placeholder="voce@empresa.com"
                autoFocus
                required
              />
            </div>
          </div>
          <div>
            <label className="label text-gray-700 dark:text-gray-300">Senha</label>
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
      </div>
    </div>
  )
}