import type { DateKey, Trip, TripBookingKind, TripExpenseCategory, TripPlanKind } from '../../db/types'
import { addDaysKey, diffDays } from '../../lib/dates'

export const BOOKING_KINDS: TripBookingKind[] = ['flight', 'train', 'bus', 'car', 'hotel', 'apartment', 'other']
export const STAY_KINDS: TripBookingKind[] = ['hotel', 'apartment']
export const PLAN_KINDS: TripPlanKind[] = ['activity', 'ticket', 'restaurant', 'food']
export const FOOD_KINDS: TripPlanKind[] = ['restaurant', 'food']
export const EXPENSE_CATEGORIES: TripExpenseCategory[] = ['transport', 'stay', 'food', 'activities', 'shopping', 'other']

export type TripStatus = 'planning' | 'soon' | 'now' | 'done'

// Próximo (planificando), en menos de una semana, en curso o terminado
export function tripStatus(trip: Pick<Trip, 'start' | 'end'>, today: DateKey): TripStatus {
  if (trip.end < today) return 'done'
  if (trip.start <= today) return 'now'
  return diffDays(today, trip.start) <= 7 ? 'soon' : 'planning'
}

// Preparación: casillas marcadas de "antes de viajar", "comprar" y maleta, más reservas pagadas
export function prepProgress(trip: Trip): { done: number; total: number } {
  const lists = [trip.todo, trip.shopping, trip.packing]
  const done = lists.reduce((n, l) => n + l.filter((x) => x.done).length, 0) + trip.bookings.filter((b) => b.paid).length
  const total = lists.reduce((n, l) => n + l.length, 0) + trip.bookings.length
  return { done, total }
}

// Dinero del viaje por categoría: reservas, planes con precio y gastos apuntados
export function spendByCategory(trip: Trip): Record<TripExpenseCategory, number> {
  const out: Record<TripExpenseCategory, number> = { transport: 0, stay: 0, food: 0, activities: 0, shopping: 0, other: 0 }
  for (const b of trip.bookings) out[STAY_KINDS.includes(b.kind) ? 'stay' : 'transport'] += b.price ?? 0
  for (const p of trip.plans) out[FOOD_KINDS.includes(p.kind) ? 'food' : 'activities'] += p.price ?? 0
  for (const e of trip.expenses) out[e.category] += e.amount
  return out
}

export function totalSpend(trip: Trip): number {
  return Object.values(spendByCategory(trip)).reduce((a, b) => a + b, 0)
}

// Días del viaje, de la ida a la vuelta
export function tripDays(trip: Pick<Trip, 'start' | 'end'>): DateKey[] {
  const n = Math.max(0, diffDays(trip.start, trip.end))
  return Array.from({ length: Math.min(n + 1, 60) }, (_, i) => addDaysKey(trip.start, i))
}

// Color de la portada cuando todavía no hay foto: sale siempre igual para el mismo destino
export function coverHue(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

// Viaje vacío con todos los apartados
export function emptyTripParts(): Pick<Trip, 'available' | 'todo' | 'shopping' | 'bookings' | 'plans' | 'expenses' | 'days'> {
  return { available: null, todo: [], shopping: [], bookings: [], plans: [], expenses: [], days: {} }
}
