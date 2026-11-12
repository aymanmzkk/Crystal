import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Task } from '../db/types'
import { computeDueReminders } from './schedule'

const base = { createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0 as const }

function ev(extra: Partial<CalendarEvent>): CalendarEvent {
  return {
    ...base,
    id: 'e1',
    title: 'Gimnasio',
    categoryId: 'cat-gimnasio',
    date: '2026-11-05',
    endDate: null,
    time: '19:00',
    durationMin: 90,
    color: null,
    important: false,
    countdown: false,
    reminders: [30],
    notes: '',
    recurrence: null,
    exdates: [],
    doneDates: [],
    ...extra,
  }
}

function task(extra: Partial<Task>): Task {
  return {
    ...base,
    id: 't1',
    title: 'Entregar práctica',
    status: 'todo',
    categoryId: null,
    due: '2026-11-06',
    dueTime: '20:00',
    urgent: false,
    important: false,
    reminders: [60],
    notes: '',
    order: 1,
    completedAt: null,
    ...extra,
  }
}

const at = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min).getTime()
}

describe('recordatorios', () => {
  it('avisa de un evento 30 minutos antes', () => {
    const due = computeDueReminders([ev({})], [], at('2026-11-05', '18:29'), at('2026-11-05', '18:30'))
    expect(due).toMatchObject([{ key: 'event:e1:2026-11-05:30', kind: 'event', minutesBefore: 30 }])
  })

  it('no avisa fuera del intervalo', () => {
    expect(computeDueReminders([ev({})], [], at('2026-11-05', '18:30'), at('2026-11-05', '18:45'))).toEqual([])
  })

  it('avisa de cada repetición y no de los días marcados como hechos', () => {
    const gym = ev({ recurrence: { freq: 'weekly', interval: 1, weekdays: [4], until: null }, doneDates: ['2026-11-12'] })
    expect(computeDueReminders([gym], [], at('2026-11-19', '18:00'), at('2026-11-19', '18:31'))).toHaveLength(1)
    expect(computeDueReminders([gym], [], at('2026-11-12', '18:00'), at('2026-11-12', '18:31'))).toEqual([])
  })

  it('los eventos de todo el día avisan respecto a las 9:00', () => {
    const birthday = ev({ time: null, reminders: [1440] })
    expect(computeDueReminders([birthday], [], at('2026-11-04', '08:59'), at('2026-11-04', '09:00'))).toHaveLength(1)
  })

  it('avisa de tareas pendientes y no de las terminadas', () => {
    const window = [at('2026-11-06', '18:59'), at('2026-11-06', '19:00')] as const
    expect(computeDueReminders([], [task({})], ...window)).toMatchObject([{ kind: 'task', id: 't1' }])
    expect(computeDueReminders([], [task({ status: 'done' })], ...window)).toEqual([])
  })
})
