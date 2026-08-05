import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchNews, NewsItem, NewsResponse, NEWS_CATEGORIES, NewsCategory } from '@/api/news'
import { AdSlot } from '@/components/ad/AdSlot'
import { DataCollection } from '@/components/news/DataCollection'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { Timer, Newspaper, Briefcase, Search, ExternalLink, ChevronDown, ImageOff, Sun, Moon } from 'lucide-react'
import { cn } from '@/utils/cn'

const PAGE_SIZE = 12

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const categoryColors: Record<string, string> = {
  Concursos: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Vagas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Salários': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Carreira: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Economia: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Trabalho: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
}

function CategoryBadge({ category }: { category?: NewsCategory }) {
  const cat = category || 'Trabalho'
  return (
    <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', categoryColors[cat] || categoryColors.Trabalho)}>
      {cat}
    </span>
  )
}

function NewsImage({ src, title }: { src?: string | null; title: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        <ImageOff className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  )
}

function RelatedSidebar({ items }: { items: NewsItem[] }) {
  return (
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <div className="sticky top-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Mais recentes</h3>
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const demoLogin = useAuthStore((s) => s.demoLogin)
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  const openApp = async () => {
    if (!isAuthenticated) {
      try {
        await demoLogin()
      } catch {
        // segue para o app mesmo assim
      }
    }
    navigate('/app')
  }

  // Estado de filtro/busca
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'Todos'>('Todos')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchNews(100)
      .then((res) => {
        setData(res)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data?.items) return []
    const q = query.trim().toLowerCase()
    return data.items.filter((item) => {
      if (activeCategory !== 'Todos' && item.category !== activeCategory) return false
      if (q && !`${item.title} ${item.description} ${item.source}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, query, activeCategory])

  const featured = filtered[0]
  const rest = filtered.slice(1)
  const shown = rest.slice(0, visible)
  const hasMore = visible < rest.length

  const resetView = () => {
    setVisible(PAGE_SIZE)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120]">
      {/* Topo */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
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
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={openApp}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/25"
            >
              <Timer className="h-4 w-4" /> Abrir app
            </button>
          </div>
        </div>
      </header>

      {/* Barra de busca + filtros */}
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetView() }}
              placeholder="Buscar notícias..."
              className="input !pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['Todos', ...NEWS_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); resetView() }}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors border',
                  activeCategory === cat
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400'
                )}
              >
                {cat === 'Todos' ? 'Todas' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {!loading && !error && data && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {new Set((data.feeds || []).map((f) => f.name)).size} fontes ativas
            </span>
            <span>{data.count} notícias</span>
            {filtered.length > 0 && filtered.length !== data.count && (
              <span>
                · {filtered.length} resultado{filtered.length === 1 ? '' : 's'} para a busca
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
            <p className="text-red-700 dark:text-red-300 mb-3">
              Não foi possível carregar as notícias agora. Tente novamente em instantes.
            </p>
            <button
              onClick={() => { setLoading(true); setError(null); fetchNews(100).then((res) => { setData(res); setError(null) }).catch((e) => setError(e.message)).finally(() => setLoading(false)) }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Nenhuma notícia encontrada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Não encontramos resultados para "{query}"{activeCategory !== 'Todos' ? ` em ${activeCategory}` : ''}. Tente
              outra palavra ou limpe os filtros.
            </p>
            <button
              onClick={() => { setQuery(''); setActiveCategory('Todos'); resetView() }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Destaque */}
            {featured && (
              <a
                href={featured.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow mb-7 group"
              >
                <div className="grid lg:grid-cols-2">
                  <div className="h-56 lg:h-auto news-hero-image">
                    <NewsImage src={featured.image} title={featured.title} />
                  </div>
                  <div className="p-6 lg:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryBadge category={featured.category} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {featured.source}
                      </span>
                    </div>
                    <h1 className="text-2xl lg:text-4xl font-bold leading-tight mb-3">{featured.title}</h1>
                    {featured.description && <p className="text-gray-300 max-w-xl line-clamp-3">{featured.description}</p>}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-400">{formatDate(featured.published_at)}</div>
                      <span className="inline-flex items-center gap-1 text-sm text-primary-300 group-hover:text-primary-200">
                        Ler mais <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Corpo */}
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shown.map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ['--stagger' as any]: Math.min(i, 12) }}
                      className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-stagger"
                    >
                      <div className="h-40 news-card-image">
                        <NewsImage src={item.image} title={item.title} />
                      </div>
                      <div className="flex flex-col flex-1 p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <CategoryBadge category={item.category} />
                          <span className="text-[11px] text-gray-400">{formatDate(item.published_at)}</span>
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-white leading-snug mb-1 group-hover:text-primary-700 dark:group-hover:text-primary-300 line-clamp-2">
                          {item.title}
                        </h2>
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{item.description}</p>
                        )}
                        <div className="mt-auto flex items-center gap-1 text-[11px] text-gray-400">
                          <Briefcase className="h-3 w-3" /> {item.source}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-400 text-gray-700 dark:text-gray-200 text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
                    >
                      Carregar mais <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <RelatedSidebar items={filtered.slice(1)} />
            </div>
          </>
        )}
      </main>

      <DataCollection />

      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-6 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-2">
          <p className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4" /> Carreira & Trabalho — agregador de notícias do mercado de trabalho
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacidade" className="hover:text-primary-600">Política de Privacidade</Link>
            <a href="/download" className="hover:text-primary-600">Baixar o app</a>
            <Link to="/admin" className="text-gray-400 hover:text-primary-600" title="Painel de dados">Painel</Link>
          </div>
          <p className="text-xs text-gray-400">
            Conteúdos reproduzidos integralmente de suas fontes originais, a título informativo.
          </p>
        </div>
      </footer>
    </div>
  )
}