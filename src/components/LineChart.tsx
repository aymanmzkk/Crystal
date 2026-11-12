import { useId, useRef, useState, type PointerEvent } from 'react'

export interface Point {
  key: string
  label: string
  fullLabel: string
  value: number
  valueLabel: string
}

interface LineChartProps {
  // Con una sola serie el título la nombra (no hace falta leyenda)
  title: string
  points: Point[]
  height?: number
  color?: string
  // Texto de la escala (p. ej. "kg"), se enseña junto al valor máximo
  unit?: string
}

const W = 600
const PAD_T = 12
const PAD_B = 4

// Línea de una serie: trazo de 2px, área muy suave, línea guía y tooltip al pasar el ratón, y tabla oculta para lectores de pantalla
export function LineChart({ title, points, height = 160, color = 'var(--accent)', unit }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const gradId = useId()
  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // Un poco de aire arriba y abajo; si todo vale lo mismo, se centra
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.1)
  const min = Math.max(0, rawMin - span * 0.15)
  const max = rawMax + span * 0.15
  const H = height
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W)
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${H} L${x(0)},${H} Z`
  const active = hover ?? points.length - 1

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current!.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-xs text-fg-3">
        <span>{title}</span>
        {unit && (
          <span className="tabular-nums">
            {Math.round(rawMin)}–{Math.round(rawMax)} {unit}
          </span>
        )}
      </figcaption>
      <div ref={ref} className="relative touch-none" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setHover(null)} aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Rejilla discreta: tres líneas */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={PAD_T + f * (H - PAD_T - PAD_B)} y2={PAD_T + f * (H - PAD_T - PAD_B)} stroke="var(--line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--line-strong)" vectorEffect="non-scaling-stroke" />
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--fg-3)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* Punto activo en HTML para que sea redondo aunque la gráfica se estire */}
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-[left,top] duration-150"
          style={{ left: `${(x(active) / W) * 100}%`, top: y(points[active].value), backgroundColor: color }}
        />
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-md transition-[left] duration-150"
          style={{ left: `${Math.min(88, Math.max(12, (x(active) / W) * 100))}%`, top: Math.max(0, y(points[active].value) - 38) }}
        >
          <span className="text-fg-3">{points[active].fullLabel}</span> <span className="font-semibold text-fg">{points[active].valueLabel}</span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-fg-3" aria-hidden>
        <span>{points[0].label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.fullLabel}</th>
              <td>{p.valueLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
