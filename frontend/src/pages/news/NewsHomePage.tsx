import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNews, NewsItem, NewsResponse } from '@/api/news'
import { AdSlot } from '@/components/ad/AdSlot'
import { LoginModal } from '@/components/LoginModal'
import { useAuthStore } from '@/store/authStore'
import { Timer, Newspaper, Briefcase, LogIn } from 'lucide-react'

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RelatedSidebar({ items }: { items: NewsItem[] }) {
  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <div className="sticky top-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Mais lidas</h3>
          <ol className="space-y-4">
            {items.slice(0, 5).map((item, i) => (
              <li key={i}>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 group">
                  <span className="font-bold text-2xl text-gray-300 group-hover:text-primary-500 transition-colors leading-none">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 leading-snug">
                    {item.title}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
        <AdSlot slotId="YYYYYYYYYYYY" format="rectangle" />
      </div>
    </aside>
  )
}

export function NewsHomePage() {
  const [data, setData] = useState<NewsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    fetchNews(30)
      .then((res) => {
        setData(res)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const featured = data?.items?.[0]
  const rest = data?.items?.slice(1) ?? []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120]">
      {/* Topo */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white leading-tight">Carreira & Trabalho</div>
              <div className="text-[11px] text-gray-500 -mt-0.5">Notícias do mercado</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-primary-600 font-semibold dark:text-primary-400">Notícias</span>
            <Link to="/download" className="hover:text-primary-600">App</Link>
            <Link to="/privacidade" className="hover:text-primary-600">Privacidade</Link>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/25"
              >
                <Timer className="h-4 w-4" /> Meus projetos
              </Link>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/25"
              >
                <LogIn className="h-4 w-4" /> Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-700 dark:text-red-300">
            Não foi possível carregar as notícias agora. Tente novamente em instantes.
          </div>
        )}

        {data && !error && (
          <>
            {/* Destaque */}
            {featured && (
              <a
                href={featured.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6 lg:p-10 shadow-lg hover:shadow-xl transition-shadow mb-6"
              >
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary-300 mb-3">
                  {featured.source}
                </span>
                <h1 className="text-2xl lg:text-4xl font-bold leading-tight mb-3 max-w-3xl">{featured.title}</h1>
                {featured.description && <p className="text-gray-300 max-w-3xl line-clamp-3">{featured.description}</p>}
                <div className="text-sm text-gray-400 mt-3">{formatDate(featured.published_at)}</div>
              </a>
            )}

            {/* Corpo */}
            <div className="flex gap-6">
              <div className="flex-1 min-w-0 space-y-5">
                {rest.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
                      <span className="inline-flex items-center gap-1 text-primary-600 font-semibold">
                        <Briefcase className="h-3 w-3" /> {item.source}
                      </span>
                      <span>·</span>
                      <span>{formatDate(item.published_at)}</span>
                    </div>
                    <h2 className="font-semibold text-gray-900 dark:text-white leading-snug mb-1 group-hover:text-primary-700">
                      {item.title}
                    </h2>
                    {item.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                    )}
                  </a>
                ))}
              </div>

              <RelatedSidebar items={rest} />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-2">
          <p className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4" /> Carreira & Trabalho — agregador de notícias do mercado de trabalho
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacidade" className="hover:text-primary-600">Política de Privacidade</Link>
            <a href="/download" className="hover:text-primary-600">Baixar o app</a>
          </div>
          <p className="text-xs text-gray-400">
            Conteúdos reproduzidos integralmente de suas fontes originais, a título informativo.
          </p>
        </div>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}