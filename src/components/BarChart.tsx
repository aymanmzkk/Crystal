import { useState } from 'react'

export interface Bar {
  key: string
  // Etiqueta corta del eje (lun, mar...) y etiqueta larga para el tooltip y la tabla
  label: string
  fullLabel: string
  value: number
  valueLabel: string
  highlight?: boolean
}

interface BarChartProps {
  // Título que nombra la serie (con una sola serie no hace falta leyenda)
  title: string
  bars: Bar[]
  height?: number
  // Color de las barras (una sola serie: un solo tono)
  color?: string
  // Valor que llena la barra entera (por defecto, el mayor de los datos)
  max?: number
}

// Gráfica de barras de una serie: barras finas sobre la línea base, extremo redondeado,
// tooltip al pasar el ratón, y tabla oculta para lectores de pantalla.
export function BarChart({ title, bars, height = 120, color = 'var(--accent)', max: fixedMax }: BarChartProps) {
  const [hover, setHover] = useState<string | null>(null)
  const max = fixedMax ?? Math.max(1, ...bars.map((b) => b.value))

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-xs text-fg-3">{title}</figcaption>
      <div className="relative flex items-end gap-0.5 border-b border-line-strong" style={{ height }} aria-hidden>
        {bars.map((bar) => (
          <div
            key={bar.key}
            onMouseEnter={() => setHover(bar.key)}
            onMouseLeave={() => setHover(null)}
            className="relative flex h-full flex-1 items-end justify-center"
          >
            <div
              className="w-full max-w-7 rounded-t-[4px] transition-[height] duration-300"
              style={{
                height: `${(bar.value / max) * 100}%`,
                minHeight: bar.value > 0 ? 2 : 0,
                backgroundColor: color, opacity: bar.highlight ? 1 : 0.55,
              }}
            />
            {hover === bar.key && (
              <div className="pointer-events-none absolute bottom-full mb-1 rounded-app border border-line-strong bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-md">
                <span className="text-fg-3">{bar.fullLabel}</span> <span className="font-semibold">{bar.valueLabel}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5" aria-hidden>
        {bars.map((bar) => (
          <span key={bar.key} className={`flex-1 text-center text-xs ${bar.highlight ? 'text-fg' : 'text-fg-3'}`}>
            {bar.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <th scope="row">{bar.fullLabel}</th>
              <td>{bar.valueLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
