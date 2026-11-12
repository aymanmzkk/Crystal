import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconSearch, IconTrophy } from '@tabler/icons-react'
import { field, pill, toggleChip } from '../../components/ui'
import type { MuscleGroup } from '../../db/types'
import { diffDays, parseKey } from '../../lib/dates'
import { formatNumber } from '../../lib/format'
import { MUSCLES } from './ExercisePicker'
import type { GymData } from './GymPage'
import { personalRecords } from './stats'

// Un récord es "nuevo" durante dos semanas
const NEW_DAYS = 14

// Récords personales de cada ejercicio: serie más pesada, mejor 1RM estimado y más repeticiones
export function RecordsTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { finished, exerciseMap, today } = data
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('')
  const records = useMemo(() => personalRecords(finished), [finished])
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const words = query.trim().toLowerCase()

  const rows = [...records.values()]
    .map((r) => ({ r, exercise: exerciseMap.get(r.exerciseId) }))
    .filter(({ exercise }) => exercise && (!muscle || exercise.muscle === muscle) && (!words || exercise.name.toLowerCase().includes(words)))
    .sort((a, b) => b.r.best1rm.date.localeCompare(a.r.best1rm.date))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 sm:max-w-xs">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-3" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('gym.searchExercise')} aria-label={t('gym.searchExercise')} className={`${field} w-full pl-8`} />
        </label>
        <div className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={!muscle} onClick={() => setMuscle('')} className={toggleChip(!muscle)}>
            {t('gym.allMuscles')}
          </button>
          {MUSCLES.map((m) => (
            <button key={m} type="button" aria-pressed={muscle === m} onClick={() => setMuscle(m)} className={toggleChip(muscle === m)}>
              {t(`gym.muscles.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <IconTrophy size={30} stroke={1.5} className="text-fg-3" aria-hidden />
          <p className="text-fg-2">{records.size === 0 ? t('gym.noRecords') : t('gym.noMatches')}</p>
        </div>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ r, exercise }) => {
            const fresh = diffDays(r.best1rm.date, today) <= NEW_DAYS
            const bodyweight = r.heaviest.weight === 0
            return (
              <li key={r.exerciseId} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${fresh ? 'bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-warning' : 'bg-surface-3 text-fg-3'}`}>
                    <IconTrophy size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{exercise!.name}</h3>
                    <p className="text-xs text-fg-3">
                      {t(`gym.muscles.${exercise!.muscle}`)} · {t('gym.sessionsCount', { count: r.sessions })}
                    </p>
                  </div>
                  {fresh && <span className={pill('warning')}>{t('gym.newRecord')}</span>}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    bodyweight
                      ? { label: t('gym.bodyweight'), value: '—', sub: '' }
                      : { label: t('gym.bestWeight'), value: `${formatNumber(r.heaviest.weight, lang)} kg`, sub: `× ${r.heaviest.reps}` },
                    { label: t('gym.mostReps'), value: String(r.mostReps.reps), sub: r.mostReps.weight ? `${formatNumber(r.mostReps.weight, lang)} kg` : '' },
                    { label: t('gym.best1rmShort'), value: bodyweight ? '—' : `${formatNumber(r.best1rm.value, lang)}`, sub: bodyweight ? '' : 'kg' },
                  ].map((x) => (
                    <div key={x.label} className="rounded-lg bg-surface-2/60 px-1 py-2">
                      <dt className="text-[0.6875rem] text-fg-3">{x.label}</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums">
                        {x.value} <span className="text-xs font-normal text-fg-3">{x.sub}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-fg-3">{t('gym.recordDate', { date: date.format(parseKey(r.best1rm.date)) })}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
