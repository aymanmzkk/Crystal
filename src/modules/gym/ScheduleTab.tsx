import { useTranslation } from 'react-i18next'
import { IconBarbell, IconMoonStars, IconRotate } from '@tabler/icons-react'
import { btnGhost, field, pill, toggleChip } from '../../components/ui'
import { upsertRecord } from '../../db/repo'
import type { GymSplit } from '../../db/types'
import { addDaysKey, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import type { GymData } from './GymPage'
import { DEFAULT_SCHEDULE, GYM_SCHEDULE_KEY, SPLITS, plannedPerWeek, type GymSchedule } from './plan'

// Plan semanal: qué toca cada día (Torso, Pierna, Empuje...) y con qué plantilla
export function ScheduleTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const { schedule, routines, today } = data
  const monday = toDateKey(startOfWeek(parseKey(today)))
  const longDay = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' })

  const save = (next: GymSchedule) => void upsertRecord('settings', GYM_SCHEDULE_KEY, { value: next })
  const setDay = (i: number, change: Partial<GymSchedule['days'][number]>) =>
    save({ days: schedule.days.map((d, j) => (j === i ? { ...d, ...change, ...(change.split === 'rest' ? { routineId: null } : {}) } : d)) })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-fg-2">{t('gym.scheduleHint')}</p>
        <span className={pill('accent')}>{t('gym.daysPerWeek', { count: plannedPerWeek(schedule) })}</span>
        <button type="button" onClick={() => save(DEFAULT_SCHEDULE)} className={`${btnGhost} ml-auto`}>
          <IconRotate size={16} aria-hidden />
          {t('gym.resetPlan')}
        </button>
      </div>
      <ol className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {schedule.days.map((day, i) => {
          const date = addDaysKey(monday, i)
          const rest = day.split === 'rest'
          // Las plantillas del mismo tipo salen primero
          const sorted = [...routines].sort((a, b) => Number(b.split === day.split) - Number(a.split === day.split) || a.order - b.order)
          return (
            <li key={i} className={`card flex flex-col gap-3 p-3.5 ${date === today ? 'ring-2 ring-accent' : ''}`}>
              <header className="flex items-center gap-2">
                <span className={`flex size-8 items-center justify-center rounded-lg ${rest ? 'bg-surface-3 text-fg-3' : 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent'}`}>
                  {rest ? <IconMoonStars size={16} aria-hidden /> : <IconBarbell size={16} aria-hidden />}
                </span>
                <h3 className="text-sm font-semibold first-letter:uppercase">{longDay.format(parseKey(date))}</h3>
              </header>
              <div className="flex flex-wrap gap-1" role="group" aria-label={t('gym.splitLabel')}>
                {SPLITS.map((s: GymSplit) => (
                  <button key={s} type="button" aria-pressed={day.split === s} onClick={() => setDay(i, { split: s })} className={toggleChip(day.split === s)}>
                    {t(`gym.splits.${s}`)}
                  </button>
                ))}
              </div>
              {!rest && (
                <select
                  value={day.routineId ?? ''}
                  onChange={(e) => setDay(i, { routineId: e.target.value || null })}
                  aria-label={t('gym.routineForDay')}
                  className={`${field} w-full`}
                >
                  <option value="">{t('gym.noRoutine')}</option>
                  {sorted.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
