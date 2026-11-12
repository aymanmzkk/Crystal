import { db } from '../../db/db'
import { createRecord, updateRecord } from '../../db/repo'
import type { DateKey, NewRecord, Task, TaskStatus } from '../../db/types'

export const STATUSES: TaskStatus[] = ['todo', 'doing', 'done']

// Número de orden para colocar una tarjeta entre otras dos (o al principio / al final)
export function orderBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1
  if (before === undefined) return after! - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}

export async function addTask(data: Partial<NewRecord<Task>> & { title: string }): Promise<string> {
  const status = data.status ?? 'todo'
  const sameStatus = await db.tasks.where('status').equals(status).toArray()
  const lastOrder = Math.max(0, ...sameStatus.filter((t) => t.deletedAt === 0).map((t) => t.order))
  return createRecord('tasks', {
    status,
    categoryId: null,
    due: null,
    dueTime: null,
    urgent: false,
    important: false,
    reminders: [],
    notes: '',
    order: lastOrder + 1,
    completedAt: status === 'done' ? Date.now() : null,
    ...data,
  })
}

// Cambia el estado y, si hace falta, la posición. Guarda cuándo se terminó.
export async function moveTask(task: Task, status: TaskStatus, order = task.order): Promise<void> {
  const completedAt = status === 'done' ? (task.status === 'done' ? task.completedAt : Date.now()) : null
  await updateRecord('tasks', task.id, { status, order, completedAt })
}

export function toggleDone(task: Task): Promise<void> {
  return moveTask(task, task.status === 'done' ? 'todo' : 'done')
}

// Para ordenar listas: primero lo que está en curso, luego por hacer y al final lo hecho;
// dentro de cada grupo, por fecha límite (las que no tienen van al final) y luego por orden
export function compareTasks(a: Task, b: Task): number {
  const rank = (t: Task) => (t.status === 'doing' ? 0 : t.status === 'todo' ? 1 : 2)
  if (rank(a) !== rank(b)) return rank(a) - rank(b)
  if (a.due !== b.due) {
    if (a.due === null) return 1
    if (b.due === null) return -1
    return a.due < b.due ? -1 : 1
  }
  return a.order - b.order
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later'

export function dueTone(due: DateKey, today: DateKey, soonLimit: DateKey): DueTone {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  if (due <= soonLimit) return 'soon'
  return 'later'
}
