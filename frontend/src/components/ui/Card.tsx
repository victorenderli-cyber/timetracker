import { cn } from '@/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  hover?: boolean
}

export function Card({ title, subtitle, action, className, children, hover, ...props }: CardProps) {
  return (
    <div className={cn('card', hover && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer', className)} {...props}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}