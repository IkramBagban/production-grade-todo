import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { nanoid } from 'nanoid'
import clsx from 'clsx'

type ToastIntent = 'success' | 'info' | 'warning' | 'error'

type ToastRecord = {
  id: string
  title: string
  description?: string
  intent: ToastIntent
  duration?: number
}

type ToastOptions = Omit<ToastRecord, 'id'> & { id?: string }

type ToastContextValue = {
  push: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const DEFAULT_DURATION = 5000

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dropToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timeoutId = timers.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? nanoid()
      setToasts((prev) => {
        const next = prev.filter((toast) => toast.id !== id)
        next.push({ ...options, id })
        return next
      })

      const duration = options.duration ?? DEFAULT_DURATION
      if (Number.isFinite(duration) && duration > 0) {
        const timeoutId = setTimeout(() => dropToast(id), duration)
        timers.current.set(id, timeoutId)
      }

      return id
    },
    [dropToast],
  )

  useEffect(() => {
    return () => {
      timers.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timers.current.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss: dropToast }), [dropToast, push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dropToast} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

type ToastViewportProps = {
  toasts: ToastRecord[]
  onDismiss: (id: string) => void
}

const intentIconMap: Record<ToastIntent, ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
  warning: <AlertTriangle aria-hidden="true" />,
  error: <XCircle aria-hidden="true" />,
}

const ToastViewport = ({ toasts, onDismiss }: ToastViewportProps) => {
  if (toasts.length === 0) return null

  return (
    <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={clsx('toast', `toast--${toast.intent}`)}
        >
          <div className="toast__icon" aria-hidden="true">
            {intentIconMap[toast.intent]}
          </div>
          <div className="toast__content">
            <p className="toast__title">{toast.title}</p>
            {toast.description ? <p className="toast__description">{toast.description}</p> : null}
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
