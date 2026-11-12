import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createRecord } from '../../db/repo'
import { schoolEvents } from '../school/calendarBridge'
import { isEditable, isResizable, moveOccurrence, toggleOccurrenceDone } from './activities'
import { expandEvents } from './recurrence'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('exámenes en el calendario', () => {
  it('marcar hecho y mover se guardan en la evaluación', async () => {
    const subjectId = await createRecord('subjects', { name: 'Acceso a datos', code: 'AD', color: 'blue', teacher: '', schedule: [], notes: '', order: 0 })
    const id = await createRecord('assessments', { subjectId, title: 'Examen T1', kind: 'exam', date: '2026-11-12', time: '09:00', weight: 40, grade: null, done: false, notes: '' })
    const load = async () => {
      const events = schoolEvents(await db.subjects.toArray(), await db.assessments.toArray())
      return expandEvents(events, '2026-11-01', '2026-11-30').find((o) => o.event.id.endsWith(id))!
    }
    const occ = await load()
    expect(isEditable(occ)).toBe(true)
    expect(isResizable(occ.event.id)).toBe(false)

    await toggleOccurrenceDone(occ)
    expect((await db.assessments.get(id))!.done).toBe(true)

    await moveOccurrence(await load(), '2026-11-13', '10:30')
    const moved = (await db.assessments.get(id))!
    expect([moved.date, moved.time]).toEqual(['2026-11-13', '10:30'])
  })
})
