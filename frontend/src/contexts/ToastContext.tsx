import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { nanoid } from 'nanoid'

export type ToastType = 'success' | 'info' | 'error' | 'warn'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (type: ToastType, message: string, duration?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  push: () => {},
  dismiss: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((type: ToastType, message: string, duration = 2500) => {
    const id = nanoid()
    setToasts((ts) => [...ts, { id, type, message }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItemView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const colors: Record<ToastType, string> = {
    success: 'bg-soft-green text-white',
    info: 'bg-soft-primary text-white',
    error: 'bg-soft-red text-white',
    warn: 'bg-soft-yellow text-soft-text',
  }
  const icons: Record<ToastType, string> = {
    success: '✓',
    info: 'ⓘ',
    error: '✕',
    warn: '⚠',
  }
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 min-w-[200px] max-w-[360px] px-3 py-2 rounded-xl shadow-lg text-sm ${colors[toast.type]}`}
      style={{ animation: 'toast-in 150ms ease-out' }}
    >
      <span className="font-bold">{icons[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  return {
    success: (msg: string, duration?: number) => ctx.push('success', msg, duration),
    info: (msg: string, duration?: number) => ctx.push('info', msg, duration),
    error: (msg: string, duration?: number) => ctx.push('error', msg, duration),
    warn: (msg: string, duration?: number) => ctx.push('warn', msg, duration),
  }
}
