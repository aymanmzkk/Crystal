import { createRecord } from '../../db/repo'
import type { Exercise, GymRoutine, MuscleGroup, Workout, WorkoutSet } from '../../db/types'
import { minReps, targetOf } from './plan'
import { lastPerformance } from './stats'

// Empieza un entrenamiento. Con plantilla: tantas series como diga el objetivo, con el peso y las repeticiones de la última vez.
export async function startWorkout(routine: GymRoutine | null, history: Workout[], date: string, freeName: string): Promise<string> {
  const now = Date.now()
  const exerciseIds = routine?.exerciseIds ?? []
  const sets: WorkoutSet[] = exerciseIds.flatMap((exerciseId) => {
    const target = targetOf(routine ?? undefined, exerciseId)
    const previous = lastPerformance(history, exerciseId, now)
    return Array.from({ length: Math.max(1, target.sets) }, (_, i) => {
      const from = previous[i] ?? previous[previous.length - 1]
      return { id: crypto.randomUUID(), exerciseId, weight: from?.weight ?? 0, reps: from?.reps ?? minReps(target.reps), done: false }
    })
  })
  return createRecord('workouts', {
    name: routine?.name ?? freeName,
    date,
    routineId: routine?.id ?? null,
    startedAt: now,
    finishedAt: null,
    exerciseIds,
    sets,
    notes: '',
  })
}

// Copia de una plantilla, al final de la lista
export async function duplicateRoutine(routine: GymRoutine, nextOrder: number, suffix: string): Promise<string> {
  return createRecord('gymRoutines', {
    name: `${routine.name} ${suffix}`,
    exerciseIds: [...routine.exerciseIds],
    order: nextOrder,
    split: routine.split,
    targets: routine.targets ? structuredClone(routine.targets) : undefined,
    notes: routine.notes ?? '',
  })
}

// Ejercicios básicos para empezar la biblioteca (el nombre sale de las traducciones: gym.library.<clave>)
export const BASIC_EXERCISES: { key: string; muscle: MuscleGroup }[] = [
  { key: 'squat', muscle: 'legs' },
  { key: 'legPress', muscle: 'legs' },
  { key: 'lunge', muscle: 'legs' },
  { key: 'romanianDeadlift', muscle: 'legs' },
  { key: 'legCurl', muscle: 'legs' },
  { key: 'legExtension', muscle: 'legs' },
  { key: 'calfRaise', muscle: 'legs' },
  { key: 'hipThrust', muscle: 'legs' },
  { key: 'benchPress', muscle: 'chest' },
  { key: 'inclineDumbbellPress', muscle: 'chest' },
  { key: 'chestFly', muscle: 'chest' },
  { key: 'pushUp', muscle: 'chest' },
  { key: 'deadlift', muscle: 'back' },
  { key: 'pullUp', muscle: 'back' },
  { key: 'latPulldown', muscle: 'back' },
  { key: 'barbellRow', muscle: 'back' },
  { key: 'seatedRow', muscle: 'back' },
  { key: 'overheadPress', muscle: 'shoulders' },
  { key: 'lateralRaise', muscle: 'shoulders' },
  { key: 'facePull', muscle: 'shoulders' },
  { key: 'bicepsCurl', muscle: 'arms' },
  { key: 'hammerCurl', muscle: 'arms' },
  { key: 'tricepsPushdown', muscle: 'arms' },
  { key: 'dips', muscle: 'arms' },
  { key: 'plank', muscle: 'core' },
  { key: 'crunch', muscle: 'core' },
  { key: 'hangingLegRaise', muscle: 'core' },
  { key: 'running', muscle: 'cardio' },
  { key: 'cycling', muscle: 'cardio' },
  { key: 'rowingMachine', muscle: 'cardio' },
]

// Añade los ejercicios básicos que falten (por nombre). Devuelve cuántos ha añadido.
export async function addBasicExercises(existing: Exercise[], nameOf: (key: string) => string): Promise<number> {
  const names = new Set(existing.map((e) => e.name.trim().toLowerCase()))
  let added = 0
  for (const { key, muscle } of BASIC_EXERCISES) {
    const name = nameOf(key)
    if (names.has(name.toLowerCase())) continue
    await createRecord('exercises', { name, muscle })
    added++
  }
  return added
}
