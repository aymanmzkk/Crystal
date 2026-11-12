import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowDown, IconArrowUp, IconTrash, IconX } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnIcon, btnPrimary, field, fieldError, fieldLabel, input, textarea, toggleChip } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Exercise, ExerciseTarget, GymRoutine, GymSplit } from '../../db/types'
import { useToast } from '../../store/toast'
import { ExercisePicker } from './ExercisePicker'
import { DEFAULT_TARGET, SPLITS } from './plan'

interface GymRoutinePanelProps {
  routine?: GymRoutine
  exercises: Exercise[]
  nextOrder: number
  onClose: () => void
}

export function GymRoutinePanel({ routine, exercises, nextOrder, onClose }: GymRoutinePanelProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [name, setName] = useState(routine?.name ?? '')
  const [exerciseIds, setExerciseIds] = useState<string[]>(routine?.exerciseIds ?? [])
  const [split, setSplit] = useState<GymSplit | undefined>(routine?.split)
  const [targets, setTargets] = useState<Record<string, ExerciseTarget>>(routine?.targets ?? {})
  const [notes, setNotes] = useState(routine?.notes ?? '')
  const target = (exerciseId: string) => targets[exerciseId] ?? DEFAULT_TARGET
  const setTarget = (exerciseId: string, change: Partial<ExerciseTarget>) => setTargets((all) => ({ ...all, [exerciseId]: { ...target(exerciseId), ...change } }))
  const [errors, setErrors] = useState<string[]>([])
  const byId = new Map(exercises.map((e) => [e.id, e]))

  const move = (index: number, dir: -1 | 1) =>
    setExerciseIds((list) => {
      const copy = [...list]
      ;[copy[index], copy[index + dir]] = [copy[index + dir], copy[index]]
      return copy
    })

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = [!name.trim() && 'name', exerciseIds.length === 0 && 'exercises'].filter(Boolean) as string[]
    if (found.length) {
      setErrors(found)
      return
    }
    // Solo se guardan los objetivos de los ejercicios que siguen en la plantilla
    const kept = Object.fromEntries(exerciseIds.map((id) => [id, target(id)]))
    const data = { name: name.trim(), exerciseIds, split, targets: kept, notes: notes.trim() }
    if (routine) await updateRecord('gymRoutines', routine.id, data)
    else await createRecord('gymRoutines', { ...data, order: nextOrder })
    onClose()
  }

  async function trash() {
    if (!routine) return
    await moveToTrash('gymRoutines', routine.id)
    showToast({
      message: t('calendar.toast.trashed', { name: routine.name }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('gymRoutines', routine.id) },
    })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {routine && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={routine ? t('gym.editRoutine') : t('gym.newRoutine')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-name`} className={fieldLabel}>
            {t('habits.name')}
          </label>
          <input
            id={`${id}-name`}
            autoFocus={!routine}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors([])
            }}
            placeholder={t('gym.routinePlaceholder')}
            aria-invalid={errors.includes('name')}
            className={input}
          />
          {errors.includes('name') && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
        </div>
        <fieldset>
          <legend className={fieldLabel}>{t('gym.splitLabel')}</legend>
          <div className="flex flex-wrap gap-1">
            {SPLITS.filter((s) => s !== 'rest').map((s) => (
              <button key={s} type="button" aria-pressed={split === s} onClick={() => setSplit(split === s ? undefined : s)} className={toggleChip(split === s)}>
                {t(`gym.splits.${s}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={fieldLabel}>{t('gym.exercises')}</legend>
          <ol className="mb-2 flex flex-col gap-1">
            {exerciseIds.map((exerciseId, index) => (
              <li key={exerciseId} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/40 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 text-right text-xs text-fg-3">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{byId.get(exerciseId)?.name ?? '—'}</span>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('gym.moveUp')} className={`${btnIcon} size-7 disabled:opacity-30`}>
                    <IconArrowUp size={16} aria-hidden />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === exerciseIds.length - 1} aria-label={t('gym.moveDown')} className={`${btnIcon} size-7 disabled:opacity-30`}>
                    <IconArrowDown size={16} aria-hidden />
                  </button>
                  <button type="button" onClick={() => setExerciseIds((l) => l.filter((x) => x !== exerciseId))} aria-label={t('gym.removeExercise')} className={`${btnIcon} size-7`}>
                    <IconX size={16} aria-hidden />
                  </button>
                </div>
                {/* Objetivo: series, repeticiones y descanso */}
                <div className="grid grid-cols-3 gap-1.5 pl-6">
                  <label className="text-[0.6875rem] text-fg-3">
                    {t('gym.sets')}
                    <input type="number" min={1} max={12} value={target(exerciseId).sets} onChange={(e) => setTarget(exerciseId, { sets: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} className={`${field} mt-0.5 h-8 w-full`} />
                  </label>
                  <label className="text-[0.6875rem] text-fg-3">
                    {t('gym.reps')}
                    <input value={target(exerciseId).reps} onChange={(e) => setTarget(exerciseId, { reps: e.target.value })} placeholder="8-12" className={`${field} mt-0.5 h-8 w-full`} />
                  </label>
                  <label className="text-[0.6875rem] text-fg-3">
                    {t('gym.restSeconds')}
                    <input type="number" min={0} step={15} value={target(exerciseId).restSec} onChange={(e) => setTarget(exerciseId, { restSec: Math.max(0, Number(e.target.value) || 0) })} className={`${field} mt-0.5 h-8 w-full`} />
                  </label>
                </div>
              </li>
            ))}
          </ol>
          <ExercisePicker
            exercises={exercises}
            exclude={exerciseIds}
            onPick={(exerciseId) => {
              setExerciseIds((l) => [...l, exerciseId])
              setErrors([])
            }}
          />
          {errors.includes('exercises') && <p className={fieldError}>{t('gym.errors.exercises')}</p>}
        </fieldset>
        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('gym.templateNotesPlaceholder')} className={textarea} />
        </div>
      </form>
    </SidePanel>
  )
}
