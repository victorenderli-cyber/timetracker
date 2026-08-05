import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1120]">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <FileText className="h-5 w-5 text-primary-600" /> Carreira & Trabalho
          </Link>
          <Link to="/" className="text-sm text-primary-600 hover:underline">← Voltar</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 text-gray-700 dark:text-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Termos de Uso</h1>
        <p className="mb-6 text-sm text-gray-500">Última atualização: agosto de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. Aceitação dos termos</h2>
            <p>
              Ao acessar e utilizar o site <strong>Carreira & Trabalho</strong>, você concorda com estes Termos
              de Uso. Se não concordar com alguma parte, pedimos que não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. Conteúdo e fontes</h2>
            <p>
              As notícias exibidas são reproduzidas a partir de feeds públicos (RSS) de veículos de imprensa,
              a título informativo. Todo o conteúdo permanece de propriedade de suas respectivas fontes. Os
              links para leitura completa apontam sempre para a página original, e recomendamos a consulta
              direta da fonte para informações oficiais e atualizadas.
            </p>
            <p className="mt-3">
              Não garantimos a exatidão, integralidade ou atualidade das informações reproduzidas, que são
              fornecidas pelas fontes terceiras.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. Uso do site</h2>
            <p>
              É proibido usar o site para fins ilegais, para violar direitos de terceiros, para tentar
              acessar áreas restritas ou para realizar coletas automatizadas em escala (scraping) que
              sobrecarreguem a infraestrutura.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">4. Cadastro voluntário</h2>
            <p>
              O preenchimento dos formulários de cadastro, newsletter e pesquisa é opcional. Ao fornecer seus
              dados, você se compromete a informar dados verdadeiros e é responsável pela veracidade deles.
              Consulte nossa Política de Privacidade para saber como tratamos seus dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">5. Aplicativo (TimeTracker)</h2>
            <p>
              O aplicativo de monitoramento de horas vinculado ao portal é fornecido no estado em que se
              encontra ("as is"), sem garantias de disponibilidade contínua. Os dados lançados no aplicativo
              são armazenados em nossos servidores e devem ser usados apenas para fins lícitos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">6. Limitação de responsabilidade</h2>
            <p>
              O Carreira & Trabalho não é responsável por decisões tomadas com base no conteúdo informativo
              exibido, tampouco por danos decorrentes do uso do site ou do aplicativo, dentro dos limites
              permitidos pela legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">7. Alterações</h2>
            <p>
              Podemos atualizar estes Termos de Uso periodicamente. A versão vigente estará sempre disponível
              nesta página, e o uso continuado do site após alterações implica concordância com os novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">8. Contato</h2>
            <p>
              Dúvidas sobre estes Termos ou sobre a Política de Privacidade podem ser enviadas pelo painel do
              site ou pelo formulário de contato da página de download do aplicativo.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
