import type { Workout, WorkoutSet } from '../../db/types'

// Peso máximo estimado para una repetición (fórmula de Epley)
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  const value = reps === 1 ? weight : weight * (1 + reps / 30)
  return Math.round(value * 10) / 10
}

// Kilos totales movidos: peso × repeticiones de las series hechas
export function workoutVolume(workout: Pick<Workout, 'sets'>): number {
  return workout.sets.filter((s) => s.done).reduce((sum, s) => sum + s.weight * s.reps, 0)
}

// La de mayor 1RM estimado; con peso corporal (0 kg) todas empatan y gana la de más repeticiones
export function bestSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  const score = (s: WorkoutSet) => estimate1RM(s.weight, s.reps) * 1000 + s.reps
  return sets
    .filter((s) => s.done && s.reps > 0)
    .reduce<WorkoutSet | undefined>((best, s) => (!best || score(s) > score(best) ? s : best), undefined)
}

// Series hechas de un ejercicio en el último entrenamiento terminado anterior a `before` (para comparar)
export function lastPerformance(workouts: Workout[], exerciseId: string, before: number): WorkoutSet[] {
  const previous = workouts
    .filter((w) => w.finishedAt !== null && w.startedAt < before && w.sets.some((s) => s.exerciseId === exerciseId && s.done))
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  return previous ? previous.sets.filter((s) => s.exerciseId === exerciseId && s.done) : []
}

// "3 × 10 · 40 kg" si todas las series son iguales; si no, "40×10, 45×8, 50×6"
export function formatSets(sets: WorkoutSet[]): string {
  if (sets.length === 0) return ''
  const same = sets.every((s) => s.weight === sets[0].weight && s.reps === sets[0].reps)
  const kg = (w: number) => (w === 0 ? '' : ` · ${w} kg`)
  if (same) return `${sets.length} × ${sets[0].reps}${kg(sets[0].weight)}`
  return sets.map((s) => (s.weight === 0 ? `${s.reps}` : `${s.weight}×${s.reps}`)).join(', ')
}

export interface PersonalRecords {
  exerciseId: string
  // Serie más pesada (con sus repeticiones)
  heaviest: { weight: number; reps: number; date: string }
  // Mayor 1RM estimado
  best1rm: { value: number; weight: number; reps: number; date: string }
  // Más repeticiones en una serie
  mostReps: { reps: number; weight: number; date: string }
  sessions: number
  lastDate: string
}

// Récords de cada ejercicio con las series hechas de los entrenamientos terminados
export function personalRecords(workouts: Workout[]): Map<string, PersonalRecords> {
  const out = new Map<string, PersonalRecords>()
  const done = workouts.filter((w) => w.finishedAt !== null).sort((a, b) => a.startedAt - b.startedAt)
  for (const w of done) {
    const seen = new Set<string>()
    for (const s of w.sets) {
      if (!s.done || s.reps <= 0) continue
      const rm = estimate1RM(s.weight, s.reps)
      const r = out.get(s.exerciseId)
      if (!r) {
        out.set(s.exerciseId, {
          exerciseId: s.exerciseId,
          heaviest: { weight: s.weight, reps: s.reps, date: w.date },
          best1rm: { value: rm, weight: s.weight, reps: s.reps, date: w.date },
          mostReps: { reps: s.reps, weight: s.weight, date: w.date },
          sessions: 1,
          lastDate: w.date,
        })
        seen.add(s.exerciseId)
        continue
      }
      if (!seen.has(s.exerciseId)) {
        r.sessions++
        r.lastDate = w.date
        seen.add(s.exerciseId)
      }
      if (s.weight > r.heaviest.weight || (s.weight === r.heaviest.weight && s.reps > r.heaviest.reps)) r.heaviest = { weight: s.weight, reps: s.reps, date: w.date }
      if (rm > r.best1rm.value) r.best1rm = { value: rm, weight: s.weight, reps: s.reps, date: w.date }
      if (s.reps > r.mostReps.reps) r.mostReps = { reps: s.reps, weight: s.weight, date: w.date }
    }
  }
  return out
}

// ¿Esta serie supera el récord anterior (más peso, o más repeticiones con peso corporal)?
export function isRecordSet(set: Pick<WorkoutSet, 'weight' | 'reps'>, previous: PersonalRecords | undefined): boolean {
  if (!previous || set.reps <= 0) return false
  if (set.weight === 0 && previous.heaviest.weight === 0) return set.reps > previous.mostReps.reps
  return estimate1RM(set.weight, set.reps) > previous.best1rm.value || set.weight > previous.heaviest.weight
}

// Entrenamientos terminados por semana (lunes a domingo), de la más antigua a la actual
export function sessionsPerWeek(workouts: Workout[], mondays: string[]): number[] {
  return mondays.map((from, i) => {
    const to = mondays[i + 1]
    return workouts.filter((w) => w.finishedAt !== null && w.date >= from && (!to || w.date < to)).length
  })
}

// Semanas seguidas (contando hacia atrás desde la actual) con al menos un entrenamiento.
// La semana actual solo rompe la racha cuando ya ha terminado.
export function weekStreak(counts: number[]): number {
  let streak = 0
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) streak++
    else if (i !== counts.length - 1) break
  }
  return streak
}

// Variación de volumen respecto al entrenamiento anterior de la misma plantilla (o al anterior, si es libre)
export function previousSession(workouts: Workout[], workout: Workout): Workout | undefined {
  return workouts
    .filter((w) => w.id !== workout.id && w.finishedAt !== null && w.startedAt < workout.startedAt && (workout.routineId ? w.routineId === workout.routineId : true))
    .sort((a, b) => b.startedAt - a.startedAt)[0]
}
