import { db } from '../../db/db'
import { createRecord, updateRecord } from '../../db/repo'
import type { CalendarEvent, DateKey, Task } from '../../db/types'
import { addDaysKey, diffDays } from '../../lib/dates'
import { toggleDone } from '../tasks/taskActions'
import { externalTarget } from './external'
import type { Occurrence } from './recurrence'

// Las tareas con fecha también salen en el calendario (como en Pipedrive: todo son "actividades")
export const TASK_PREFIX = 'task:'
// Duración con la que se dibuja una tarea con hora
export const TASK_MINUTES = 30

export const isTaskEvent = (id: string) => id.startsWith(TASK_PREFIX)
export const taskIdOf = (id: string) => id.slice(TASK_PREFIX.length)

// Exámenes y entregas de Clase: se marcan y se mueven guardándolo en la propia evaluación
const ASSESSMENT_PREFIX = 'school:asm:'
export const isAssessmentEvent = (id: string) => id.startsWith(ASSESSMENT_PREFIX)
export const assessmentIdOf = (id: string) => id.slice(ASSESSMENT_PREFIX.length)
// Se puede estirar (cambiar la duración): solo los eventos propios
export const isResizable = (id: string) => !isTaskEvent(id) && !isAssessmentEvent(id)

export function taskEvents(tasks: Task[]): CalendarEvent[] {
  return tasks
    .filter((task) => task.due)
    .map((task) => ({
      id: `${TASK_PREFIX}${task.id}`,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      deletedAt: 0,
      dirty: 0,
      title: task.title,
      // Sin calendario: se ve en gris
      categoryId: task.categoryId ?? '',
      date: task.due!,
      endDate: null,
      time: task.dueTime,
      durationMin: TASK_MINUTES,
      color: task.categoryId ? null : 'gray',
      important: task.urgent,
      countdown: false,
      reminders: [],
      notes: task.notes,
      recurrence: null,
      exdates: [],
      doneDates: task.status === 'done' ? [task.due!] : [],
    }))
}

// Se puede marcar, mover y estirar: eventos propios y tareas (no lo que viene de otras apps)
export function isEditable(occ: Occurrence): boolean {
  return isTaskEvent(occ.event.id) || isAssessmentEvent(occ.event.id) || externalTarget(occ.event.id) === null
}

// Cambios para mover una aparición a otro día y hora (time undefined = misma hora; null = todo el día)
export function moveChanges(event: CalendarEvent, occStart: DateKey, date: DateKey, time: string | null | undefined) {
  const delta = diffDays(occStart, date)
  return {
    date: addDaysKey(event.date, delta),
    endDate: event.endDate ? addDaysKey(event.endDate, delta) : null,
    time: time === undefined ? event.time : time,
  }
}

export async function toggleOccurrenceDone(occ: Occurrence): Promise<void> {
  const { event, start } = occ
  if (isTaskEvent(event.id)) {
    const task = await db.tasks.get(taskIdOf(event.id))
    if (task) await toggleDone(task)
    return
  }
  if (isAssessmentEvent(event.id)) {
    const assessment = await db.assessments.get(assessmentIdOf(event.id))
    if (assessment) await updateRecord('assessments', assessment.id, { done: !assessment.done })
    return
  }
  const doneDates = event.doneDates.includes(start) ? event.doneDates.filter((d) => d !== start) : [...event.doneDates, start]
  await updateRecord('events', event.id, { doneDates })
}

export async function moveOccurrence(occ: Occurrence, date: DateKey, time: string | null | undefined): Promise<void> {
  const { event, start } = occ
  if (isTaskEvent(event.id)) {
    await updateRecord('tasks', taskIdOf(event.id), { due: date, dueTime: time === undefined ? event.time : time })
    return
  }
  if (isAssessmentEvent(event.id)) {
    await updateRecord('assessments', assessmentIdOf(event.id), { date, time: time === undefined ? event.time : time })
    return
  }
  if (!event.recurrence) {
    await updateRecord('events', event.id, moveChanges(event, event.date, date, time))
    return
  }
  // En una serie solo se mueve este día: se quita de la serie y se crea un evento suelto
  const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, dirty: _x, ...rest } = event
  await updateRecord('events', event.id, { exdates: [...event.exdates, start] })
  await createRecord('events', {
    ...rest,
    ...moveChanges({ ...event, date: start, endDate: occ.end !== start ? occ.end : null }, start, date, time),
    recurrence: null,
    exdates: [],
    doneDates: event.doneDates.includes(start) ? [date] : [],
  })
}

export async function resizeOccurrence(occ: Occurrence, durationMin: number): Promise<void> {
  if (!isResizable(occ.event.id)) return
  await updateRecord('events', occ.event.id, { durationMin })
}

// Suelta lo que se arrastraba en un día (y hora): mueve la actividad o le pone fecha a una tarea sin fecha
export async function dropOn(key: string, occurrences: Map<string, Occurrence>, date: DateKey, time: string | null | undefined): Promise<void> {
  if (key.startsWith('unscheduled:')) {
    await updateRecord('tasks', key.slice('unscheduled:'.length), { due: date, dueTime: time ?? null })
    return
  }
  const occ = occurrences.get(key)
  if (!occ) return
  if (occ.start === date && time === undefined) return
  await moveOccurrence(occ, date, time)
}
