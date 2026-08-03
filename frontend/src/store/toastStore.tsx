import { create } from 'zustand'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  add: (type: ToastType, message: string) => void
  remove: (id: number) => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = ++toastId
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

export function toast(message: string) {
  useToastStore.getState().add('success', message)
}

export function toastError(message: string) {
  useToastStore.getState().add('error', message)
}

export function toastInfo(message: string) {
  useToastStore.getState().add('info', message)
}

const toastStyles: Record<ToastType, { className: string; icon: ReactNode }> = {
  success: {
    className: 'bg-green-600 text-white',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  error: {
    className: 'bg-red-600 text-white',
    icon: <AlertCircle className="h-5 w-5" />,
  },
  info: {
    className: 'bg-primary-600 text-white',
    icon: <Info className="h-5 w-5" />,
  },
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const style = toastStyles[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-[slideIn_0.2s_ease-out] ${style.className}`}
          >
            {style.icon}
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="p-0.5 rounded hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}