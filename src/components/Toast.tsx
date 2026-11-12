import { useEffect } from 'react'
import { useToast } from '../store/toast'

const VISIBLE_MS = 6000

export function Toast() {
  const { toast, hide } = useToast()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hide, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast, hide])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-10 z-50 flex justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-[toast-in_0.2s_ease-out] items-center gap-3 rounded-app border border-line-strong bg-accent px-3 py-2 text-xs text-accent-fg shadow-lg"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run()
                hide()
              }}
              className="font-semibold underline underline-offset-2"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
