import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input, textarea } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Assessment, Subject } from '../../db/types'
import { useToast } from '../../store/toast'
import { MAX_GRADE } from './grades'

const KINDS: Assessment['kind'][] = ['exam', 'assignment', 'other']

interface AssessmentPanelProps {
  assessment?: Assessment
  subjects: Subject[]
  defaultSubjectId?: string
  onClose: () => void
}

// Convierte "7,5" o "7.5" en número; '' = sin valor
const parseNumber = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

export function AssessmentPanel({ assessment, subjects, defaultSubjectId, onClose }: AssessmentPanelProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [subjectId, setSubjectId] = useState(assessment?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? '')
  const [title, setTitle] = useState(assessment?.title ?? '')
  const [kind, setKind] = useState<Assessment['kind']>(assessment?.kind ?? 'exam')
  const [date, setDate] = useState(assessment?.date ?? '')
  const [time, setTime] = useState(assessment?.time ?? '')
  const [weight, setWeight] = useState(assessment && assessment.weight > 0 ? String(assessment.weight) : '')
  const [grade, setGrade] = useState(assessment?.grade !== null && assessment?.grade !== undefined ? String(assessment.grade) : '')
  const [done, setDone] = useState(assessment?.done ?? false)
  const [notes, setNotes] = useState(assessment?.notes ?? '')
  const [errors, setErrors] = useState<string[]>([])

  async function save(e: FormEvent) {
    e.preventDefault()
    const w = parseNumber(weight)
    const g = parseNumber(grade)
    const found = [
      !subjectId && 'subject',
      !title.trim() && 'title',
      w !== null && !(w >= 0 && w <= 100) && 'weight',
      g !== null && !(g >= 0 && g <= MAX_GRADE) && 'grade',
    ].filter(Boolean) as string[]
    if (found.length) {
      setErrors(found)
      return
    }
    const data = {
      subjectId,
      title: title.trim(),
      kind,
      date: date || null,
      time: date && time ? time : null,
      weight: w ?? 0,
      grade: g,
      // Si tiene nota, ya está hecha
      done: done || g !== null,
      notes: notes.trim(),
    }
    if (assessment) await updateRecord('assessments', assessment.id, data)
    else await createRecord('assessments', data)
    onClose()
  }

  async function trash() {
    if (!assessment) return
    await moveToTrash('assessments', assessment.id)
    showToast({
      message: t('calendar.toast.trashed', { name: assessment.title }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('assessments', assessment.id) },
    })
    onClose()
  }

  const clear = () => setErrors([])
  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {assessment && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={assessment ? t('school.assessment.editTitle') : t('school.assessment.newTitle')} onClose={onClose} footer={footer}>
      {subjects.length === 0 ? (
        <p className="text-fg-2">{t('school.assessment.needSubject')}</p>
      ) : (
        <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-subject`} className={fieldLabel}>
                {t('school.assessment.subject')}
              </label>
              <select id={`${id}-subject`} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-kind`} className={fieldLabel}>
                {t('habits.kind')}
              </label>
              <select id={`${id}-kind`} value={kind} onChange={(e) => setKind(e.target.value as Assessment['kind'])} className={input}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`school.kinds.${k}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-title`} className={fieldLabel}>
              {t('tasks.form.title')}
            </label>
            <input
              id={`${id}-title`}
              autoFocus={!assessment}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                clear()
              }}
              placeholder={t('school.assessment.titlePlaceholder')}
              aria-invalid={errors.includes('title')}
              className={input}
            />
            {errors.includes('title') && <p className={fieldError}>{t('calendar.form.errors.title')}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-date`} className={fieldLabel}>
                {t('calendar.form.date')}
              </label>
              <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor={`${id}-time`} className={fieldLabel}>
                {t('tasks.form.dueTime')}
              </label>
              <input id={`${id}-time`} type="time" value={time} disabled={!date} onChange={(e) => setTime(e.target.value)} className={`${input} disabled:opacity-50`} />
            </div>
            <div>
              <label htmlFor={`${id}-weight`} className={fieldLabel}>
                {t('school.assessment.weight')}
              </label>
              <input
                id={`${id}-weight`}
                inputMode="decimal"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value)
                  clear()
                }}
                placeholder="30"
                aria-invalid={errors.includes('weight')}
                className={input}
              />
              {errors.includes('weight') && <p className={fieldError}>{t('school.assessment.errors.weight')}</p>}
            </div>
            <div>
              <label htmlFor={`${id}-grade`} className={fieldLabel}>
                {t('school.assessment.grade')}
              </label>
              <input
                id={`${id}-grade`}
                inputMode="decimal"
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  clear()
                }}
                placeholder="—"
                aria-invalid={errors.includes('grade')}
                className={input}
              />
              {errors.includes('grade') && <p className={fieldError}>{t('school.assessment.errors.grade')}</p>}
            </div>
          </div>
          <p className="-mt-2 text-xs text-fg-3">{t('school.assessment.weightHint')}</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
            {t('school.assessment.done')}
          </label>
          <div>
            <label htmlFor={`${id}-notes`} className={fieldLabel}>
              {t('calendar.form.notes')}
            </label>
            <textarea id={`${id}-notes`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={textarea} />
          </div>
        </form>
      )}
    </SidePanel>
  )
}
