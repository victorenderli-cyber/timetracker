export const NEWS_CATEGORIES = ['Concursos', 'Vagas', 'Salários', 'Carreira', 'Economia', 'Trabalho'] as const
export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export interface NewsItem {
  title: string
  link: string
  description: string
  published_at: string | null
  source: string
  image?: string | null
  category?: NewsCategory
}

export interface NewsFeed {
  name: string
  url: string
}

export interface NewsResponse {
  feeds: NewsFeed[]
  count: number
  items: NewsItem[]
}

const BASE = '/api/v1'

export async function fetchNews(limit = 30): Promise<NewsResponse> {
  const res = await fetch(`${BASE}/news?limit=${limit}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Falha ao carregar notícias (${res.status})`)
  }
  return res.json()
}