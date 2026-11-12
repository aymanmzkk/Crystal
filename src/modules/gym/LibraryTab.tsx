import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBooks, IconPlus, IconSearch, IconSparkles, IconTrash } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary, field, toggleChip } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Exercise, MuscleGroup } from '../../db/types'
import { formatNumber } from '../../lib/format'
import { useToast } from '../../store/toast'
import { MUSCLES } from './ExercisePicker'
import type { GymData } from './GymPage'
import { addBasicExercises } from './actions'
import { personalRecords } from './stats'

// Biblioteca de ejercicios: buscar, filtrar por músculo, crear, renombrar y quitar
export function LibraryTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const { exercises, finished, routines } = data
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('')
  const [name, setName] = useState('')
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('legs')
  const records = useMemo(() => personalRecords(finished), [finished])
  const words = query.trim().toLowerCase()
  const list = exercises.filter((e) => (!muscle || e.muscle === muscle) && (!words || e.name.toLowerCase().includes(words))).sort((a, b) => a.name.localeCompare(b.name))
  const groups = MUSCLES.map((m) => ({ m, items: list.filter((e) => e.muscle === m) })).filter((g) => g.items.length)
  const inUse = (id: string) => routines.filter((r) => r.exerciseIds.includes(id)).length

  async function add(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    if (exercises.some((x) => x.name.toLowerCase() === clean.toLowerCase())) {
      showToast({ message: t('gym.exerciseExists', { name: clean }) })
      return
    }
    await createRecord('exercises', { name: clean, muscle: newMuscle })
    setName('')
  }

  async function basics() {
    const added = await addBasicExercises(exercises, (key) => t(`gym.library.${key}`))
    showToast({ message: t('gym.basicsAdded', { count: added }) })
  }

  async function trash(ex: Exercise) {
    await moveToTrash('exercises', ex.id)
    showToast({ message: t('calendar.toast.trashed', { name: ex.name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('exercises', ex.id) } })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 sm:max-w-xs">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-3" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('gym.searchExercise')} aria-label={t('gym.searchExercise')} className={`${field} w-full pl-8`} />
        </label>
        <div className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={!muscle} onClick={() => setMuscle('')} className={toggleChip(!muscle)}>
            {t('gym.allMuscles')} · {exercises.length}
          </button>
          {MUSCLES.map((m) => (
            <button key={m} type="button" aria-pressed={muscle === m} onClick={() => setMuscle(m)} className={toggleChip(muscle === m)}>
              {t(`gym.muscles.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => void add(e)} className="card flex flex-wrap items-center gap-2 p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('gym.newExercisePlaceholder')} aria-label={t('gym.createExercise')} className={`${field} min-w-48 flex-1`} />
        <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)} aria-label={t('gym.muscle')} className={`${field} w-36`}>
          {MUSCLES.map((m) => (
            <option key={m} value={m}>
              {t(`gym.muscles.${m}`)}
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          <IconPlus size={17} aria-hidden />
          {t('gym.createExercise')}
        </button>
        <button type="button" onClick={() => void basics()} className={btn}>
          <IconSparkles size={17} aria-hidden />
          {t('gym.addBasics')}
        </button>
      </form>

      {exercises.length === 0 && (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <IconBooks size={30} stroke={1.5} className="text-fg-3" aria-hidden />
          <p className="text-fg-2">{t('gym.libraryEmpty')}</p>
        </div>
      )}

      {groups.map(({ m, items }) => (
        <section key={m}>
          <h2 className="eyebrow mb-2">
            {t(`gym.muscles.${m}`)} · {items.length}
          </h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {items.map((ex) => {
              const r = records.get(ex.id)
              const uses = inUse(ex.id)
              return (
                <li key={ex.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors hover:bg-surface-2/50">
                  <input
                    key={ex.name}
                    defaultValue={ex.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== ex.name && void updateRecord('exercises', ex.id, { name: e.target.value.trim() })}
                    aria-label={t('habits.name')}
                    className="min-w-40 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-(--ring)"
                  />
                  <span className="text-xs text-fg-3">
                    {r ? (r.heaviest.weight ? `${t('gym.bestWeight')}: ${formatNumber(r.heaviest.weight, i18n.language)} kg × ${r.heaviest.reps}` : `${t('gym.mostReps')}: ${r.mostReps.reps}`) : t('gym.neverDone')}
                    {uses > 0 && ` · ${t('gym.inTemplates', { count: uses })}`}
                  </span>
                  <select value={ex.muscle} onChange={(e) => void updateRecord('exercises', ex.id, { muscle: e.target.value as MuscleGroup })} aria-label={`${t('gym.muscle')}: ${ex.name}`} className={`${field} h-8 w-32 text-xs`}>
                    {MUSCLES.map((mm) => (
                      <option key={mm} value={mm}>
                        {t(`gym.muscles.${mm}`)}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => void trash(ex)} aria-label={`${t('calendar.form.delete')}: ${ex.name}`} className={`${btnIcon} size-8 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100`}>
                    <IconTrash size={16} aria-hidden />
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
