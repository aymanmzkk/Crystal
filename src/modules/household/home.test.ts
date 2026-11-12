import { describe, expect, it } from 'vitest'
import { choreDaysLeft, guessAisle, parseItem } from './home'

describe('casa', () => {
  it('adivina el pasillo por el nombre', () => {
    expect(guessAisle('Leche semidesnatada')).toBe('dairy')
    expect(guessAisle('Pasta de dientes')).toBe('hygiene')
    expect(guessAisle('Macarrones')).toBe('pantry')
    expect(guessAisle('Bombillas')).toBe('other')
  })

  it('no confunde palabras que solo contienen otra ("salmón" no es sal)', () => {
    expect(guessAisle('Salmón')).toBe('meat')
    expect(guessAisle('Ensalada')).toBe('other')
  })

  it('lee la cantidad', () => {
    expect(parseItem('leche x2')).toEqual({ name: 'leche', quantity: '2' })
    expect(parseItem('3 yogures')).toEqual({ name: 'yogures', quantity: '3' })
    expect(parseItem('patatas 2kg')).toEqual({ name: 'patatas', quantity: '2kg' })
    expect(parseItem('pan')).toEqual({ name: 'pan', quantity: '' })
  })

  it('calcula cuándo toca una tarea', () => {
    expect(choreDaysLeft({ everyDays: 7, lastDone: '2026-11-01' }, '2026-11-06')).toBe(2)
    expect(choreDaysLeft({ everyDays: 3, lastDone: '2026-11-01' }, '2026-11-06')).toBe(-2)
    expect(choreDaysLeft({ everyDays: 3, lastDone: null }, '2026-11-06')).toBe(0)
  })
})
