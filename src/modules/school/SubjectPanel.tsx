import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { ColorPicker, WEEK_ORDER } from '../../components/pickers'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnIcon, btnPrimary, fieldError, fieldLabel, input, textarea } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { ColorKey, ScheduleSlot, Subject } from '../../db/types'
import { timeToMin } from '../../lib/dates'
import { useToast } from '../../store/toast'

interface SubjectPanelProps {
  subject?: Subject
  nextOrder: number
  onClose: () => void
}

export function SubjectPanel({ subject, nextOrder, onClose }: SubjectPanelProps) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [name, setName] = useState(subject?.name ?? '')
  const [code, setCode] = useState(subject?.code ?? '')
  const [color, setColor] = useState<ColorKey>(subject?.color ?? 'blue')
  const [teacher, setTeacher] = useState(subject?.teacher ?? '')
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(subject?.schedule ?? [])
  const [notes, setNotes] = useState(subject?.notes ?? '')
  const [errors, setErrors] = useState<string[]>([])
  const weekdayName = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' })

  const updateSlot = (index: number, change: Partial<ScheduleSlot>) =>
    setSchedule((list) => list.map((slot, i) => (i === index ? { ...slot, ...change } : slot)))

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = [
      !name.trim() && 'name',
      schedule.some((s) => timeToMin(s.end) <= timeToMin(s.start)) && 'schedule',
    ].filter(Boolean) as string[]
    if (found.length) {
      setErrors(found)
      return
    }
    const data = { name: name.trim(), code: code.trim().toUpperCase(), color, teacher: teacher.trim(), schedule, notes: notes.trim() }
    if (subject) await updateRecord('subjects', subject.id, data)
    else await createRecord('subjects', { ...data, order: nextOrder })
    onClose()
  }

  async function trash() {
    if (!subject) return
    await moveToTrash('subjects', subject.id)
    showToast({
      message: t('calendar.toast.trashed', { name: subject.name }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('subjects', subject.id) },
    })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {subject && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={subject ? t('school.subject.editTitle') : t('school.subject.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <div>
            <label htmlFor={`${id}-name`} className={fieldLabel}>
              {t('habits.name')}
            </label>
            <input
              id={`${id}-name`}
              autoFocus={!subject}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors([])
              }}
              placeholder={t('school.subject.namePlaceholder')}
              aria-invalid={errors.includes('name')}
              className={input}
            />
            {errors.includes('name') && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-code`} className={fieldLabel}>
              {t('school.subject.code')}
            </label>
            <input id={`${id}-code`} value={code} maxLength={6} onChange={(e) => setCode(e.target.value)} placeholder="AD" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-teacher`} className={fieldLabel}>
            {t('school.subject.teacher')}
          </label>
          <input id={`${id}-teacher`} value={teacher} onChange={(e) => setTeacher(e.target.value)} className={input} />
        </div>

        <fieldset>
          <legend className={fieldLabel}>{t('school.subject.schedule')}</legend>
          <ul className="flex flex-col gap-1.5">
            {schedule.map((slot, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,1fr)_76px_76px_minmax(0,0.8fr)_32px] items-center gap-1.5">
                <select
                  value={slot.weekday}
                  onChange={(e) => updateSlot(index, { weekday: Number(e.target.value) })}
                  aria-label={t('school.subject.day')}
                  className={input}
                >
                  {WEEK_ORDER.map((wd) => (
                    <option key={wd} value={wd}>
                      {weekdayName.format(new Date(2024, 0, 7 + wd))}
                    </option>
                  ))}
                </select>
                <input type="time" value={slot.start} onChange={(e) => updateSlot(index, { start: e.target.value })} aria-label={t('calendar.form.from')} className={input} />
                <input type="time" value={slot.end} onChange={(e) => updateSlot(index, { end: e.target.value })} aria-label={t('calendar.form.to')} className={input} />
                <input value={slot.room} onChange={(e) => updateSlot(index, { room: e.target.value })} placeholder={t('school.subject.room')} aria-label={t('school.subject.room')} className={input} />
                <button type="button" onClick={() => setSchedule((list) => list.filter((_, i) => i !== index))} aria-label={t('school.subject.removeSlot')} className={btnIcon}>
                  <IconX size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setSchedule((list) => [...list, { weekday: 1, start: '08:30', end: '10:30', room: '' }])}
            className={`mt-2 ${btn}`}
          >
            <IconPlus size={18} aria-hidden />
            {t('school.subject.addSlot')}
          </button>
          {errors.includes('schedule') && <p className={fieldError}>{t('calendar.form.errors.end')}</p>}
        </fieldset>

        <ColorPicker label={t('calendar.category.color')} value={color} onChange={setColor} />
        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={textarea} />
        </div>
      </form>
    </SidePanel>
  )
}
