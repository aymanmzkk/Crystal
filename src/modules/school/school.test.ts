import { describe, expect, it } from 'vitest'
import type { Assessment } from '../../db/types'
import { summarizeGrades } from './grades'

function a(weight: number, grade: number | null): Assessment {
  return { id: String(Math.random()), createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0, subjectId: 's', title: '', kind: 'exam', date: null, time: null, weight, grade, done: grade !== null, notes: '' }
}

describe('calificaciones', () => {
  it('media ponderada de lo que ya tiene nota y lo que falta para el 5', () => {
    // 40 % con un 6 y 20 % con un 8; queda un 40 % por evaluar
    const s = summarizeGrades([a(40, 6), a(20, 8), a(40, null)])
    expect(s.average).toBeCloseTo(6.667, 2)
    expect(s.evaluated).toBeCloseTo(0.6)
    // (5·100 − (240+160)) / 40 = 2,5
    expect(s.needed).toBeCloseTo(2.5)
  })

  it('sin pesos, todas cuentan igual', () => {
    expect(summarizeGrades([a(0, 4), a(0, 8)]).average).toBe(6)
  })

  it('si ya está todo evaluado no hay nota necesaria', () => {
    expect(summarizeGrades([a(50, 7), a(50, 3)])).toMatchObject({ average: 5, needed: null })
  })

  it('si falta mucho la nota necesaria puede pasar de 10', () => {
    expect(summarizeGrades([a(80, 2), a(20, null)]).needed).toBe(17)
  })
})
