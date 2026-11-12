import { useId } from 'react'

// Color del anillo: el principal, o el de advertencia/peligro (almacenamiento casi lleno...)
const TONES = { accent: ['var(--accent)', 'var(--accent-2)'], warning: ['var(--warning)', 'var(--warning)'], danger: ['var(--danger)', 'var(--danger)'] }

// Anillo de progreso (0 a 1) con el porcentaje en el centro. Se anima al cambiar.
export function ProgressRing({ value, size = 96, stroke = 9, label, tone = 'accent' }: { value: number; size?: number; stroke?: number; label: string; tone?: keyof typeof TONES }) {
  const gradId = useId()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${pct} %`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={TONES[tone][0]} />
            <stop offset="100%" stopColor={TONES[tone][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tracking-tight tabular-nums">
        {pct}
        <span className="text-xs text-fg-3">%</span>
      </span>
    </div>
  )
}
