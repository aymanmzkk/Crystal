import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus } from '@tabler/icons-react'
import { btnIcon, field } from '../../components/ui'
import { createRecord } from '../../db/repo'
import type { Exercise, MuscleGroup } from '../../db/types'

export const MUSCLES: MuscleGroup[] = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other']

interface ExercisePickerProps {
  exercises: Exercise[]
  // Ejercicios que ya están y no se vuelven a ofrecer
  exclude: string[]
  onPick: (exerciseId: string) => void
}

// Elige un ejercicio del catálogo o crea uno nuevo escribiendo su nombre
export function ExercisePicker({ exercises, exclude, onPick }: ExercisePickerProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>('legs')
  const available = exercises.filter((e) => !exclude.includes(e.id))

  async function createAndPick() {
    const clean = name.trim()
    if (!clean) return
    const existing = exercises.find((e) => e.name.toLowerCase() === clean.toLowerCase())
    onPick(existing ? existing.id : await createRecord('exercises', { name: clean, muscle }))
    setName('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label={t('gym.addExercise')}
          className={`${field} max-w-56`}
        >
          <option value="">{t('gym.addExercise')}…</option>
          {MUSCLES.map((m) => {
            const group = available.filter((e) => e.muscle === m)
            return group.length ? (
              <optgroup key={m} label={t(`gym.muscles.${m}`)}>
                {group.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ) : null
          })}
        </select>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void createAndPick()
          }
        }}
        placeholder={t('gym.newExercise')}
        aria-label={t('gym.newExercise')}
        className={`${field} w-44`}
      />
      <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup)} aria-label={t('gym.muscle')} className={`${field} w-32`}>
        {MUSCLES.map((m) => (
          <option key={m} value={m}>
            {t(`gym.muscles.${m}`)}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => void createAndPick()} aria-label={t('gym.createExercise')} title={t('gym.createExercise')} className={btnIcon}>
        <IconPlus size={18} aria-hidden />
      </button>
    </div>
  )
}
