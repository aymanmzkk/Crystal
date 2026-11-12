import { describe, expect, it } from 'vitest'
import type { Habit } from '../../db/types'
import { bestStreak, completionRate, currentStreak, isDone } from './stats'

// Creado el lunes 2 de noviembre de 2026
const created = new Date(2026, 10, 2, 8, 0).getTime()

function habit(extra: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    createdAt: created,
    updatedAt: created,
    deletedAt: 0,
    dirty: 0,
    name: 'Leer',
    icon: 'book',
    color: 'blue',
    kind: 'check',
    goal: 1,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    order: 1,
    ...extra,
  }
}

const values = (entries: Record<string, number>) => new Map(Object.entries(entries))

describe('hábitos', () => {
  it('un hábito de contar se cumple al llegar al objetivo', () => {
    const water = habit({ kind: 'count', goal: 8 })
    expect(isDone(water, 7)).toBe(false)
    expect(isDone(water, 8)).toBe(true)
  })

  it('la racha no se rompe si hoy todavía no está hecho', () => {
    const v = values({ '2026-11-02': 1, '2026-11-03': 1, '2026-11-04': 1 })
    expect(currentStreak(habit(), v, '2026-11-05')).toBe(3)
  })

  it('un día que tocaba y no se hizo rompe la racha', () => {
    const v = values({ '2026-11-02': 1, '2026-11-04': 1, '2026-11-05': 1 })
    expect(currentStreak(habit(), v, '2026-11-05')).toBe(2)
    expect(bestStreak(habit(), v, '2026-11-05')).toBe(2)
  })

  it('los días que no tocan no cuentan ni rompen', () => {
    // Solo lunes, miércoles y viernes
    const gym = habit({ weekdays: [1, 3, 5] })
    const v = values({ '2026-11-02': 1, '2026-11-04': 1, '2026-11-06': 1, '2026-11-09': 1 })
    expect(currentStreak(gym, v, '2026-11-10')).toBe(4)
  })

  it('el porcentaje solo cuenta desde que existe el hábito', () => {
    const v = values({ '2026-11-02': 1, '2026-11-03': 1, '2026-11-04': 0, '2026-11-05': 1 })
    expect(completionRate(habit(), v, '2026-11-05')).toBe(0.75)
  })
})
