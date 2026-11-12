import { createPortal } from 'react-dom'
import { useEffect, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconX } from '@tabler/icons-react'

interface SidePanelProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  // Ancho de la ventana: normal para casi todo, ancho para formularios largos
  size?: 'md' | 'lg'
}

// Ventana para crear o editar un registro: centrada y sencilla en el ordenador, desde abajo en el móvil.
// (Se sigue llamando SidePanel para no cambiar todas las apps que la usan.)
export function SidePanel({ title, onClose, children, footer, size = 'md' }: SidePanelProps) {
  const { t } = useTranslation()
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // Que no se mueva la página de detrás mientras está abierta
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-(--overlay) backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[92dvh] w-full animate-[sheet-in_0.28s_var(--ease-out-soft)] flex-col rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[85dvh] sm:animate-[pop-in_0.2s_var(--ease-out-soft)] sm:rounded-2xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        {/* Asa para el móvil */}
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex items-center gap-2 px-5 pt-3 pb-2 sm:pt-4">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <IconX size={19} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-5">{children}</div>
        {/* Guardar a la derecha y el botón de borrar (ml-auto) a la izquierda */}
        {footer && (
          <footer className="flex flex-row-reverse flex-wrap items-center gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>.ml-auto]:mr-auto [&>.ml-auto]:ml-0">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
