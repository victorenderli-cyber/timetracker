import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchNews, fetchNewsItem } from '@/api/news'

describe('fetchNews', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('faz GET em /api/v1/news e retorna os itens', async () => {
    const body = { feeds: [], count: 1, items: [{ title: 'Vaga de emprego', link: 'https://x.com/a' }] }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    })
    const res = await fetchNews(30)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].title).toBe('Vaga de emprego')
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/news?limit=30', expect.anything())
  })

  it('lança erro quando a resposta não é ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })
    await expect(fetchNews()).rejects.toThrow('Falha ao carregar notícias')
  })
})

describe('fetchNewsItem', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('faz GET em /api/v1/news/{id} e retorna a notícia', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 42, title: 'Concurso', link: 'https://x.com/b' }),
    })
    const item = await fetchNewsItem(42)
    expect(item.id).toBe(42)
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/news/42', expect.anything())
  })

  it('lança erro para notícia inexistente', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    })
    await expect(fetchNewsItem(999)).rejects.toThrow('Notícia não encontrada')
  })
})
