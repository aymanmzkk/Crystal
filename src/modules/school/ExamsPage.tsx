import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconPlus } from '@tabler/icons-react'
import { btnPrimary, field, segment } from '../../components/ui'
import { useAssessments, useSubjects } from '../../db/hooks'
import { updateRecord } from '../../db/repo'
import type { Assessment } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { colorVars } from '../../lib/colors'
import { diffDays, parseKey, toDateKey } from '../../lib/dates'
import { AssessmentPanel } from './AssessmentPanel'
import { formatGrade } from './grades'

type Filter = 'upcoming' | 'past' | 'all'
type Panel = { id: string } | { new: true } | null

export default function ExamsPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [subjectFilter, setSubjectFilter] = useState(() => params.get('subject') ?? '')
  const [panel, setPanel] = useState<Panel>(null)
  const subjects = useSubjects()
  const assessments = useAssessments()
  const today = toDateKey(useNow())

  // ?open=<id> abre una evaluación (desde el calendario) y ?subject=<id> filtra por asignatura
  useEffect(() => {
    const open = params.get('open')
    if (open || params.get('subject')) {
      if (open) setPanel({ id: open })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const subjectMap = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s])), [subjects])
  const rows = useMemo(() => {
    const list = (assessments ?? []).filter((a) => subjectMap.has(a.subjectId) && (!subjectFilter || a.subjectId === subjectFilter))
    const upcoming = (a: Assessment) => !a.done && a.grade === null && (a.date === null || a.date >= today)
    const filtered = filter === 'all' ? list : list.filter((a) => (filter === 'upcoming' ? upcoming(a) : !upcoming(a)))
    // Próximos: el más cercano primero (sin fecha al final). Pasados: el más reciente primero.
    return filtered.sort((a, b) => {
      if (a.date === b.date) return a.title.localeCompare(b.title)
      if (a.date === null) return 1
      if (b.date === null) return -1
      return filter === 'upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    })
  }, [assessments, subjectMap, subjectFilter, filter, today])

  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
  const panelAssessment = panel && 'id' in panel ? assessments?.find((a) => a.id === panel.id) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <div role="group" aria-label={t('school.filter')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={segment(filter === f)}>
              {t(`school.filters.${f}`)}
            </button>
          ))}
        </div>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('school.assessment.subject')} className={`${field} max-w-56`}>
          <option value="">{t('school.allSubjects')}</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('school.assessment.new')}
        </button>
      </div>

      <main className="w-full flex-1 p-4 md:p-6">
        <div className="overflow-x-auto card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
              <tr>
                <th className="w-10 px-3 py-2">
                  <span className="sr-only">{t('school.assessment.done')}</span>
                </th>
                <th className="w-40 px-3 py-2 font-normal">{t('calendar.form.date')}</th>
                <th className="w-24 px-3 py-2 font-normal">{t('school.assessment.subject')}</th>
                <th className="px-3 py-2 font-normal">{t('tasks.form.title')}</th>
                <th className="w-24 px-3 py-2 font-normal">{t('habits.kind')}</th>
                <th className="w-16 px-3 py-2 text-right font-normal">{t('school.assessment.weightShort')}</th>
                <th className="w-16 px-3 py-2 text-right font-normal">{t('school.assessment.grade')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-fg-3">
                    {subjects?.length === 0 ? t('school.assessment.needSubject') : t('school.assessment.empty')}
                  </td>
                </tr>
              )}
              {rows.map((a) => {
                const subject = subjectMap.get(a.subjectId)!
                const days = a.date ? diffDays(today, a.date) : null
                const soon = days !== null && days >= 0 && days <= 3 && !a.done
                return (
                  <tr key={a.id} onClick={() => setPanel({ id: a.id })} className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={a.done}
                        onChange={() => void updateRecord('assessments', a.id, { done: !a.done })}
                        aria-label={`${t('school.assessment.done')}: ${a.title}`}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {a.date ? (
                        <>
                          <span className="first-letter:uppercase">{dateFormat.format(parseKey(a.date))}</span>
                          {a.time && <span className="text-fg-3"> {a.time}</span>}
                          {days !== null && !a.done && days >= 0 && (
                            <span className={`ml-1.5 ${soon ? 'text-danger' : 'text-fg-3'}`}>· {rtf.format(days, 'day')}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-fg-3">{t('school.assessment.noDate')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span style={colorVars(subject.color)} className="event-tint rounded-lg px-1.5 py-0.5 text-xs" title={subject.name}>
                        {subject.code || subject.name}
                      </span>
                    </td>
                    <td className={`truncate px-3 py-2 ${a.done && a.grade === null ? 'text-fg-3' : ''}`}>{a.title}</td>
                    <td className="px-3 py-2 text-fg-2">{t(`school.kinds.${a.kind}`)}</td>
                    <td className="px-3 py-2 text-right text-fg-2">{a.weight > 0 ? `${a.weight} %` : '—'}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${a.grade !== null && a.grade < 5 ? 'text-danger' : ''}`}>
                      {a.grade !== null ? formatGrade(a.grade, i18n.language) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {panel && (
        <AssessmentPanel
          key={'id' in panel ? panel.id : 'new'}
          assessment={panelAssessment}
          subjects={subjects ?? []}
          defaultSubjectId={subjectFilter || undefined}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
