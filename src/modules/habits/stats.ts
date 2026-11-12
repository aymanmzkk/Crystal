import type { DateKey, Habit } from '../../db/types'
import { addDaysKey, parseKey, toDateKey } from '../../lib/dates'

// Valor de cada día (fecha -> valor) de un hábito
export type HabitValues = Map<DateKey, number>

export const habitLogId = (habitId: string, date: DateKey) => `${habitId}:${date}`

export function isScheduled(habit: Habit, date: DateKey): boolean {
  return habit.weekdays.includes(parseKey(date).getDay())
}

// Valor nuevo al pulsar: en los de marcar alterna 0/1; en los de contar suma uno (y vuelve a 0 al pasarse) o resta
export function nextHabitValue(habit: Habit, current: number, delta: 1 | -1): number {
  if (habit.kind === 'check') return current >= 1 ? 0 : 1
  if (delta === 1) return current >= habit.goal ? 0 : current + 1
  return Math.max(0, current - 1)
}

export function isDone(habit: Habit, value: number | undefined): boolean {
  return (value ?? 0) >= (habit.kind === 'count' ? habit.goal : 1)
}

const startDate = (habit: Habit) => toDateKey(new Date(habit.createdAt))

// Días seguidos cumpliendo, contando hacia atrás desde hoy. Los días que no toca no rompen la racha,
// y hoy tampoco si todavía no se ha hecho.
export function currentStreak(habit: Habit, values: HabitValues, today: DateKey): number {
  const first = startDate(habit)
  let streak = 0
  for (let day = today; day >= first; day = addDaysKey(day, -1)) {
    if (!isScheduled(habit, day)) continue
    if (isDone(habit, values.get(day))) streak++
    else if (day !== today) break
  }
  return streak
}

export function bestStreak(habit: Habit, values: HabitValues, today: DateKey): number {
  let best = 0
  let run = 0
  for (let day = startDate(habit); day <= today; day = addDaysKey(day, 1)) {
    if (!isScheduled(habit, day)) continue
    if (isDone(habit, values.get(day))) best = Math.max(best, ++run)
    else if (day !== today) run = 0
  }
  return best
}

// Porcentaje de días cumplidos de los que tocaba en los últimos `days` días (hoy solo cuenta si ya está hecho)
export function completionRate(habit: Habit, values: HabitValues, today: DateKey, days = 30): number {
  const first = startDate(habit)
  let scheduled = 0
  let done = 0
  for (let i = 0; i < days; i++) {
    const day = addDaysKey(today, -i)
    if (day < first) break
    if (!isScheduled(habit, day)) continue
    const ok = isDone(habit, values.get(day))
    if (day === today && !ok) continue
    scheduled++
    if (ok) done++
  }
  return scheduled === 0 ? 0 : done / scheduled
}
