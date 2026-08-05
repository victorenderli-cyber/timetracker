import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { NewsCategory } from '@/api/news'
import { cn } from '@/utils/cn'

export function formatDate(iso: string | null) {
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

export function CategoryBadge({ category }: { category?: NewsCategory }) {
  const cat = category || 'Trabalho'
  return (
    <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', categoryColors[cat] || categoryColors.Trabalho)}>
      {cat}
    </span>
  )
}

export function NewsImage({ src, title }: { src?: string | null; title: string }) {
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
