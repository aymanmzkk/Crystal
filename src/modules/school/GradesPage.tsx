import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BarChart } from '../../components/BarChart'
import { useAssessments, useSubjects } from '../../db/hooks'
import { colorVars } from '../../lib/colors'
import { MAX_GRADE, PASS_GRADE, formatGrade, summarizeGrades } from './grades'

export default function GradesPage() {
  const { t, i18n } = useTranslation()
  const subjects = useSubjects()
  const assessments = useAssessments()
  const lang = i18n.language

  const rows = (subjects ?? []).map((subject) => {
    const own = (assessments ?? []).filter((a) => a.subjectId === subject.id)
    return { subject, own, summary: summarizeGrades(own) }
  })
  const graded = rows.filter((r) => r.summary.average !== null)
  const overall = graded.length ? graded.reduce((sum, r) => sum + r.summary.average!, 0) / graded.length : null
  const passing = graded.filter((r) => r.summary.average! >= PASS_GRADE).length

  const tiles = [
    { label: t('school.grades.overall'), value: overall !== null ? formatGrade(overall, lang) : '—' },
    { label: t('school.grades.passing'), value: graded.length ? `${passing} / ${graded.length}` : '—' },
    { label: t('school.grades.graded'), value: String((assessments ?? []).filter((a) => a.grade !== null).length) },
  ]

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      {subjects && subjects.length === 0 && (
        <div className="mx-auto max-w-lg card p-6 text-center">
          <p className="font-semibold">{t('school.subject.emptyTitle')}</p>
          <p className="mt-1 text-fg-2">{t('school.grades.emptyBody')}</p>
          <Link to="/subjects" className="mt-3 inline-block underline">
            {t('apps.subjects')}
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map((tile) => (
              <div key={tile.label} className="card px-3 py-2.5">
                <div className="text-xs text-fg-3">{tile.label}</div>
                <div className="mt-0.5 text-lg font-semibold">{tile.value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto card">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
                <tr>
                  <th className="px-3 py-2 font-normal">{t('school.assessment.subject')}</th>
                  <th className="w-24 px-3 py-2 text-right font-normal">{t('school.grades.average')}</th>
                  <th className="w-48 px-3 py-2 font-normal">{t('school.grades.evaluated')}</th>
                  <th className="w-44 px-3 py-2 text-right font-normal">{t('school.grades.needed')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ subject, own, summary }) => {
                  const impossible = summary.needed !== null && summary.needed > MAX_GRADE
                  return (
                    <tr key={subject.id} className="border-t border-line">
                      <td className="px-3 py-2">
                        <Link to={`/exams?subject=${subject.id}`} className="inline-flex min-w-0 items-center gap-2 hover:underline">
                          <span style={colorVars(subject.color)} className="event-tint rounded-lg px-1.5 py-0.5 text-xs">
                            {subject.code || '·'}
                          </span>
                          <span className="truncate">{subject.name}</span>
                          <span className="text-fg-3">· {t('school.subject.assessments', { count: own.length })}</span>
                        </Link>
                      </td>
                      <td className={`px-3 py-2 text-right text-sm font-semibold ${summary.average !== null && summary.average < PASS_GRADE ? 'text-danger' : ''}`}>
                        {summary.average !== null ? formatGrade(summary.average, lang) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(summary.evaluated * 100)}%` }} />
                          </span>
                          <span className="w-10 text-right text-fg-2">{Math.round(summary.evaluated * 100)} %</span>
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right ${impossible ? 'text-danger' : 'text-fg-2'}`}>
                        {summary.needed === null
                          ? t('school.grades.allEvaluated')
                          : summary.needed === 0
                            ? t('school.grades.alreadyPassed')
                            : impossible
                              ? t('school.grades.impossible')
                              : t('school.grades.neededValue', { grade: formatGrade(summary.needed, lang) })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {graded.length > 0 && (
            <div className="card p-3">
              <BarChart
                title={t('school.grades.chartTitle')}
                height={140}
                max={MAX_GRADE}
                bars={graded.map(({ subject, summary }) => ({
                  key: subject.id,
                  label: subject.code || subject.name.slice(0, 4),
                  fullLabel: subject.name,
                  value: summary.average!,
                  valueLabel: formatGrade(summary.average!, lang),
                }))}
              />
            </div>
          )}
          <p className="text-xs text-fg-3">{t('school.grades.hint')}</p>
        </>
      )}
    </main>
  )
}
