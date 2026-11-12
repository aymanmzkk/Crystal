import { useTranslation } from 'react-i18next'
import type { Category, DateKey } from '../../db/types'
import { minToTime, parseKey, timeToMin } from '../../lib/dates'
import { iconColor, lookOf } from './EventChip'
import type { Occurrence } from './recurrence'

interface AgendaViewProps {
  from: DateKey
  today: DateKey
  occurrences: Occurrence[]
  categories: Map<string, Category>
  onOpen: (occ: Occurrence, at: { x: number; y: number }) => void
}

// Lista de eventos por día. Un evento de varios días aparece el día que empieza (o el primero del rango).
export function AgendaView({ from, today, occurrences, categories, onOpen }: AgendaViewProps) {
  const { t, i18n } = useTranslation()
  const dayTitle = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const shortDate = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })

  const groups = new Map<DateKey, Occurrence[]>()
  for (const occ of occurrences) {
    const day = occ.start < from ? from : occ.start
    groups.set(day, [...(groups.get(day) ?? []), occ])
  }

  if (groups.size === 0) {
    return <p className="px-4 py-16 text-center text-fg-2">{t('calendar.noEvents')}</p>
  }

  return (
    <div>
      {[...groups].map(([day, list]) => (
        <section key={day}>
          <h2 className="sticky top-0 z-10 border-b border-line bg-surface-2 px-4 py-1.5 text-xs text-fg-3 first-letter:uppercase">
            {dayTitle.format(parseKey(day))}
            {day === today && ` · ${t('calendar.todayShort')}`}
          </h2>
          <ul>
            {list.map((occ) => {
              const look = lookOf(occ, categories)
              const category = categories.get(occ.event.categoryId)
              const time = occ.event.time
              return (
                <li key={occ.key}>
                  <button
                    type="button"
                    onClick={(e) => onOpen(occ, { x: e.clientX, y: e.clientY })}
                    className="grid w-full grid-cols-[88px_18px_minmax(0,1fr)] items-center gap-2 border-b border-line px-4 py-2 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[88px_18px_minmax(0,1fr)_160px]"
                  >
                    <span className="text-fg-2">
                      {time ? `${time}–${minToTime(Math.min(24 * 60 - 1, timeToMin(time) + occ.event.durationMin))}` : t('calendar.allDay')}
                    </span>
                    <span style={look.style} className={iconColor({ ...look, className: 'event-tint' })}>
                      <look.Icon size={19} aria-hidden />
                    </span>
                    <span className={`truncate ${look.done ? 'text-fg-3 line-through' : occ.event.important ? 'font-semibold' : ''}`}>
                      {occ.event.title}
                      {occ.start !== occ.end && (
                        <span className="ml-2 text-fg-3">
                          {shortDate.format(parseKey(occ.start))} – {shortDate.format(parseKey(occ.end))}
                        </span>
                      )}
                    </span>
                    <span className="hidden truncate text-right text-xs text-fg-3 sm:block">{category?.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
