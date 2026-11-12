import type { CalendarEvent, Task } from '../db/types'
import { addDaysKey, localDateTime, toDateKey } from '../lib/dates'
import { expandEvents } from '../modules/calendar/recurrence'

// Los eventos de todo el día y las tareas sin hora avisan tomando como referencia esta hora
export const DEFAULT_TIME = '09:00'

// El aviso más antelado que se puede elegir es de una semana
const MAX_ADVANCE_DAYS = 8

export interface DueReminder {
  // Único por aviso: sirve para no repetirlo
  key: string
  kind: 'event' | 'task'
  id: string
  title: string
  // Cuándo empieza el evento o vence la tarea (ms)
  startsAt: number
  minutesBefore: number
}

// Avisos que tocan en el intervalo (from, to]. Es una función pura: no lee la base de datos ni la hora actual.
export function computeDueReminders(events: CalendarEvent[], tasks: Task[], from: number, to: number): DueReminder[] {
  const due: DueReminder[] = []
  const inWindow = (startsAt: number, minutes: number) => {
    const at = startsAt - minutes * 60_000
    return at > from && at <= to
  }

  const firstDay = addDaysKey(toDateKey(new Date(from)), -1)
  const lastDay = addDaysKey(toDateKey(new Date(to)), MAX_ADVANCE_DAYS)
  for (const occ of expandEvents(events.filter((e) => e.reminders.length > 0), firstDay, lastDay)) {
    if (occ.event.doneDates.includes(occ.start)) continue
    const startsAt = localDateTime(occ.start, occ.event.time ?? DEFAULT_TIME)
    for (const minutes of occ.event.reminders) {
      if (inWindow(startsAt, minutes)) {
        due.push({ key: `event:${occ.event.id}:${occ.start}:${minutes}`, kind: 'event', id: occ.event.id, title: occ.event.title, startsAt, minutesBefore: minutes })
      }
    }
  }

  for (const task of tasks) {
    if (task.status === 'done' || !task.due) continue
    const startsAt = localDateTime(task.due, task.dueTime ?? DEFAULT_TIME)
    for (const minutes of task.reminders) {
      if (inWindow(startsAt, minutes)) {
        due.push({ key: `task:${task.id}:${task.due}:${minutes}`, kind: 'task', id: task.id, title: task.title, startsAt, minutesBefore: minutes })
      }
    }
  }

  return due.sort((a, b) => a.startsAt - b.startsAt)
}
