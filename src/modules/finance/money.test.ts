import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../db/types'
import { advanceDate, monthlyEquivalent, monthlyNeeded, parseAmount, totals } from './money'

const tx = (type: Transaction['type'], amount: number, category: Transaction['category']): Transaction => ({
  id: String(Math.random()),
  createdAt: 0,
  updatedAt: 0,
  deletedAt: 0,
  dirty: 0,
  title: '',
  type,
  amount,
  category,
  date: '2026-11-05',
  subscriptionId: null,
})

describe('finanzas', () => {
  it('suma ingresos, gastos y gasto por categoría ordenado', () => {
    const r = totals([tx('income', 900, 'salary'), tx('expense', 40.5, 'food'), tx('expense', 12.99, 'subscriptions'), tx('expense', 30, 'food')])
    expect(r).toEqual({ income: 900, expense: 83.49, balance: 816.51, byCategory: [['food', 70.5], ['subscriptions', 12.99]] })
  })

  it('una suscripción anual cuenta como su parte mensual', () => {
    expect(monthlyEquivalent({ amount: 59.99, cycle: 'yearly' })).toBe(5)
    expect(monthlyEquivalent({ amount: 12.99, cycle: 'monthly' })).toBe(12.99)
  })

  it('el siguiente cobro respeta el fin de mes', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(advanceDate('2026-11-15', 'monthly')).toBe('2026-12-15')
    expect(advanceDate('2024-02-29', 'yearly')).toBe('2025-02-28')
  })

  it('reparte lo que falta para la meta entre los meses que quedan', () => {
    expect(monthlyNeeded({ target: 600, saved: 150, deadline: '2027-02-28' }, '2026-11-05')).toBe(150)
    expect(monthlyNeeded({ target: 600, saved: 600, deadline: '2027-02-28' }, '2026-11-05')).toBeNull()
  })

  it('entiende importes con coma o punto', () => {
    expect(parseAmount('12,99')).toBe(12.99)
    expect(parseAmount('12.99')).toBe(12.99)
    expect(parseAmount('1.234,50 €')).toBe(1234.5)
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('hola')).toBeNull()
  })
})
