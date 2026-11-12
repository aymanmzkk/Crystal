import { describe, expect, it } from 'vitest'
import type { Trip } from '../../db/types'
import { emptyTripParts, prepProgress, spendByCategory, totalSpend, tripDays, tripStatus } from './trip'

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 't', createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0,
  name: 'Lisboa', destination: 'Lisboa', country: 'Portugal', start: '2026-11-29', end: '2026-12-01', budget: 400, packing: [], itinerary: '',
  ...emptyTripParts(),
  ...over,
})

describe('tripStatus', () => {
  it('distingue planificando, muy pronto, en curso y terminado', () => {
    expect(tripStatus(trip(), '2026-11-06')).toBe('planning')
    expect(tripStatus(trip(), '2026-11-25')).toBe('soon')
    expect(tripStatus(trip(), '2026-11-30')).toBe('now')
    expect(tripStatus(trip(), '2026-12-02')).toBe('done')
  })
})

describe('prepProgress', () => {
  it('cuenta las listas y las reservas pagadas', () => {
    const item = (done: boolean) => ({ id: crypto.randomUUID(), text: 'x', done })
    const t = trip({
      todo: [item(true), item(false)],
      packing: [item(true)],
      bookings: [{ id: 'b', kind: 'flight', title: '', date: null, time: null, endDate: null, code: '', place: '', price: 90, paid: true, notes: '' }],
    })
    expect(prepProgress(t)).toEqual({ done: 3, total: 4 })
  })
})

describe('gastos', () => {
  it('suma reservas, planes y gastos en su categoría', () => {
    const t = trip({
      bookings: [
        { id: 'a', kind: 'flight', title: '', date: null, time: null, endDate: null, code: '', place: '', price: 90, paid: true, notes: '' },
        { id: 'b', kind: 'hotel', title: '', date: null, time: null, endDate: null, code: '', place: '', price: 110, paid: false, notes: '' },
      ],
      plans: [{ id: 'p', kind: 'restaurant', title: 'Cena', date: null, time: null, price: 25, booked: false, done: false, url: '', notes: '' }],
      expenses: [{ id: 'e', title: 'Imanes', amount: 5, category: 'shopping', date: null }],
    })
    const byCat = spendByCategory(t)
    expect(byCat.transport).toBe(90)
    expect(byCat.stay).toBe(110)
    expect(byCat.food).toBe(25)
    expect(byCat.shopping).toBe(5)
    expect(totalSpend(t)).toBe(230)
  })
})

it('tripDays incluye la ida y la vuelta', () => {
  expect(tripDays(trip())).toEqual(['2026-11-29', '2026-11-30', '2026-12-01'])
})
