import { useMemo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconHourglass, IconPlus } from '@tabler/icons-react'
import { useCalendarEvents, useCategories } from '../db/hooks'
import type { CalendarEvent, DateKey } from '../db/types'
import { useNow } from '../hooks/useNow'
import { COLORS } from '../lib/colors'
import { addDaysKey, diffDays, parseKey, toDateKey } from '../lib/dates'
import { getCategoryIcon } from '../lib/icons'
import { expandEvents } from '../modules/calendar/recurrence'
import { externalTarget } from '../modules/calendar/external'

const MAX_CARDS = 4
const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 }

// Cuánto de la espera ya ha pasado (0 a 1): desde que se creó el evento, o desde la vez anterior si se repite
function progress(event: CalendarEvent, start: DateKey, today: DateKey): number {
  const left = diffDays(today, start)
  const total = event.recurrence ? PERIOD_DAYS[event.recurrence.freq] * event.recurrence.interval : diffDays(toDateKey(new Date(event.createdAt)), start)
  if (total <= 0) return 1
  return Math.min(1, Math.max(0.03, 1 - left / total))
}

export function CountdownStrip() {
  const { t, i18n } = useTranslation()
  const events = useCalendarEvents()
  const categories = useCategories()
  const today = toDateKey(useNow())

  const items = useMemo(() => {
    const active = new Map((categories ?? []).map((c) => [c.id, c]))
    const seen = new Set<string>()
    return expandEvents(
      (events ?? []).filter((e) => e.countdown && active.has(e.categoryId)),
      today,
      addDaysKey(today, 366),
    )
      .filter((o) => (seen.has(o.event.id) ? false : (seen.add(o.event.id), true)))
      .slice(0, MAX_CARDS)
      .map((occ) => ({ occ, category: active.get(occ.event.categoryId)! }))
  }, [events, categories, today])

  if (!events || !categories) return null

  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-fg-2">
          <IconHourglass size={18} aria-hidden />
          {t('calendar.countdowns')}
        </h2>
        <Link to="/calendar" className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
          <IconPlus size={15} aria-hidden />
          {t('home.addCountdown')}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-app border border-dashed border-line-strong px-4 py-5 text-center text-fg-3">{t('home.noCountdowns')}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
          {items.map(({ occ, category }) => {
            const days = diffDays(today, occ.start)
            const Icon = getCategoryIcon(category.icon)
            const color = COLORS[occ.event.color ?? category.color]
            return (
              <li key={occ.key}>
                <Link
                  to={externalTarget(occ.event.id) ?? `/calendar?open=${occ.event.id}`}
                  className="block card px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-semibold">
                      {days === 0 ? t('home.today') : days}
                      {days > 0 && <span className="ml-1 text-xs font-normal text-fg-2">{t('home.daysWord', { count: days })}</span>}
                    </span>
                    <span style={{ color: color.base }}>
                      <Icon size={19} aria-hidden />
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate">{occ.event.title}</span>
                  <span className="block text-xs text-fg-3 first-letter:uppercase">{date.format(parseKey(occ.start))}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.round(progress(occ.event, occ.start, today) * 100)}%`, backgroundColor: color.base }}
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
