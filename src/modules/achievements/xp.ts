import type { Assessment, CalendarEvent, DateKey, FocusSession, Goal, Habit, HabitLog, Memory, Note, Task, Trip, Workout } from '../../db/types'
import { toDateKey } from '../../lib/dates'
import { bestStreak, isDone } from '../habits/stats'
import { personalRecords } from '../gym/stats'

// Los puntos (XP) se calculan con lo que ya hay guardado: así nunca se desincronizan
// y al deshacer algo (desmarcar una tarea) los puntos se van solos.

export type XpSource = 'tasks' | 'events' | 'habits' | 'focus' | 'gym' | 'school' | 'goals' | 'travel' | 'memories' | 'journal'

export const XP_SOURCES: XpSource[] = ['tasks', 'habits', 'focus', 'gym', 'school', 'events', 'goals', 'travel', 'memories', 'journal']

export interface XpEntry {
  date: DateKey
  amount: number
  source: XpSource
}

export interface XpData {
  tasks: Task[]
  events: CalendarEvent[]
  habits: Habit[]
  habitLogs: HabitLog[]
  focus: FocusSession[]
  workouts: Workout[]
  assessments: Assessment[]
  goals: Goal[]
  trips: Trip[]
  memories: Memory[]
  notes: Note[]
}

// Cuántos puntos da cada cosa
export const XP_RULES = {
  task: 10,
  taskPriority: 5,
  event: 5,
  habit: 5,
  focusPer5Min: 1,
  workout: 25,
  assessment: 15,
  passed: 10,
  milestone: 15,
  goal: 100,
  trip: 50,
  memory: 10,
  journal: 3,
}

const day = (ms: number) => toDateKey(new Date(ms))

export function xpEntries(d: XpData, today: DateKey): XpEntry[] {
  const out: XpEntry[] = []
  for (const t of d.tasks)
    if (t.status === 'done') out.push({ date: t.completedAt ? day(t.completedAt) : day(t.updatedAt), amount: XP_RULES.task + (t.urgent || t.important ? XP_RULES.taskPriority : 0), source: 'tasks' })
  for (const e of d.events) for (const date of e.doneDates) out.push({ date, amount: XP_RULES.event, source: 'events' })
  const habits = new Map(d.habits.map((h) => [h.id, h]))
  for (const log of d.habitLogs) {
    const h = habits.get(log.habitId)
    if (h && isDone(h, log.value)) out.push({ date: log.date, amount: XP_RULES.habit, source: 'habits' })
  }
  for (const f of d.focus) if (f.minutes >= 5) out.push({ date: f.date, amount: Math.floor(f.minutes / 5) * XP_RULES.focusPer5Min, source: 'focus' })
  for (const w of d.workouts) if (w.finishedAt) out.push({ date: w.date, amount: XP_RULES.workout, source: 'gym' })
  for (const a of d.assessments) {
    if (a.done || a.grade !== null) out.push({ date: a.date ?? day(a.updatedAt), amount: XP_RULES.assessment + (a.grade !== null && a.grade >= 5 ? XP_RULES.passed : 0), source: 'school' })
  }
  for (const g of d.goals) {
    const done = g.milestones.filter((m) => m.done).length
    if (done) out.push({ date: day(g.updatedAt), amount: done * XP_RULES.milestone, source: 'goals' })
    if (g.achievedAt) out.push({ date: day(g.achievedAt), amount: XP_RULES.goal, source: 'goals' })
  }
  for (const trip of d.trips) if (trip.end < today) out.push({ date: trip.end, amount: XP_RULES.trip, source: 'travel' })
  for (const m of d.memories) out.push({ date: m.date, amount: XP_RULES.memory, source: 'memories' })
  for (const n of d.notes) if (n.journalDate && n.body.trim()) out.push({ date: n.journalDate, amount: XP_RULES.journal, source: 'journal' })
  return out
}

// Niveles: para pasar del nivel n al n+1 hacen falta 100 × n puntos (100, 200, 300...)
export function levelOf(xp: number): { level: number; into: number; needed: number } {
  let level = 1
  let rest = xp
  while (rest >= level * 100) {
    rest -= level * 100
    level++
  }
  return { level, into: rest, needed: level * 100 }
}

export interface Achievement {
  id: string
  // Icono de @tabler (nombre que usa la página de logros)
  icon: 'check' | 'flame' | 'barbell' | 'clock' | 'school' | 'plane' | 'photo' | 'target' | 'trophy' | 'notebook' | 'star' | 'world'
  // Progreso actual y meta
  value: number
  goal: number
}

// Lista de logros con su progreso. Desbloqueado = value >= goal.
export function achievements(d: XpData, totalXp: number, today: DateKey): Achievement[] {
  const tasksDone = d.tasks.filter((t) => t.status === 'done').length
  const workouts = d.workouts.filter((w) => w.finishedAt).length
  const focusMin = d.focus.reduce((s, f) => s + f.minutes, 0)
  const passed = d.assessments.filter((a) => a.grade !== null && a.grade >= 5).length
  const tripsDone = d.trips.filter((t) => t.end < today)
  const countries = new Set(tripsDone.map((t) => t.country.trim().toLowerCase()).filter(Boolean)).size
  const goals = d.goals.filter((g) => g.achievedAt).length
  const journal = d.notes.filter((n) => n.journalDate && n.body.trim()).length
  const records = personalRecords(d.workouts).size
  // Mejor racha de cualquier hábito
  const byHabit = new Map<string, Map<DateKey, number>>()
  for (const l of d.habitLogs) {
    if (!byHabit.has(l.habitId)) byHabit.set(l.habitId, new Map())
    byHabit.get(l.habitId)!.set(l.date, l.value)
  }
  const streak = Math.max(0, ...d.habits.map((h) => bestStreak(h, byHabit.get(h.id) ?? new Map(), today)))
  const level = levelOf(totalXp).level

  return [
    { id: 'firstTask', icon: 'check', value: tasksDone, goal: 1 },
    { id: 'tasks50', icon: 'check', value: tasksDone, goal: 50 },
    { id: 'tasks200', icon: 'check', value: tasksDone, goal: 200 },
    { id: 'streak7', icon: 'flame', value: streak, goal: 7 },
    { id: 'streak30', icon: 'flame', value: streak, goal: 30 },
    { id: 'firstWorkout', icon: 'barbell', value: workouts, goal: 1 },
    { id: 'workouts25', icon: 'barbell', value: workouts, goal: 25 },
    { id: 'workouts100', icon: 'barbell', value: workouts, goal: 100 },
    { id: 'records10', icon: 'trophy', value: records, goal: 10 },
    { id: 'focus10h', icon: 'clock', value: Math.floor(focusMin / 60), goal: 10 },
    { id: 'focus100h', icon: 'clock', value: Math.floor(focusMin / 60), goal: 100 },
    { id: 'passed5', icon: 'school', value: passed, goal: 5 },
    { id: 'firstTrip', icon: 'plane', value: tripsDone.length, goal: 1 },
    { id: 'countries5', icon: 'world', value: countries, goal: 5 },
    { id: 'memories10', icon: 'photo', value: d.memories.length, goal: 10 },
    { id: 'firstGoal', icon: 'target', value: goals, goal: 1 },
    { id: 'journal30', icon: 'notebook', value: journal, goal: 30 },
    { id: 'level5', icon: 'star', value: level, goal: 5 },
    { id: 'level10', icon: 'star', value: level, goal: 10 },
  ]
}
