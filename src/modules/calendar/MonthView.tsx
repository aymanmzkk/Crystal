import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, DateKey } from '../../db/types'
import { addDays, startOfMonth, startOfWeek, toDateKey } from '../../lib/dates'
import { dropOn } from './activities'
import { EventChip, dragState } from './EventChip'
import { groupByDay, type Occurrence } from './recurrence'

const MAX_CHIPS = 4

interface MonthViewProps {
  anchor: Date
  today: DateKey
  occurrences: Occurrence[]
  categories: Map<string, Category>
  onOpen: (occ: Occurrence, at: { x: number; y: number }) => void
  onCreate: (date: DateKey, at: { x: number; y: number }) => void
  onShowWeek: (date: DateKey) => void
}

export function MonthView({ anchor, today, occurrences, categories, onOpen, onCreate, onShowWeek }: MonthViewProps) {
  const { t, i18n } = useTranslation()
  const month = anchor.getMonth()
  // 6 semanas desde el lunes de la semana en que empieza el mes
  const startTime = startOfWeek(startOfMonth(anchor)).getTime()
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(new Date(startTime), i)), [startTime])
  const byDay = useMemo(() => groupByDay(occurrences, toDateKey(days[0]), toDateKey(days[41])), [occurrences, days])
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const byKey = useMemo(() => new Map(occurrences.map((o) => [o.key, o])), [occurrences])
  // Día sobre el que se está arrastrando una actividad
  const [over, setOver] = useState<DateKey | null>(null)

  return (
    <div className="grid grid-cols-7">
      {days.slice(0, 7).map((d) => (
        <div key={d.getDay()} className="border-r border-b border-line-strong px-2 py-2 text-[0.6875rem] font-semibold tracking-wide text-fg-3 uppercase">
          {weekday.format(d)}
        </div>
      ))}
      {days.map((d) => {
        const key = toDateKey(d)
        const list = byDay.get(key) ?? []
        const inMonth = d.getMonth() === month
        return (
          <div
            key={key}
            onClick={(e) => onCreate(key, { x: e.clientX, y: e.clientY })}
            onDragOver={(e) => dragState.current && (e.preventDefault(), over !== key && setOver(key))}
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              // Se cambia de día y se mantiene la hora
              if (dragState.current) void dropOn(dragState.current.key, byKey, key, undefined)
              dragState.current = null
            }}
            className={`min-h-28 min-w-0 cursor-copy border-r border-b border-line-strong p-1 transition-colors ${over === key ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] ring-2 ring-accent ring-inset' : inMonth ? '' : 'bg-surface-2/60'}`}
          >
            <span
              className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                key === today ? 'bg-accent text-accent-fg' : inMonth ? 'text-fg' : 'text-fg-3'
              }`}
            >
              {d.getDate()}
            </span>
            <div className="flex flex-col gap-0.5">
              {list.slice(0, MAX_CHIPS).map((occ) => (
                <EventChip key={occ.key} occ={occ} categories={categories} onOpen={onOpen} />
              ))}
              {list.length > MAX_CHIPS && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowWeek(key)
                  }}
                  className="self-start rounded px-1 text-xs text-fg-2 hover:text-fg"
                >
                  {t('calendar.more', { count: list.length - MAX_CHIPS })}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
