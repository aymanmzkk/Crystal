import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconPlus } from '@tabler/icons-react'
import { btn, btnPrimary, segment } from '../../components/ui'
import { useAssessments, useCategories, useSubjects } from '../../db/hooks'
import { useNow } from '../../hooks/useNow'
import { COLORS, colorVars } from '../../lib/colors'
import { addDays, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import { WeekView } from '../calendar/WeekView'
import { expandEvents } from '../calendar/recurrence'
import { schoolEvents } from './calendarBridge'
import { formatGrade, summarizeGrades } from './grades'
import { SubjectPanel } from './SubjectPanel'

type View = 'list' | 'timetable'
type Panel = { subjectId: string } | { new: true } | null

export default function SubjectsPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('list')
  const [panel, setPanel] = useState<Panel>(null)
  const subjects = useSubjects()
  const assessments = useAssessments()
  const categories = useCategories()
  const now = useNow()
  const today = toDateKey(now)

  // ?open=<id> abre una asignatura (desde el calendario)
  useEffect(() => {
    const open = params.get('open')
    if (open) {
      setPanel({ subjectId: open })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const weekStartTime = startOfWeek(now).getTime()
  const weekStart = new Date(weekStartTime)
  // Clases de la semana actual, para la vista Horario
  const timetable = useMemo(() => {
    const slots = schoolEvents(subjects ?? [], []).filter((e) => e.recurrence)
    const monday = new Date(weekStartTime)
    return expandEvents(slots, toDateKey(monday), toDateKey(addDays(monday, 6)))
  }, [subjects, weekStartTime])

  const categoryMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const weekdayShort = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const shortDate = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })
  const nextOrder = Math.max(0, ...(subjects ?? []).map((s) => s.order)) + 1
  const panelSubject = panel && 'subjectId' in panel ? subjects?.find((s) => s.id === panel.subjectId) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <div role="group" aria-label={t('calendar.viewLabel')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {(['list', 'timetable'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={segment(view === v)}>
              {t(`school.views.${v}`)}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('school.subject.new')}
        </button>
      </div>

      {subjects && subjects.length === 0 && (
        <div className="m-4 mx-auto max-w-lg card p-6 text-center">
          <p className="font-semibold">{t('school.subject.emptyTitle')}</p>
          <p className="mt-1 text-fg-2">{t('school.subject.emptyBody')}</p>
          <button type="button" onClick={() => setPanel({ new: true })} className={`mt-4 ${btn}`}>
            <IconPlus size={18} aria-hidden />
            {t('school.subject.new')}
          </button>
        </div>
      )}

      {subjects && subjects.length > 0 && view === 'list' && (
        <ul className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const own = (assessments ?? []).filter((a) => a.subjectId === subject.id)
            const grades = summarizeGrades(own)
            const next = own.filter((a) => a.date && a.date >= today && !a.done).sort((a, b) => a.date!.localeCompare(b.date!))[0]
            return (
              <li key={subject.id} className="flex flex-col card transition hover:-translate-y-0.5 hover:border-line-strong">
                <button type="button" onClick={() => setPanel({ subjectId: subject.id })} className="flex flex-1 flex-col gap-2 p-3 text-left">
                  <span className="flex items-center gap-2">
                    <span style={colorVars(subject.color)} className="event-tint rounded-lg px-1.5 py-0.5 text-xs font-semibold">
                      {subject.code || '·'}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{subject.name}</span>
                    {grades.average !== null && (
                      <span className={`text-sm font-semibold ${grades.average < 5 ? 'text-danger' : ''}`}>{formatGrade(grades.average, i18n.language)}</span>
                    )}
                  </span>
                  {subject.teacher && <span className="text-xs text-fg-3">{subject.teacher}</span>}
                  {subject.schedule.length > 0 && (
                    <span className="text-xs text-fg-2">
                      {[...subject.schedule]
                        .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
                        .map((s) => `${weekdayShort.format(new Date(2024, 0, 7 + s.weekday))} ${s.start}`)
                        .join(' · ')}
                    </span>
                  )}
                </button>
                <span className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs">
                  <span className="truncate text-fg-2">
                    {next ? `${shortDate.format(parseKey(next.date!))} · ${next.title}` : t('school.subject.nothingNext')}
                  </span>
                  <Link to={`/exams?subject=${subject.id}`} className="shrink-0 text-fg-3 underline-offset-2 hover:text-fg hover:underline">
                    {t('school.subject.assessments', { count: own.length })}
                  </Link>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {subjects && subjects.length > 0 && view === 'timetable' && (
        <section className="flex-1 bg-surface">
          <WeekView
            start={weekStart}
            dayCount={7}
            today={today}
            occurrences={timetable}
            categories={categoryMap}
            onOpen={(occ) => setPanel({ subjectId: occ.event.id.split(':')[2] })}
            onCreate={() => setPanel({ new: true })}
          />
        </section>
      )}

      {panel && (
        <SubjectPanel
          key={'subjectId' in panel ? panel.subjectId : 'new'}
          subject={panelSubject}
          nextOrder={nextOrder}
          onClose={() => setPanel(null)}
        />
      )}
      {/* Leyenda de colores del horario */}
      {view === 'timetable' && subjects && subjects.length > 0 && (
        <ul className="flex flex-wrap gap-3 border-t border-line px-4 py-2 text-xs text-fg-2">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[s.color].base }} aria-hidden />
              {s.code ? `${s.code} · ${s.name}` : s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
