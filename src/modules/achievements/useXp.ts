import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'
import { achievements, levelOf, xpEntries, type XpData } from './xp'

const alive = <T extends { deletedAt: number }>(rows: T[]) => rows.filter((r) => r.deletedAt === 0)

// Puntos, nivel y logros, recalculados solos cada vez que cambian los datos
export function useXp() {
  const today = toDateKey(useNow())
  const data = useLiveQuery(async (): Promise<XpData> => {
    const [tasks, events, habits, habitLogs, focus, workouts, assessments, goals, trips, memories, notes] = await Promise.all([
      db.tasks.toArray(),
      db.events.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.focusSessions.toArray(),
      db.workouts.toArray(),
      db.assessments.toArray(),
      db.goals.toArray(),
      db.trips.toArray(),
      db.memories.toArray(),
      db.notes.toArray(),
    ])
    return {
      tasks: alive(tasks),
      events: alive(events),
      habits: alive(habits),
      habitLogs: alive(habitLogs),
      focus: alive(focus),
      workouts: alive(workouts),
      assessments: alive(assessments),
      goals: alive(goals),
      trips: alive(trips),
      memories: alive(memories),
      notes: alive(notes),
    }
  })

  return useMemo(() => {
    if (!data) return undefined
    const entries = xpEntries(data, today)
    const total = entries.reduce((s, e) => s + e.amount, 0)
    return { entries, total, level: levelOf(total), achievements: achievements(data, total, today), today }
  }, [data, today])
}
