import { describe, expect, it } from 'vitest'
import { achievements, levelOf, xpEntries, type XpData } from './xp'

const empty: XpData = { tasks: [], events: [], habits: [], habitLogs: [], focus: [], workouts: [], assessments: [], goals: [], trips: [], memories: [], notes: [] }
const base = { id: 'x', createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0 as const }

describe('niveles', () => {
  it('cada nivel pide 100 XP más que el anterior', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, needed: 100 })
    expect(levelOf(100)).toEqual({ level: 2, into: 0, needed: 200 })
    expect(levelOf(350)).toEqual({ level: 3, into: 50, needed: 300 })
  })
})

describe('puntos', () => {
  it('suma tareas hechas (con extra si son importantes) y minutos de concentración', () => {
    const task = (status: 'todo' | 'done', important = false) => ({ ...base, title: 't', status, categoryId: null, due: null, dueTime: null, urgent: false, important, reminders: [], notes: '', order: 0, completedAt: Date.UTC(2026, 10, 5, 12) })
    const data: XpData = {
      ...empty,
      tasks: [task('done'), task('done', true), task('todo')],
      focus: [{ ...base, startedAt: 0, minutes: 25, date: '2026-11-05', label: '', taskId: null }],
    }
    const total = xpEntries(data, '2026-11-06').reduce((s, e) => s + e.amount, 0)
    expect(total).toBe(10 + 15 + 5)
    const first = achievements(data, total, '2026-11-06').find((a) => a.id === 'firstTask')!
    expect(first.value >= first.goal).toBe(true)
  })
})
