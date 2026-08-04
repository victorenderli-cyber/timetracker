import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Timer, Download, Smartphone, Globe, QrCode } from 'lucide-react'

const APK_URL = 'https://github.com/victorenderli-cyber/timetracker/releases/download/v1.0.0/TimeTracker-v1.0.apk'
const QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(APK_URL)

export function DownloadPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative max-w-4xl mx-auto px-6 py-16 text-white">
        <div className="flex flex-col items-center mb-12">
          <div className="bg-white/10 backdrop-blur p-4 rounded-3xl shadow-2xl mb-5">
            <Timer className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold text-center mb-2">TimeTracker</h1>
          <p className="text-lg text-white/80 text-center max-w-md">
            Controle suas horas de trabalho no celular e na web. Funciona em qualquer lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* App Android */}
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-gray-900 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-3 rounded-2xl">
                <Smartphone className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">App Android</h2>
            </div>
            <p className="text-gray-500 mb-4">Instale o app no seu celular:</p>
            <a
              href={APK_URL}
              className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors mb-4 shadow-lg shadow-primary-600/30"
            >
              <Download className="h-5 w-5" /> Baixar APK (grátis)
            </a>
            <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl p-4">
              <img src={QR_URL} alt="QR code para instalar o app" className="w-36 h-36 rounded-lg" />
              <div className="text-sm text-gray-500">
                <QrCode className="h-5 w-5 mb-1" />
                Escaneie com a câmera do celular para baixar e instalar.
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              No primeiro acesso, o Android pedirá permissão para "Instalar de fontes
              desconhecidas" — basta aceitar.
            </p>
          </div>

          {/* Versão web */}
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-gray-900 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-3 rounded-2xl">
                <Globe className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">Usar na Web</h2>
            </div>
            <p className="text-gray-500 mb-4">
              Não quer instalar nada? Acesse direto pelo navegador do computador ou celular.
            </p>
            <div className="space-y-3">
              <Button className="w-full !py-3" onClick={() => navigate('/register')}>
                Criar conta
              </Button>
              <Button variant="secondary" className="w-full !py-3" onClick={() => navigate('/login')}>
                Já tenho conta — Entrar
              </Button>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">O que você pode fazer?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Registrar e controlar horas de trabalho</li>
                <li>Criar projetos e tarefas</li>
                <li>Gerar relatórios e folhas de ponto</li>
                <li>Gestão de RH para gerentes</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-white/60 text-sm mt-10">
          <Link to="/login" className="hover:underline">Já é da equipe? Entrar</Link>
        </div>
      </div>
    </div>
  )
}