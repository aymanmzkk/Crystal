import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconCheck, IconChevronLeft, IconChevronRight, IconFlame, IconPlus } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary } from '../../components/ui'
import { useHabitLogsSince, useHabits } from '../../db/hooks'
import { upsertRecord } from '../../db/repo'
import type { DateKey, Habit } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { COLORS, colorVars } from '../../lib/colors'
import { addDays, addDaysKey, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import { getCategoryIcon } from '../../lib/icons'
import { HabitPanel } from './HabitPanel'
import { completionRate, currentStreak, habitLogId, isDone, isScheduled, nextHabitValue, type HabitValues } from './stats'

// Para las rachas y el mapa del panel basta con cargar el último año
const HISTORY_DAYS = 400

// Sugerencias para empezar; el nombre sale de las traducciones (habits.suggestions.<clave>)
const SUGGESTIONS: (Partial<Habit> & { key: string })[] = [
  { key: 'read', icon: 'book', color: 'blue' },
  { key: 'water', icon: 'droplet', color: 'teal', kind: 'count', goal: 8 },
  { key: 'meditate', icon: 'brain', color: 'purple' },
  { key: 'english', icon: 'language', color: 'amber', weekdays: [1, 2, 3, 4, 5] },
  { key: 'run', icon: 'run', color: 'green', weekdays: [1, 3, 5] },
  { key: 'sleep', icon: 'moon', color: 'gray' },
]

type Panel = { habitId: string } | { preset: Partial<Habit> } | null

export default function HabitsPage() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const [weekOffset, setWeekOffset] = useState(0)
  const [panel, setPanel] = useState<Panel>(null)
  const habits = useHabits()
  const logs = useHabitLogsSince(addDaysKey(today, -HISTORY_DAYS))

  const values = useMemo(() => {
    const byHabit = new Map<string, HabitValues>()
    for (const log of logs ?? []) {
      if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map())
      byHabit.get(log.habitId)!.set(log.date, log.value)
    }
    return byHabit
  }, [logs])

  const monday = addDays(startOfWeek(parseKey(today)), weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const range = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).formatRange(monday, addDays(monday, 6))
  const nextOrder = Math.max(0, ...(habits ?? []).map((h) => h.order)) + 1

  // Un clic marca o desmarca. En los de contar suma uno (y vuelve a 0 al pasarse); clic derecho resta.
  function bump(habit: Habit, date: DateKey, delta: 1 | -1) {
    const current = values.get(habit.id)?.get(date) ?? 0
    const next = nextHabitValue(habit, current, delta)
    void upsertRecord('habitLogs', habitLogId(habit.id, date), { habitId: habit.id, date, value: next })
  }

  const panelHabit = panel && 'habitId' in panel ? habits?.find((h) => h.id === panel.habitId) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <button type="button" onClick={() => setWeekOffset(0)} className={btn}>
          {t('calendar.today')}
        </button>
        <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label={t('calendar.prev')} className={btnIcon}>
          <IconChevronLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset === 0}
          aria-label={t('calendar.next')}
          className={`${btnIcon} disabled:opacity-40`}
        >
          <IconChevronRight size={20} aria-hidden />
        </button>
        <h1 className="ml-1 text-sm font-semibold">{range}</h1>
        <span className="flex-1" />
        <button type="button" onClick={() => setPanel({ preset: {} })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('habits.new')}
        </button>
      </div>

      <main className="w-full flex-1 p-4 md:p-6">
        {habits && habits.length === 0 && (
          <div className="mx-auto max-w-lg card p-6 text-center">
            <p className="font-semibold">{t('habits.emptyTitle')}</p>
            <p className="mt-1 text-fg-2">{t('habits.emptyBody')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(({ key, ...preset }) => {
                const Icon = getCategoryIcon(preset.icon)
                const name = t(`habits.suggestions.${key}`)
                return (
                  <button key={key} type="button" onClick={() => setPanel({ preset: { ...preset, name } })} className={btn}>
                    <span style={{ color: COLORS[preset.color ?? 'green'].base }}>
                      <Icon size={18} aria-hidden />
                    </span>
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {habits && habits.length > 0 && (
          <div className="overflow-x-auto card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
                <tr>
                  <th className="px-3 py-2 font-normal">{t('habits.name')}</th>
                  {days.map((d) => (
                    <th key={d} className={`w-12 px-1 py-2 text-center font-normal ${d === today ? 'text-fg' : ''}`}>
                      <span className="block">{weekday.format(parseKey(d))}</span>
                      <span className={d === today ? 'rounded-full bg-accent px-1.5 text-accent-fg' : ''}>{parseKey(d).getDate()}</span>
                    </th>
                  ))}
                  <th className="w-20 px-3 py-2 text-right font-normal">{t('habits.streak')}</th>
                  <th className="hidden w-16 px-3 py-2 text-right font-normal sm:table-cell">{t('habits.last30Short')}</th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const v = values.get(habit.id) ?? new Map()
                  const Icon = getCategoryIcon(habit.icon)
                  const streak = currentStreak(habit, v, today)
                  return (
                    <tr key={habit.id} className="border-t border-line">
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => setPanel({ habitId: habit.id })}
                          className="flex min-w-0 items-center gap-2 text-left hover:underline"
                        >
                          <span style={{ color: COLORS[habit.color].base }}>
                            <Icon size={20} aria-hidden />
                          </span>
                          <span className="truncate">{habit.name}</span>
                          {habit.kind === 'count' && <span className="text-fg-3">· {habit.goal}</span>}
                        </button>
                      </td>
                      {days.map((d) => (
                        <td key={d} className="px-1 py-1.5 text-center">
                          <HabitCell habit={habit} date={d} today={today} value={v.get(d) ?? 0} onBump={(delta) => bump(habit, d, delta)} />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 ${streak > 0 ? 'text-fg' : 'text-fg-3'}`}>
                          <IconFlame size={16} className={streak >= 7 ? 'text-danger' : ''} aria-hidden />
                          {streak}
                        </span>
                      </td>
                      <td className="hidden px-3 py-1.5 text-right text-fg-2 sm:table-cell">
                        {Math.round(completionRate(habit, v, today) * 100)} %
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {habits && habits.length > 0 && <p className="mt-2 text-xs text-fg-3">{t('habits.hint')}</p>}
      </main>

      {panel && (
        <HabitPanel
          key={'habitId' in panel ? panel.habitId : `new:${panel.preset.name ?? ''}`}
          habit={panelHabit}
          preset={'preset' in panel ? panel.preset : undefined}
          values={panelHabit ? (values.get(panelHabit.id) ?? new Map()) : new Map()}
          today={today}
          nextOrder={nextOrder}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}

interface HabitCellProps {
  habit: Habit
  date: DateKey
  today: DateKey
  value: number
  onBump: (delta: 1 | -1) => void
}

function HabitCell({ habit, date, today, value, onBump }: HabitCellProps) {
  const { t, i18n } = useTranslation()
  const created = toDateKey(new Date(habit.createdAt))
  if (date > today || date < created || !isScheduled(habit, date)) {
    return <span className="text-fg-3" aria-hidden>·</span>
  }
  const done = isDone(habit, value)
  const label = `${habit.name}, ${new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric' }).format(parseKey(date))}: ${
    habit.kind === 'count' ? `${value}/${habit.goal}` : done ? t('tasks.done') : t('habits.notDone')
  }`
  return (
    <button
      type="button"
      onClick={() => onBump(1)}
      onContextMenu={(e) => {
        e.preventDefault()
        onBump(-1)
      }}
      aria-label={label}
      title={label}
      style={colorVars(habit.color)}
      className={`mx-auto flex size-8 items-center justify-center rounded-app text-xs transition-colors ${
        done ? 'event-solid' : value > 0 ? 'event-tint' : 'border border-line-strong hover:border-accent'
      }`}
    >
      {habit.kind === 'count' ? (value > 0 ? `${value}/${habit.goal}` : '') : done && <IconCheck size={20} aria-hidden />}
    </button>
  )
}
