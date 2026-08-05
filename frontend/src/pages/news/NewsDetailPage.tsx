import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchNewsItem, NewsItem } from '@/api/news'
import { formatDate, CategoryBadge, NewsImage } from '@/components/news/NewsUI'
import { Newspaper, ArrowLeft, ExternalLink, Share2, Timer } from 'lucide-react'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const initial: NewsItem | undefined = location.state?.item
  const [item, setItem] = useState<NewsItem | null>(initial || null)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const num = Number(id)
    if (!num || isNaN(num)) {
      setError('Notícia inválida')
      setLoading(false)
      return
    }
    if (initial) return
    fetchNewsItem(num)
      .then((data) => {
        setItem(data)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, initial])

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.title,
          text: item?.description || item?.title,
          url: window.location.href,
        })
        return
      }
    } catch {
      // cancela compartilhamento nativo
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // sem clipboard
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120]">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 lg:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar às notícias
        </Link>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar às notícias
            </Link>
          </div>
        )}

        {!error && item && (
          <article>
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={item.category} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {item.source}
              </span>
            </div>

            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
              {item.title}
            </h1>

            <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span>{formatDate(item.published_at)}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={share}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Share2 className="h-4 w-4" /> {copied ? 'Link copiado!' : 'Compartilhar'}
                </button>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-xl transition-colors"
                >
                  Ler na fonte <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {item.image && (
              <div className="rounded-2xl overflow-hidden mb-6 h-64 lg:h-80">
                <NewsImage src={item.image} title={item.title} />
              </div>
            )}

            {item.description && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[17px]">
                {item.description}
              </p>
            )}

            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6 text-center">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Continuar lendo na fonte original <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-xs text-gray-400 mt-3">
                Conteúdo reproduzido a título informativo, com link para a fonte original.
              </p>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}

function Header() {
  return (
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/25"
        >
          <Timer className="h-4 w-4" /> Ver notícias
        </Link>
      </div>
    </header>
  )
}
