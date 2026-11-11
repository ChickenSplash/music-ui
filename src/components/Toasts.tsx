import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from '../lib/toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((message: string) => {
    window.clearTimeout(timer.current)
    setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }))
    timer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-36 z-50 flex justify-center px-4 md:bottom-28">
        {toast && (
          <p
            key={toast.id}
            role="status"
            className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black shadow-xl transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0"
          >
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}
