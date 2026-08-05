import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatDate, CategoryBadge, NewsImage } from '@/components/news/NewsUI'

describe('formatDate', () => {
  it('formata datas ISO para o padrão pt-BR', () => {
    expect(formatDate('2026-08-05T10:00:00Z')).toMatch(/05 de ago/)
  })

  it('retorna string vazia para datas nulas/inválidas', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('')).toBe('')
    expect(formatDate('data-invalida')).toBe('')
  })
})

describe('CategoryBadge', () => {
  it('renderiza a categoria fornecida', () => {
    render(<CategoryBadge category="Vagas" />)
    expect(screen.getByText('Vagas')).toBeInTheDocument()
  })

  it('usa "Trabalho" como categoria padrão', () => {
    render(<CategoryBadge />)
    expect(screen.getByText('Trabalho')).toBeInTheDocument()
  })
})

describe('NewsImage', () => {
  it('mostra placeholder quando não há imagem', () => {
    render(<NewsImage src={null} title="Sem imagem" />)
    const placeholder = document.querySelector('.bg-gradient-to-br')
    expect(placeholder).toBeInTheDocument()
  })

  it('renderiza a imagem quando há src', () => {
    render(<NewsImage src="https://exemplo.com/foto.jpg" title="Foto" />)
    const img = screen.getByAltText('Foto') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'https://exemplo.com/foto.jpg')
  })
})
