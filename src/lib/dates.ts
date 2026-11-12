import type { DateKey } from '../db/types'

export const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): DateKey {
  return toDateKey(new Date())
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function addDaysKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(parseKey(key), days))
}

// Días de a hasta b (b - a). Se redondea para que el cambio de hora no afecte.
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / DAY_MS)
}

// Lunes de la semana de d
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7))
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1)
}

// Fecha + hora local -> milisegundos. Se construye con new Date(...) para que el cambio de hora no la mueva.
export function localDateTime(key: DateKey, time: string): number {
  const [y, m, d] = key.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min).getTime()
}

// 'HH:mm' -> minutos desde las 00:00
export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min: number): string {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`
}
