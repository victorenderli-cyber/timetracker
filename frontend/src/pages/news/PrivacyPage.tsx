import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1120]">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-primary-600" /> Carreira & Trabalho
          </Link>
          <Link to="/" className="text-sm text-primary-600 hover:underline">← Voltar</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 text-gray-700 dark:text-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Política de Privacidade</h1>
        <p className="mb-6 text-sm text-gray-500">Última atualização: agosto de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. Dados que coletamos</h2>
            <p>
              O site <strong>Carreira & Trabalho</strong> agrega notícias do mercado de trabalho a partir de
              feeds públicos (RSS) de veículos de imprensa. Não coletamos informações pessoais para publicar
              as notícias exibidas na home. As notícias são abertas sempre na página original da fonte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. Publicidade e cookies</h2>
            <p>
              Este site pode exibir anúncios do Google AdSense. O Google e seus parceiros podem usar cookies
              para exibir anúncios com base nas visitas anteriores a este e a outros sites. Você pode optar
              por desativar a publicidade personalizada em{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                https://www.google.com/settings/ads
              </a>
              .
            </p>
            <p className="mt-3">
              Tap ainda assim pode permitir que o Google e seus parceiros usem cookies para fins de medição
              e publicidade. Consulte a{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                Política de Privacidade do Google
              </a>{' '}
              para mais detalhes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. App móvel (TimeTracker)</h2>
            <p>
              No aplicativo Android <strong>TimeTracker</strong> (monitoramento de horas de trabalho), os
              dados fornecidos pelos usuários (nome, e-mail, controle de horas) são armazenados de forma
              segura em servidores próprios e utilizados apenas para o funcionamento do sistema e folha de
              ponto. Não compartilhamos esses dados com terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">4. Contato</h2>
            <p>
              Para dúvidas sobre esta política ou sobre seus dados, entre em contato pelo endereço indicado
              pelo administrador do site.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}