import type { DateKey, ExerciseTarget, GymRoutine, GymSplit } from '../../db/types'
import { parseKey } from '../../lib/dates'

export const SPLITS: GymSplit[] = ['upper', 'lower', 'push', 'pull', 'legs', 'full', 'cardio', 'rest']

// Plan semanal: un día por posición, de lunes (0) a domingo (6)
export interface GymScheduleDay {
  split: GymSplit
  routineId: string | null
}
export interface GymSchedule {
  days: GymScheduleDay[]
}

export const GYM_SCHEDULE_KEY = 'gym-schedule'

export const DEFAULT_SCHEDULE: GymSchedule = {
  days: [
    { split: 'upper', routineId: null },
    { split: 'lower', routineId: null },
    { split: 'rest', routineId: null },
    { split: 'upper', routineId: null },
    { split: 'lower', routineId: null },
    { split: 'rest', routineId: null },
    { split: 'rest', routineId: null },
  ],
}

export const DEFAULT_TARGET: ExerciseTarget = { sets: 3, reps: '8-12', restSec: 90 }

// Posición en el plan (lunes = 0) de una fecha
export function weekdayIndex(date: DateKey): number {
  return (parseKey(date).getDay() + 6) % 7
}

export function planFor(schedule: GymSchedule, date: DateKey): GymScheduleDay {
  return schedule.days[weekdayIndex(date)] ?? { split: 'rest', routineId: null }
}

export function targetOf(routine: GymRoutine | undefined, exerciseId: string): ExerciseTarget {
  return routine?.targets?.[exerciseId] ?? DEFAULT_TARGET
}

// Días de entrenamiento planificados en una semana
export function plannedPerWeek(schedule: GymSchedule): number {
  return schedule.days.filter((d) => d.split !== 'rest').length
}

// Primer número de un objetivo de repeticiones ("8-12" -> 8)
export function minReps(reps: string): number {
  const n = parseInt(reps, 10)
  return Number.isFinite(n) && n > 0 ? n : 10
}
