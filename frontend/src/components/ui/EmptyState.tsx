import { cn } from '@/utils/cn'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-14 px-6 animate-fade-in', className)}>
      {icon && (
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}