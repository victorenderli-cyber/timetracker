import { cn } from '@/utils/cn'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400',
}

export function Badge({
  variant = 'gray',
  className,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}) {
  return <span className={cn('badge', variantClasses[variant], className)}>{children}</span>
}