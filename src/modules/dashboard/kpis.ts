import { useActiveTasks, useCalendarEvents, useCategories, useFocusSessionsSince, useHabitLogsSince, useHabits } from '../../db/hooks'
import type { DateKey } from '../../db/types'
import { expandEvents } from '../calendar/recurrence'
import { isDone, isScheduled } from '../habits/stats'

// Clave del saludo según la hora: buenos días hasta las 13:00, buenas tardes hasta las 20:00
export function greetingKey(now: Date): string {
  const h = now.getHours()
  return h < 13 ? 'dashboard.morning' : h < 20 ? 'dashboard.afternoon' : 'dashboard.evening'
}

// Cifras del día para la fila de arriba
export function useKpis(today: DateKey) {
  const events = useCalendarEvents()
  const categories = useCategories()
  const tasks = useActiveTasks()
  const habits = useHabits()
  const logs = useHabitLogsSince(today)
  const sessions = useFocusSessionsSince(today)
  const active = new Set((categories ?? []).map((c) => c.id))
  const scheduled = (habits ?? []).filter((h) => isScheduled(h, today))
  return {
    events: expandEvents((events ?? []).filter((e) => active.has(e.categoryId)), today, today).length,
    tasks: (tasks ?? []).filter((x) => x.status !== 'done' && x.due !== null && x.due <= today).length,
    habitsDone: scheduled.filter((h) => isDone(h, logs?.find((l) => l.habitId === h.id && l.date === today)?.value)).length,
    habitsTotal: scheduled.length,
    focus: (sessions ?? []).filter((s) => s.date === today).reduce((sum, s) => sum + s.minutes, 0),
  }
}

