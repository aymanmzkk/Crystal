import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowDownRight, IconArrowUpRight, IconChevronDown, IconCopy, IconNotes, IconPencil, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary, pill } from '../../components/ui'
import { moveToTrash, restoreFromTrash } from '../../db/repo'
import type { Workout } from '../../db/types'
import { parseKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import { useToast } from '../../store/toast'
import type { GymData } from './GymPage'
import { duplicateRoutine } from './actions'
import { targetOf } from './plan'
import { bestSet, estimate1RM, formatSets, previousSession, workoutVolume } from './stats'

export function WorkoutsTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const { routines, finished, exerciseMap } = data
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
  const nextOrder = Math.max(0, ...routines.map((r) => r.order)) + 1

  async function duplicate(id: string) {
    const routine = routines.find((r) => r.id === id)
    if (!routine) return
    await duplicateRoutine(routine, nextOrder, t('gym.copySuffix'))
    showToast({ message: t('gym.duplicated', { name: routine.name }) })
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="eyebrow">{t('gym.templates')}</h2>
          <button type="button" onClick={() => data.editRoutine(null)} className={`${btn} ml-auto`}>
            <IconPlus size={17} aria-hidden />
            {t('gym.newRoutine')}
          </button>
        </div>
        <ul className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routines.map((routine) => {
            const last = finished.find((w) => w.routineId === routine.id)
            const sets = routine.exerciseIds.reduce((s, id) => s + targetOf(routine, id).sets, 0)
            const minutes = routine.exerciseIds.reduce((s, id) => s + targetOf(routine, id).sets * (45 + targetOf(routine, id).restSec), 0) / 60
            return (
              <li key={routine.id} className="card card-hover flex flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{routine.name}</h3>
                    <p className="mt-0.5 text-xs text-fg-3">
                      {t('gym.exercisesCount', { count: routine.exerciseIds.length })} · {t('gym.setsCount', { count: sets })} · ~{formatMinutes(minutes)}
                    </p>
                  </div>
                  {routine.split && <span className={pill('accent')}>{t(`gym.splits.${routine.split}`)}</span>}
                </div>
                <ul className="flex flex-wrap gap-1">
                  {routine.exerciseIds.slice(0, 6).map((id) => (
                    <li key={id} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-fg-2">
                      {exerciseMap.get(id)?.name ?? '—'}
                    </li>
                  ))}
                  {routine.exerciseIds.length > 6 && <li className="px-1 text-xs text-fg-3">+{routine.exerciseIds.length - 6}</li>}
                </ul>
                <p className="text-xs text-fg-3">{last ? t('gym.lastDone', { date: date.format(parseKey(last.date)) }) : t('gym.neverDone')}</p>
                <div className="mt-auto flex gap-2">
                  <button type="button" onClick={() => data.start(routine)} className={`${btnPrimary} flex-1`}>
                    <IconPlayerPlay size={17} aria-hidden />
                    {t('gym.start')}
                  </button>
                  <button type="button" onClick={() => data.editRoutine(routine.id)} aria-label={t('gym.editRoutine')} title={t('gym.editRoutine')} className={btnIcon}>
                    <IconPencil size={17} aria-hidden />
                  </button>
                  <button type="button" onClick={() => void duplicate(routine.id)} aria-label={t('gym.duplicate')} title={t('gym.duplicate')} className={btnIcon}>
                    <IconCopy size={17} aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
          <li className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong p-5 text-center">
            <p className="text-sm text-fg-2">{routines.length === 0 ? t('gym.emptyRoutines') : t('gym.freeHint')}</p>
            <button type="button" onClick={() => data.start(null)} className={btn}>
              <IconPlayerPlay size={17} aria-hidden />
              {t('gym.startFree')}
            </button>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">{t('gym.history')}</h2>
        {finished.length === 0 ? (
          <p className="card py-10 text-center text-sm text-fg-3">{t('gym.noHistory')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {finished.slice(0, 40).map((w) => (
              <HistoryItem
                key={w.id}
                workout={w}
                previous={previousSession(finished, w)}
                names={exerciseMap}
                onTrash={async () => {
                  await moveToTrash('workouts', w.id)
                  showToast({ message: t('gym.discarded'), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('workouts', w.id) } })
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Delta({ value, unit = '%' }: { value: number | null; unit?: string }) {
  if (value === null || !Number.isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={`inline-flex items-center text-xs font-medium tabular-nums ${up ? 'text-success' : 'text-danger'}`}>
      {up ? <IconArrowUpRight size={13} aria-hidden /> : <IconArrowDownRight size={13} aria-hidden />}
      {Math.abs(Math.round(value))}
      {unit}
    </span>
  )
}

function HistoryItem({ workout: w, previous, names, onTrash }: { workout: Workout; previous: Workout | undefined; names: Map<string, { name: string }>; onTrash: () => void }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
  const vol = workoutVolume(w)
  const prevVol = previous ? workoutVolume(previous) : 0
  const byExercise = w.exerciseIds.map((id) => ({ id, sets: w.sets.filter((s) => s.exerciseId === id) })).filter((x) => x.sets.length)

  return (
    <li className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-surface-2/50">
        <span className="font-semibold">{w.name}</span>
        <span className="text-sm text-fg-2 first-letter:uppercase">
          {date.format(parseKey(w.date))} · {formatMinutes((w.finishedAt! - w.startedAt) / 60_000)}
        </span>
        <span className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-fg-2">{t('gym.setsDone', { count: w.sets.length })}</span>
          <span className="font-semibold tabular-nums">{Math.round(vol)} kg</span>
          {previous && prevVol > 0 && <Delta value={((vol - prevVol) / prevVol) * 100} />}
          <IconChevronDown size={17} className={`text-fg-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && (
        <div className="animate-[pop-in_0.2s_var(--ease-out-soft)] border-t border-line px-4 py-3">
          {previous && <p className="mb-2 text-xs text-fg-3">{t('gym.comparedWith', { date: date.format(parseKey(previous.date)) })}</p>}
          <ul className="flex flex-col gap-1.5 text-sm">
            {byExercise.map((x) => {
              const best = bestSet(x.sets)
              const prevBest = previous ? bestSet(previous.sets.filter((s) => s.exerciseId === x.id)) : undefined
              const change = best && prevBest && estimate1RM(prevBest.weight, prevBest.reps) > 0 ? estimate1RM(best.weight, best.reps) - estimate1RM(prevBest.weight, prevBest.reps) : null
              return (
                <li key={x.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{names.get(x.id)?.name ?? '—'}</span>
                  <span className="flex shrink-0 items-center gap-2 text-fg-2">
                    {formatSets(x.sets)}
                    {change !== null && change !== 0 && <Delta value={change} unit=" kg" />}
                  </span>
                </li>
              )
            })}
          </ul>
          {w.notes && (
            <p className="mt-3 flex gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-xs text-fg-2">
              <IconNotes size={15} className="shrink-0" aria-hidden />
              {w.notes}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onTrash} className={`${btnIcon} size-8`} aria-label={t('calendar.form.delete')}>
              <IconTrash size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
