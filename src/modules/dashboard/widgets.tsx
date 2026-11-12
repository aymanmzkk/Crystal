import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconChevronRight } from '@tabler/icons-react'
import { BarChart } from '../../components/BarChart'
import {
  useActiveTasks,
  useAssessments,
  useCalendarEvents,
  useCategories,
  useFocusSessionsSince,
  useHabitLogsSince,
  useHabits,
  useSubjects,
  useWorkouts,
} from '../../db/hooks'
import { upsertRecord } from '../../db/repo'
import type { DateKey } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { addDaysKey, diffDays, minToTime, parseKey, startOfWeek, timeToMin, toDateKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import { getCategoryIcon } from '../../lib/icons'
import { expandEvents } from '../calendar/recurrence'
import { habitLogId, isDone, isScheduled, nextHabitValue } from '../habits/stats'
import { formatGrade, summarizeGrades } from '../school/grades'
import { externalTarget } from '../calendar/external'
import { DueBadge } from '../tasks/TaskBits'
import { compareTasks, toggleDone } from '../tasks/taskActions'
import { workoutVolume } from '../gym/stats'

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-xs text-fg-3">{children}</p>
}

// Enlace "ver todo" de la cabecera de cada widget
export function WidgetLink({ to }: { to: string }) {
  const { t } = useTranslation()
  return (
    <Link to={to} className="flex items-center text-xs text-fg-3 hover:text-fg">
      {t('dashboard.open')}
      <IconChevronRight size={15} aria-hidden />
    </Link>
  )
}

export function TodayWidget({ today }: { today: DateKey }) {
  const { t } = useTranslation()
  const events = useCalendarEvents()
  const categories = useCategories()
  const active = new Set((categories ?? []).map((c) => c.id))
  const list = expandEvents((events ?? []).filter((e) => active.has(e.categoryId)), today, today)
  if (list.length === 0) return <Empty>{t('dashboard.noEventsToday')}</Empty>
  return (
    <ul className="flex flex-col">
      {list.map((occ) => {
        const color = COLORS[occ.event.color ?? categories?.find((c) => c.id === occ.event.categoryId)?.color ?? 'gray'].base
        const done = occ.event.doneDates.includes(occ.start)
        return (
          <li key={occ.key}>
            <Link
              to={externalTarget(occ.event.id) ?? `/calendar?open=${occ.event.id}`}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2"
            >
              <span className="w-24 shrink-0 text-fg-2">
                {occ.event.time ? `${occ.event.time}–${minToTime(Math.min(1439, timeToMin(occ.event.time) + occ.event.durationMin))}` : t('calendar.allDay')}
              </span>
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <span className={`truncate ${done ? 'text-fg-3 line-through' : ''}`}>{occ.event.title}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function TasksWidget({ today }: { today: DateKey }) {
  const { t } = useTranslation()
  const tasks = useActiveTasks()
  const pending = (tasks ?? []).filter((x) => x.status !== 'done').sort(compareTasks)
  const overdue = pending.filter((x) => x.due && x.due < today).length
  if (pending.length === 0) return <Empty>{t('dashboard.noTasks')}</Empty>
  return (
    <>
      {overdue > 0 && <p className="mb-1 text-xs text-danger">{t('dashboard.overdue', { count: overdue })}</p>}
      <ul className="flex flex-col">
        {pending.slice(0, 6).map((task) => (
          <li key={task.id} className="flex items-center gap-2 px-1 py-1">
            <input type="checkbox" checked={false} onChange={() => void toggleDone(task)} aria-label={`${t('tasks.done')}: ${task.title}`} />
            <Link to={`/tasks?open=${task.id}`} className="min-w-0 flex-1 truncate hover:underline">
              {task.title}
            </Link>
            <span className="shrink-0 text-xs">
              <DueBadge task={task} today={today} />
            </span>
          </li>
        ))}
      </ul>
      {pending.length > 6 && <p className="mt-1 text-xs text-fg-3">{t('dashboard.more', { count: pending.length - 6 })}</p>}
    </>
  )
}

export function HabitsWidget({ today }: { today: DateKey }) {
  const { t } = useTranslation()
  const habits = useHabits()
  const logs = useHabitLogsSince(today)
  const todayHabits = (habits ?? []).filter((h) => isScheduled(h, today))
  if (todayHabits.length === 0) return <Empty>{t('dashboard.noHabits')}</Empty>
  const value = (id: string) => logs?.find((l) => l.habitId === id && l.date === today)?.value ?? 0
  return (
    <ul className="flex flex-col gap-1">
      {todayHabits.map((habit) => {
        const v = value(habit.id)
        const done = isDone(habit, v)
        const Icon = getCategoryIcon(habit.icon)
        return (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() =>
                void upsertRecord('habitLogs', habitLogId(habit.id, today), { habitId: habit.id, date: today, value: nextHabitValue(habit, v, 1) })
              }
              aria-pressed={done}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-surface-2"
            >
              <span style={{ color: COLORS[habit.color].base }}>
                <Icon size={19} aria-hidden />
              </span>
              <span className={`min-w-0 flex-1 truncate ${done ? 'text-fg-3 line-through' : ''}`}>{habit.name}</span>
              <span className={`text-xs ${done ? 'text-success' : 'text-fg-3'}`}>
                {habit.kind === 'count' ? `${v}/${habit.goal}` : done ? '✓' : '○'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function CountdownsWidget({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const events = useCalendarEvents()
  const seen = new Set<string>()
  const list = expandEvents(
    (events ?? []).filter((e) => e.countdown),
    today,
    addDaysKey(today, 366),
  )
    .filter((o) => (seen.has(o.event.id) ? false : (seen.add(o.event.id), true)))
    .slice(0, 5)
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })
  if (list.length === 0) return <Empty>{t('home.noCountdowns')}</Empty>
  return (
    <ul className="flex flex-col gap-1">
      {list.map((occ) => {
        const days = diffDays(today, occ.start)
        return (
          <li key={occ.key} className="flex items-baseline gap-2 px-1">
            <span className="w-14 shrink-0 text-right text-base font-semibold">{days === 0 ? t('home.today') : days}</span>
            <span className="min-w-0 flex-1 truncate">{occ.event.title}</span>
            <span className="shrink-0 text-xs text-fg-3">{date.format(parseKey(occ.start))}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function FocusWidget({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const from = addDaysKey(today, -6)
  const sessions = useFocusSessionsSince(from)
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
  const longDay = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric' })
  const minutesOn = (day: DateKey) => (sessions ?? []).filter((s) => s.date === day).reduce((sum, s) => sum + s.minutes, 0)
  return (
    <>
      <p className="mb-2">
        <span className="text-xl font-semibold">{formatMinutes(minutesOn(today))}</span>
        <span className="ml-1.5 text-xs text-fg-3">{t('dashboard.focusToday')}</span>
      </p>
      <BarChart
        title={t('pomodoro.chartTitle')}
        height={56}
        bars={Array.from({ length: 7 }, (_, i) => {
          const day = addDaysKey(from, i)
          const m = minutesOn(day)
          return { key: day, label: weekday.format(parseKey(day)), fullLabel: longDay.format(parseKey(day)), value: m, valueLabel: formatMinutes(m), highlight: day === today }
        })}
      />
    </>
  )
}

export function SchoolWidget({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const subjects = useSubjects()
  const assessments = useAssessments()
  const bySubject = new Map((subjects ?? []).map((s) => [s.id, s]))
  const upcoming = (assessments ?? [])
    .filter((a) => bySubject.has(a.subjectId) && a.date && a.date >= today && !a.done)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 4)
  const averages = (subjects ?? []).map((s) => summarizeGrades((assessments ?? []).filter((a) => a.subjectId === s.id)).average).filter((a): a is number => a !== null)
  const overall = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  if (!subjects?.length) return <Empty>{t('school.subject.emptyTitle')}</Empty>
  return (
    <>
      <p className="mb-2">
        <span className="text-xl font-semibold">{overall !== null ? formatGrade(overall, i18n.language) : '—'}</span>
        <span className="ml-1.5 text-xs text-fg-3">{t('school.grades.overall')}</span>
      </p>
      {upcoming.length === 0 ? (
        <Empty>{t('school.subject.nothingNext')}</Empty>
      ) : (
        <ul className="flex flex-col">
          {upcoming.map((a) => {
            const subject = bySubject.get(a.subjectId)!
            const days = diffDays(today, a.date!)
            return (
              <li key={a.id}>
                <Link to={`/exams?open=${a.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[subject.color].base }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {subject.code || subject.name}: {a.title}
                  </span>
                  <span className={`shrink-0 text-xs ${days <= 3 ? 'text-danger' : 'text-fg-3'}`}>{rtf.format(days, 'day')}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export function GymWidget({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const workouts = useWorkouts()
  const monday = toDateKey(startOfWeek(parseKey(today)))
  const finished = (workouts ?? []).filter((w) => w.finishedAt !== null).sort((a, b) => b.startedAt - a.startedAt)
  const active = (workouts ?? []).find((w) => w.finishedAt === null)
  const week = finished.filter((w) => w.date >= monday)
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric' })
  return (
    <>
      {active && <p className="mb-2 rounded-app border border-accent px-2 py-1 text-xs">{t('dashboard.workoutInProgress', { name: active.name })}</p>}
      <p className="mb-2">
        <span className="text-xl font-semibold">{week.length}</span>
        <span className="ml-1.5 text-xs text-fg-3">{t('dashboard.workoutsThisWeek', { volume: Math.round(week.reduce((s, w) => s + workoutVolume(w), 0)) })}</span>
      </p>
      {finished[0] ? (
        <p className="text-fg-2 first-letter:uppercase">
          {t('dashboard.lastWorkout', { name: finished[0].name, date: date.format(parseKey(finished[0].date)) })}
        </p>
      ) : (
        <Empty>{t('gym.noHistory')}</Empty>
      )}
    </>
  )
}
