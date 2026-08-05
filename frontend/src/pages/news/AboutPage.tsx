import { Link } from 'react-router-dom'
import { Info, Newspaper, Timer, Github } from 'lucide-react'

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1120]">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <Info className="h-5 w-5 text-primary-600" /> Carreira & Trabalho
          </Link>
          <Link to="/" className="text-sm text-primary-600 hover:underline">← Voltar</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 text-gray-700 dark:text-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Sobre</h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary-600" /> O que é
            </h2>
            <p>
              O <strong>Carreira & Trabalho</strong> é um agregador de notícias focado no mercado de trabalho
              brasileiro: concursos, vagas de emprego, salários, carreira e economia. Reunimos em um só lugar
              o que é publicado por veículos de imprensa em seus feeds públicos, atualizado automaticamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Como funciona</h2>
            <p>
              Nossos servidores consultam periodicamente os feeds RSS das fontes parceiras, filtram as
              notícias relacionadas a trabalho e emprego, eliminam duplicatas e organizam o conteúdo por
              categorias — tudo de forma automática. As notícias abrem sempre na página original da fonte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary-600" /> O aplicativo TimeTracker
            </h2>
            <p>
              O mesmo projeto também oferece o <strong>TimeTracker</strong>, um aplicativo gratuito de
              monitoramento de horas de trabalho, disponível para Android e para uso direto no navegador.
              Ele foi criado para ajudar profissionais a registrar suas atividades, projetos e horas
              trabalhadas de forma simples.
            </p>
            <p className="mt-3">
              Você pode baixar o aplicativo Android na página de download do site, ou abrir o app diretamente
              pelo botão "Abrir app" na página inicial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Projeto aberto</h2>
            <p className="flex items-center gap-2">
              <Github className="h-4 w-4" /> O código-fonte do projeto é público e está disponível no GitHub:
            </p>
            <a
              href="https://github.com/victorenderli-cyber/timetracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-primary-600 underline break-all"
            >
              https://github.com/victorenderli-cyber/timetracker
            </a>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fontes</h2>
            <p>
              As notícias são coletadas de feeds públicos de veículos como Agência Brasil, Exame, Gazeta do
              Povo e G1. O conteúdo é reproduzido integralmente a título informativo, com link para a fonte
              original em todas as matérias.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contato</h2>
            <p>
              Quer sugerir uma fonte, reportar um problema ou falar com a gente? Utilize o formulário de
              cadastro na página inicial ou os canais da página de download.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
