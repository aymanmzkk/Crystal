import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowDownRight, IconArrowUpRight, IconCheck, IconClockPause, IconFlag, IconPlus, IconTrash, IconTrophy, IconX } from '@tabler/icons-react'
import { btn, btnDanger, btnGhost, btnIcon, btnPrimary, field, textarea } from '../../components/ui'
import { moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Exercise, GymRoutine, Workout, WorkoutSet } from '../../db/types'
import { formatMinutes } from '../../lib/format'
import { useToast } from '../../store/toast'
import { ExercisePicker } from './ExercisePicker'
import { targetOf } from './plan'
import { formatSets, isRecordSet, lastPerformance, personalRecords, workoutVolume } from './stats'

interface ActiveWorkoutProps {
  workout: Workout
  history: Workout[]
  exercises: Exercise[]
  // Plantilla de la que viene (para los objetivos y el descanso)
  routine?: GymRoutine
}

// Botón de serie hecha: relleno con el color principal (no se combina con btnIcon para que no choquen los colores)
const DONE_BUTTON = 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-success text-white shadow-sm transition-transform active:scale-90'

const newSet = (exerciseId: string, from?: Pick<WorkoutSet, 'weight' | 'reps'>): WorkoutSet => ({
  id: crypto.randomUUID(),
  exerciseId,
  weight: from?.weight ?? 0,
  reps: from?.reps ?? 10,
  done: false,
})

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`

// Entrenamiento en marcha. Se edita en local y se guarda en la base de datos medio segundo después de cada cambio.
export function ActiveWorkout({ workout, history, exercises, routine }: ActiveWorkoutProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const [draft, setDraft] = useState(workout)
  const [now, setNow] = useState(() => Date.now())
  // Descanso en marcha: cuándo termina
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const first = useRef(true)
  // Al terminar o descartar ya no se guardan los cambios pendientes
  const closed = useRef(false)
  // Récords de antes de esta sesión, para avisar cuando se superan
  const records = useMemo(() => personalRecords(history.filter((w) => w.id !== workout.id)), [history, workout.id])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Aviso suave al acabar el descanso
  useEffect(() => {
    if (restUntil && now >= restUntil) {
      setRestUntil(null)
      navigator.vibrate?.(200)
    }
  }, [now, restUntil])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(() => {
      if (!closed.current) void updateRecord('workouts', workout.id, { exerciseIds: draft.exerciseIds, sets: draft.sets, name: draft.name, notes: draft.notes })
    }, 500)
    return () => clearTimeout(timer)
  }, [draft, workout.id])

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const setSets = (fn: (sets: WorkoutSet[]) => WorkoutSet[]) => setDraft((d) => ({ ...d, sets: fn(d.sets) }))
  const changeSet = (id: string, change: Partial<WorkoutSet>) => setSets((sets) => sets.map((s) => (s.id === id ? { ...s, ...change } : s)))
  const doneSets = draft.sets.filter((s) => s.done)
  const totalSets = draft.sets.length

  function toggleSet(s: WorkoutSet) {
    changeSet(s.id, { done: !s.done })
    // Al marcar una serie empieza el descanso de ese ejercicio
    if (!s.done) setRestUntil(Date.now() + targetOf(routine, s.exerciseId).restSec * 1000)
  }

  function addExercise(exerciseId: string) {
    const previous = lastPerformance(history, exerciseId, workout.startedAt)
    const sets = previous.length ? previous.map((s) => newSet(exerciseId, s)) : [newSet(exerciseId), newSet(exerciseId), newSet(exerciseId)]
    setDraft((d) => ({ ...d, exerciseIds: [...d.exerciseIds, exerciseId], sets: [...d.sets, ...sets] }))
  }

  async function finish() {
    closed.current = true
    // Las series sin marcar no se guardan
    await updateRecord('workouts', workout.id, { name: draft.name, exerciseIds: draft.exerciseIds, sets: doneSets, notes: draft.notes, finishedAt: Date.now() })
    showToast({ message: t('gym.finished', { volume: Math.round(workoutVolume(draft)), sets: doneSets.length }) })
  }

  async function discard() {
    closed.current = true
    await moveToTrash('workouts', workout.id)
    showToast({ message: t('gym.discarded'), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('workouts', workout.id) } })
  }

  const restLeft = restUntil ? Math.ceil((restUntil - now) / 1000) : 0

  return (
    <section aria-label={t('gym.inProgress')} className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Cabecera: nombre, tiempo, progreso */}
      <div className="card sticky top-[6.75rem] z-10 flex flex-col gap-3 p-3.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label={t('habits.name')} className={`${field} min-w-40 flex-1 font-semibold`} />
          <button type="button" onClick={() => void finish()} className={btnPrimary}>
            <IconFlag size={18} aria-hidden />
            {t('gym.finish')}
          </button>
          <button type="button" onClick={() => void discard()} className={btnDanger} title={t('gym.discard')}>
            <IconTrash size={18} aria-hidden />
            <span className="sr-only">{t('gym.discard')}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-2 tabular-nums">
          <span>{formatMinutes((now - workout.startedAt) / 60_000)}</span>
          <span>
            {t('gym.setsDone', { count: doneSets.length })} / {totalSets}
          </span>
          <span>{Math.round(workoutVolume(draft))} kg</span>
          {restUntil && (
            <span className="ml-auto inline-flex animate-[pop-in_0.2s_var(--ease-out-soft)] items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-3 py-1 font-semibold text-accent" role="timer" aria-live="off">
              <IconClockPause size={16} aria-hidden />
              {t('gym.rest')} {clock(restLeft)}
              <button type="button" onClick={() => setRestUntil((r) => (r ? r + 30_000 : r))} className="rounded px-1 text-xs hover:bg-surface-2">
                +30 s
              </button>
              <button type="button" onClick={() => setRestUntil(null)} aria-label={t('gym.skipRest')} className="rounded p-0.5 hover:bg-surface-2">
                <IconX size={14} aria-hidden />
              </button>
            </span>
          )}
        </div>
        <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <span className="accent-gradient block h-full rounded-full transition-[width] duration-500" style={{ width: `${totalSets ? (doneSets.length / totalSets) * 100 : 0}%` }} />
        </span>
      </div>

      {draft.exerciseIds.map((exerciseId) => {
        const exercise = byId.get(exerciseId)
        const sets = draft.sets.filter((s) => s.exerciseId === exerciseId)
        const previous = lastPerformance(history, exerciseId, workout.startedAt)
        const target = targetOf(routine, exerciseId)
        const allDone = sets.length > 0 && sets.every((s) => s.done)
        return (
          <article key={exerciseId} className={`card overflow-hidden transition-[border-color] ${allDone ? 'border-[color-mix(in_srgb,var(--success)_45%,var(--line))]' : ''}`}>
            <header className="flex items-start gap-2 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 truncate font-semibold">
                  {allDone && <IconCheck size={16} className="text-success" stroke={3} aria-hidden />}
                  {exercise?.name ?? '—'}
                </h3>
                <p className="mt-0.5 text-xs text-fg-3">
                  {routine?.exerciseIds.includes(exerciseId) && `${t('gym.target')}: ${target.sets} × ${target.reps} · ${t('gym.restShort', { sec: target.restSec })}`}
                  {previous.length > 0 && <span className="block sm:inline sm:before:mx-1.5 sm:before:content-['·']">{t('gym.lastTime', { sets: formatSets(previous) })}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, exerciseIds: d.exerciseIds.filter((x) => x !== exerciseId), sets: d.sets.filter((s) => s.exerciseId !== exerciseId) }))}
                aria-label={t('gym.removeExercise')}
                className={`${btnIcon} size-8`}
              >
                <IconX size={17} aria-hidden />
              </button>
            </header>
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-x-2 gap-y-1 px-4 py-2 text-sm">
              <span className="text-xs text-fg-3">#</span>
              <span className="text-xs text-fg-3">kg</span>
              <span className="text-xs text-fg-3">{t('gym.reps')}</span>
              <span className="text-xs text-fg-3">{t('gym.previous')}</span>
              <span />
              {sets.map((s, i) => {
                const prev = previous[i]
                const better = prev ? s.weight * s.reps - prev.weight * prev.reps : 0
                const record = s.done && isRecordSet(s, records.get(exerciseId))
                return (
                  <div key={s.id} className="contents">
                    <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${s.done ? 'bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-success' : 'bg-surface-2 text-fg-3'}`}>{i + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={s.weight}
                      onChange={(e) => changeSet(s.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                      aria-label={`${exercise?.name} ${t('gym.set')} ${i + 1}: kg`}
                      className={`${field} w-full tabular-nums`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={s.reps}
                      onChange={(e) => changeSet(s.id, { reps: Math.max(0, Math.round(Number(e.target.value)) || 0) })}
                      aria-label={`${exercise?.name} ${t('gym.set')} ${i + 1}: ${t('gym.reps')}`}
                      className={`${field} w-full tabular-nums`}
                    />
                    <span className="flex min-w-0 items-center gap-1 text-xs text-fg-3 tabular-nums">
                      {record ? (
                        <span className="inline-flex animate-[pop-in_0.3s_var(--ease-out-soft)] items-center gap-0.5 font-semibold text-warning">
                          <IconTrophy size={13} aria-hidden />
                          {t('gym.newRecord')}
                        </span>
                      ) : prev ? (
                        <>
                          <span className="truncate">{prev.weight ? `${prev.weight}×${prev.reps}` : prev.reps}</span>
                          {better > 0 && <IconArrowUpRight size={13} className="shrink-0 text-success" aria-label={t('gym.better')} />}
                          {better < 0 && <IconArrowDownRight size={13} className="shrink-0 text-danger" aria-label={t('gym.worse')} />}
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                    <span className="flex justify-end gap-1">
                      <button type="button" aria-pressed={s.done} onClick={() => toggleSet(s)} aria-label={`${t('gym.markSet')} ${i + 1}`} className={s.done ? DONE_BUTTON : `${btnIcon}`}>
                        <IconCheck size={18} stroke={s.done ? 3 : 2} aria-hidden />
                      </button>
                      <button type="button" onClick={() => setSets((all) => all.filter((x) => x.id !== s.id))} aria-label={t('gym.removeSet')} className={`${btnIcon} hidden sm:inline-flex`}>
                        <IconX size={16} aria-hidden />
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-line px-4 py-2">
              <button type="button" onClick={() => setSets((all) => [...all, newSet(exerciseId, sets[sets.length - 1])])} className={btnGhost}>
                <IconPlus size={16} aria-hidden />
                {t('gym.addSet')}
              </button>
            </div>
          </article>
        )
      })}

      <div className="rounded-[14px] border border-dashed border-line-strong p-3">
        <ExercisePicker exercises={exercises} exclude={draft.exerciseIds} onPick={addExercise} />
      </div>

      <label className="card block p-3">
        <span className="mb-1.5 block text-xs font-medium text-fg-2">{t('gym.sessionNotes')}</span>
        <textarea rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder={t('gym.sessionNotesPlaceholder')} className={textarea} />
      </label>
      <p className="text-xs text-fg-3">{t('gym.unmarkedHint')}</p>
      <button type="button" onClick={() => void finish()} className={`${btn} self-center`}>
        <IconFlag size={17} aria-hidden />
        {t('gym.finish')}
      </button>
    </section>
  )
}
