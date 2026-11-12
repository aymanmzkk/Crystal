import { describe, expect, it } from 'vitest'
import type { Workout, WorkoutSet } from '../../db/types'
import { bestSet, estimate1RM, formatSets, isRecordSet, lastPerformance, personalRecords, weekStreak, workoutVolume } from './stats'

const set = (exerciseId: string, weight: number, reps: number, done = true): WorkoutSet => ({ id: `${weight}-${reps}`, exerciseId, weight, reps, done })

function workout(startedAt: number, sets: WorkoutSet[], finished = true): Workout {
  return { id: String(startedAt), createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0, name: 'Pierna', date: '2026-11-01', routineId: null, startedAt, finishedAt: finished ? startedAt + 3600_000 : null, exerciseIds: [], sets, notes: '' }
}

describe('gimnasio', () => {
  it('estima el 1RM con la fórmula de Epley', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(80, 10)).toBe(106.7)
    expect(estimate1RM(0, 10)).toBe(0)
  })

  it('el volumen solo cuenta las series hechas', () => {
    expect(workoutVolume(workout(0, [set('sq', 60, 10), set('sq', 60, 8), set('sq', 70, 5, false)]))).toBe(1080)
  })

  it('la mejor serie es la de mayor 1RM estimado', () => {
    // 60×12 ≈ 84, 80×5 ≈ 93,3 y 70×6 ≈ 84
    expect(bestSet([set('sq', 60, 12), set('sq', 80, 5), set('sq', 70, 6)])).toMatchObject({ weight: 80, reps: 5 })
  })

  it('compara con el último entrenamiento terminado que tuvo ese ejercicio', () => {
    const list = [workout(1000, [set('sq', 50, 10)]), workout(2000, [set('bench', 40, 10)]), workout(3000, [set('sq', 55, 10)], false)]
    expect(lastPerformance(list, 'sq', 4000)).toEqual([set('sq', 50, 10)])
  })

  it('resume las series', () => {
    expect(formatSets([set('sq', 40, 10), set('sq', 40, 10), set('sq', 40, 10)])).toBe('3 × 10 · 40 kg')
    expect(formatSets([set('sq', 40, 10), set('sq', 45, 8)])).toBe('40×10, 45×8')
    expect(formatSets([set('pull', 0, 8), set('pull', 0, 8)])).toBe('2 × 8')
  })
})

describe('récords y constancia', () => {
  const set = (exerciseId: string, weight: number, reps: number) => ({ id: crypto.randomUUID(), exerciseId, weight, reps, done: true })
  const w = (date: string, startedAt: number, sets: ReturnType<typeof set>[]) => ({
    id: crypto.randomUUID(), createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0 as const,
    name: 'A', date, routineId: 'r', startedAt, finishedAt: startedAt + 1, exerciseIds: [], sets, notes: '',
  })
  it('personalRecords guarda la serie más pesada, el mejor 1RM y más repeticiones', () => {
    const r = personalRecords([w('2026-11-01', 1, [set('sq', 80, 5), set('sq', 60, 12)]), w('2026-11-03', 2, [set('sq', 85, 3)])]).get('sq')!
    expect(r.heaviest).toEqual({ weight: 85, reps: 3, date: '2026-11-03' })
    expect(r.mostReps.reps).toBe(12)
    expect(r.best1rm.weight).toBe(85)
    expect(r.sessions).toBe(2)
    expect(isRecordSet({ weight: 90, reps: 1 }, r)).toBe(true)
    expect(isRecordSet({ weight: 50, reps: 5 }, r)).toBe(false)
  })
  it('weekStreak no rompe la racha por la semana actual vacía', () => {
    expect(weekStreak([1, 0, 2, 3, 0])).toBe(2)
    expect(weekStreak([1, 2, 3])).toBe(3)
  })
})
