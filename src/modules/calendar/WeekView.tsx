import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, DateKey } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { addDays, minToTime, timeToMin, toDateKey } from '../../lib/dates'
import { dropOn, isEditable, isResizable, resizeOccurrence } from './activities'
import { DoneButton, EventChip, dragState, iconColor, lookOf, startDrag } from './EventChip'
import { layoutDay } from './layout'
import { groupByDay, type Occurrence } from './recurrence'

// Horas visibles y altura de cada hora en píxeles
const HOUR_START = 6
const HOUR_END = 24
const HOUR_PX = 48
const BODY_PX = (HOUR_END - HOUR_START) * HOUR_PX
// Al mover o estirar se ajusta a cuartos de hora
const SNAP = 15

const minToPx = (min: number) => ((min - HOUR_START * 60) / 60) * HOUR_PX
const pxToMin = (px: number) => HOUR_START * 60 + (px / HOUR_PX) * 60
const snap = (min: number) => Math.round(min / SNAP) * SNAP

interface WeekViewProps {
  // Primer día y número de días (7 = semana, 1 = día)
  start: Date
  dayCount: number
  today: DateKey
  occurrences: Occurrence[]
  categories: Map<string, Category>
  onOpen: (occ: Occurrence, at: { x: number; y: number }) => void
  onCreate: (date: DateKey, time: string, at: { x: number; y: number }) => void
}

// Vista semana o día con horas: las actividades se arrastran a otro hueco y se estiran desde el borde de abajo
export function WeekView({ start, dayCount, today, occurrences, categories, onOpen, onCreate }: WeekViewProps) {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const startTime = start.getTime()
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => toDateKey(addDays(new Date(startTime), i))), [startTime, dayCount])
  const byDay = useMemo(() => groupByDay(occurrences, days[0], days[days.length - 1]), [occurrences, days])
  const byKey = useMemo(() => new Map(occurrences.map((o) => [o.key, o])), [occurrences])
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: dayCount === 1 ? 'long' : 'short' })
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sombra que enseña dónde caerá la actividad que se arrastra
  const [ghost, setGhost] = useState<{ day: DateKey; min: number; duration: number } | null>(null)
  // Duración provisional mientras se estira una actividad
  const [resize, setResize] = useState<{ key: string; duration: number } | null>(null)

  // Al abrir se baja hasta las 8:00
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: minToPx(8 * 60) })
  }, [])

  // Al pulsar un hueco libre se crea un evento en esa media hora
  const createAt = (date: DateKey) => (e: MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const min = HOUR_START * 60 + Math.floor(y / (HOUR_PX / 2)) * 30
    onCreate(date, minToTime(Math.min(min, 23 * 60)), { x: e.clientX, y: e.clientY })
  }

  const dropMin = (e: DragEvent<HTMLDivElement>, grabMin: number, duration: number) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    return Math.max(HOUR_START * 60, Math.min(24 * 60 - duration, snap(pxToMin(y) - grabMin)))
  }

  const onDragOver = (day: DateKey) => (e: DragEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    e.preventDefault()
    const { grabMin, duration } = dragState.current
    const min = dropMin(e, grabMin, duration)
    setGhost((g) => (g && g.day === day && g.min === min ? g : { day, min, duration }))
  }

  const onDrop = (day: DateKey) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const data = dragState.current
    setGhost(null)
    dragState.current = null
    if (data) void dropOn(data.key, byKey, day, minToTime(dropMin(e, data.grabMin, data.duration)))
  }

  const onDropAllDay = (day: DateKey) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const data = dragState.current
    dragState.current = null
    setGhost(null)
    if (data) void dropOn(data.key, byKey, day, null)
  }

  // Estirar desde el borde inferior
  const startResize = (occ: Occurrence, startMin: number) => (e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const y0 = e.clientY
    const d0 = occ.event.durationMin || 30
    let current = d0
    const onMove = (ev: globalThis.PointerEvent) => {
      current = Math.max(SNAP, Math.min(24 * 60 - startMin, snap(d0 + ((ev.clientY - y0) / HOUR_PX) * 60)))
      setResize({ key: occ.key, duration: current })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setResize(null)
      if (current !== d0) void resizeOccurrence(occ, current)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const cols = `76px repeat(${dayCount}, minmax(0, 1fr))`
  // Sábado y domingo con un fondo un poco distinto para orientarse mejor
  const weekend = (key: DateKey) => [0, 6].includes(new Date(`${key}T00:00`).getDay())

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabecera con los días y la fila de "todo el día" */}
      {/* La cabecera reserva el mismo hueco que la barra de desplazamiento de abajo para que las columnas coincidan */}
      <div className="grid shrink-0 overflow-hidden border-b border-line-strong [scrollbar-gutter:stable]" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((key, i) => {
          const isToday = key === today
          return (
            <div key={key} className={`border-l border-line-strong px-2 pt-2 pb-1.5 text-center ${weekend(key) ? 'bg-surface-2/50' : ''}`}>
              <div className={`text-[0.6875rem] font-semibold tracking-wide uppercase ${isToday ? 'text-accent' : 'text-fg-3'}`}>{weekday.format(addDays(start, i))}</div>
              <div
                className={`mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-lg font-semibold tabular-nums ${isToday ? 'bg-accent text-accent-fg' : 'text-fg'}`}
              >
                {addDays(start, i).getDate()}
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-end border-t border-line-strong pr-2 text-[0.6875rem] whitespace-nowrap text-fg-3"><span className="inline-block first-letter:uppercase">{t('calendar.allDay')}</span></div>
        {days.map((key) => (
          <div
            key={key}
            onDragOver={(e) => dragState.current && e.preventDefault()}
            onDrop={onDropAllDay(key)}
            className={`flex min-h-9 min-w-0 flex-col gap-0.5 border-t border-l border-line-strong p-1 ${weekend(key) ? 'bg-surface-2/50' : ''}`}
          >
            {(byDay.get(key) ?? [])
              .filter((o) => o.event.time === null || o.start !== o.end)
              .map((occ) => (
                <EventChip key={occ.key} occ={occ} categories={categories} onOpen={onOpen} />
              ))}
          </div>
        ))}
      </div>

      {/* Horas */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height: BODY_PX }}>
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <span key={i} className="absolute right-0 flex -translate-y-1/2 items-center gap-1.5 text-[0.6875rem] font-medium text-fg-2 tabular-nums" style={{ top: i * HOUR_PX }}>
                {i === 0 ? '' : minToTime((HOUR_START + i) * 60)}
                {/* Rayita que une la hora con su línea */}
                {i > 0 && <span className="block w-1.5 border-t border-line-strong" aria-hidden />}
              </span>
            ))}
          </div>
          {days.map((key) => (
            <div
              key={key}
              onClick={createAt(key)}
              onDragOver={onDragOver(key)}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setGhost(null)}
              onDrop={onDrop(key)}
              className={`relative cursor-copy border-l border-line-strong ${key === today ? 'bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' : weekend(key) ? 'bg-surface-2/50' : ''}`}
              style={{ height: BODY_PX }}
            >
              {Array.from({ length: HOUR_END - HOUR_START - 1 }, (_, i) => (
                <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-line-strong" style={{ top: (i + 1) * HOUR_PX }} />
              ))}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={`h${i}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ top: i * HOUR_PX + HOUR_PX / 2 }} />
              ))}

              {ghost?.day === key && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-20 rounded-md border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 text-xs font-semibold text-accent"
                  style={{ top: minToPx(ghost.min), height: Math.max(18, (ghost.duration / 60) * HOUR_PX - 2) }}
                >
                  {minToTime(ghost.min)}
                </div>
              )}

              {layoutDay(byDay.get(key) ?? []).map(({ occ, startMin, endMin, col, cols }) => {
                const look = lookOf(occ, categories)
                const editable = isEditable(occ)
                const duration = resize?.key === occ.key ? resize.duration : endMin - startMin
                const top = Math.max(0, minToPx(startMin))
                const height = Math.max(20, (duration / 60) * HOUR_PX - 2)
                const end = minToTime(Math.min(24 * 60 - 1, timeToMin(occ.event.time!) + (resize?.key === occ.key ? resize.duration : occ.event.durationMin)))
                return (
                  <div
                    key={occ.key}
                    draggable={editable}
                    onDragStart={(e) => {
                      const grabMin = ((e.clientY - e.currentTarget.getBoundingClientRect().top) / HOUR_PX) * 60
                      startDrag(e, occ.key, grabMin, occ.event.durationMin || 30)
                    }}
                    onDragEnd={() => setGhost(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(occ, { x: e.clientX, y: e.clientY })
                    }}
                    title={occ.event.title}
                    style={{
                      ...look.style,
                      top,
                      height,
                      left: `calc(${(col / cols) * 100}% + 2px)`,
                      width: `calc(${100 / cols}% - 4px)`,
                    }}
                    className={`group absolute z-10 flex flex-col overflow-hidden rounded-md px-1.5 py-1 text-left text-[0.8125rem] leading-4 shadow-sm transition-shadow hover:z-20 hover:shadow-lg ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${look.className} ${resize?.key === occ.key ? 'z-30 shadow-lg' : ''}`}
                  >
                    <span className="flex min-w-0 items-start gap-1.5">
                      {editable ? <DoneButton occ={occ} /> : <look.Icon size={14} className={`mt-px shrink-0 ${iconColor(look)}`} aria-hidden />}
                      <span className={`event-title min-w-0 flex-1 truncate ${look.done ? 'line-through' : ''}`}>{occ.event.title}</span>
                    </span>
                    {height > 36 && (
                      <span className="mt-0.5 block truncate pl-[22px] text-xs text-fg-2 tabular-nums">
                        {occ.event.time}–{end}
                      </span>
                    )}
                    {editable && isResizable(occ.event.id) && (
                      <span
                        onPointerDown={startResize(occ, startMin)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      >
                        <span className="mx-auto mt-0.5 block h-1 w-6 rounded-full bg-(--h)" />
                      </span>
                    )}
                  </div>
                )
              })}
              {key === today && nowMin >= HOUR_START * 60 && (
                <div className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-danger" style={{ top: minToPx(nowMin) }}>
                  <span className="absolute -top-[5px] -left-[5px] size-2.5 rounded-full bg-danger" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
