import type { Assessment, CalendarEvent, Subject } from '../../db/types'
import { startOfWeek, timeToMin, toDateKey } from '../../lib/dates'

// Los eventos de clase no se guardan en la tabla de eventos: se calculan a partir del horario de cada
// asignatura y de sus exámenes y entregas. Sus ids empiezan por "school:" para reconocerlos.
export const SCHOOL_PREFIX = 'school:'
export const SCHOOL_CATEGORY = 'cat-clase'

export function schoolEvents(subjects: Subject[], assessments: Assessment[]): CalendarEvent[] {
  const bySubject = new Map(subjects.map((s) => [s.id, s]))
  const base = { createdAt: 0, updatedAt: 0, deletedAt: 0, dirty: 0 as const, categoryId: SCHOOL_CATEGORY, endDate: null, exdates: [], notes: '' }

  const slots = subjects.flatMap((subject) =>
    subject.schedule.map(
      (slot, i): CalendarEvent => ({
        ...base,
        id: `${SCHOOL_PREFIX}slot:${subject.id}:${i}`,
        title: subject.code ? `${subject.code} · ${subject.name}` : subject.name,
        // El horario se ve desde la semana en que se creó la asignatura
        date: toDateKey(startOfWeek(new Date(subject.createdAt))),
        time: slot.start,
        durationMin: Math.max(15, timeToMin(slot.end) - timeToMin(slot.start)),
        color: subject.color,
        important: false,
        countdown: false,
        reminders: [],
        notes: slot.room,
        recurrence: { freq: 'weekly', interval: 1, weekdays: [slot.weekday], until: null },
        doneDates: [],
      }),
    ),
  )

  const dated = assessments.flatMap((a): CalendarEvent[] => {
    const subject = bySubject.get(a.subjectId)
    if (!subject || !a.date) return []
    const pending = !a.done && a.grade === null
    return [
      {
        ...base,
        id: `${SCHOOL_PREFIX}asm:${a.id}`,
        title: `${subject.code || subject.name}: ${a.title}`,
        date: a.date,
        time: a.time,
        durationMin: a.time ? (a.kind === 'exam' ? 120 : 30) : 0,
        color: subject.color,
        important: a.kind === 'exam',
        // Los exámenes pendientes salen solos en las cuentas atrás
        countdown: a.kind === 'exam' && pending,
        reminders: pending ? [1440] : [],
        recurrence: null,
        doneDates: a.done ? [a.date] : [],
      },
    ]
  })

  return [...slots, ...dated]
}

// Dónde se abre un evento de clase: la evaluación o la asignatura. null si no es de clase.
export function schoolTarget(eventId: string): string | null {
  if (!eventId.startsWith(SCHOOL_PREFIX)) return null
  const [, kind, id] = eventId.split(':')
  return kind === 'asm' ? `/exams?open=${id}` : `/subjects?open=${id}`
}
