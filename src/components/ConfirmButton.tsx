import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmButtonProps {
  children: ReactNode
  // Pregunta que aparece en lugar del botón, por ejemplo "¿Borrar para siempre?"
  question: string
  onConfirm: () => void
  className?: string
  ariaLabel?: string
}

// Botón para acciones que no se pueden deshacer: el primer clic pregunta y el segundo confirma
export function ConfirmButton({ children, question, onConfirm, className, ariaLabel }: ConfirmButtonProps) {
  const { t } = useTranslation()
  const [asking, setAsking] = useState(false)

  if (asking) {
    return (
      <span className="inline-flex items-center gap-1.5" role="group" aria-label={question}>
        <span className="text-danger">{question}</span>
        <button
          type="button"
          autoFocus
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
          className="rounded-app border border-danger px-2 py-0.5 text-danger transition-colors hover:bg-danger hover:text-accent-fg"
        >
          {t('common.yes')}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-app border border-line-strong px-2 py-0.5 transition-colors hover:bg-surface-2"
        >
          {t('common.no')}
        </button>
      </span>
    )
  }

  return (
    <button type="button" onClick={() => setAsking(true)} aria-label={ariaLabel} title={ariaLabel} className={className}>
      {children}
    </button>
  )
}
