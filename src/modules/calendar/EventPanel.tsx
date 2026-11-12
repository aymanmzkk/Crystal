import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowBackUp, IconCheck, IconTrash } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input, textarea, toggleChip } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { CalendarEvent, Category, ColorKey, DateKey, NewRecord, RepeatFreq } from '../../db/types'
import { COLORS, COLOR_KEYS } from '../../lib/colors'
import { minToTime, parseKey, timeToMin } from '../../lib/dates'
import { useToast } from '../../store/toast'

const REMINDER_OPTIONS = [0, 10, 30, 60, 1440, 10080]
// Lunes primero
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

interface FormState {
  title: string
  categoryId: string
  date: DateKey
  allDay: boolean
  start: string
  end: string
  multiDay: boolean
  endDate: DateKey
  repeat: 'none' | RepeatFreq
  weekdays: number[]
  until: string
  reminders: number[]
  color: ColorKey | null
  important: boolean
  countdown: boolean
  notes: string
}

type FormError = 'title' | 'category' | 'end' | 'endDate' | 'weekdays' | 'until'

interface EventPanelProps {
  // Evento que se edita; si no hay, se crea uno nuevo con los datos de draft
  event?: CalendarEvent
  // Día concreto que se abrió (importa en los eventos que se repiten)
  occurrenceDate?: DateKey
  draft?: { date: DateKey; time: string | null; title?: string; categoryId?: string; durationMin?: number }
  categories: Category[]
  onClose: () => void
}

function initialForm(event: CalendarEvent | undefined, draft: EventPanelProps['draft'], categories: Category[]): FormState {
  const date = event?.date ?? draft?.date ?? ''
  const start = event?.time ?? draft?.time ?? '09:00'
  const duration = event?.time ? event.durationMin : (draft?.durationMin ?? 60)
  return {
    title: event?.title ?? draft?.title ?? '',
    categoryId: event?.categoryId ?? draft?.categoryId ?? categories[0]?.id ?? '',
    date,
    allDay: event ? event.time === null : draft?.time === null,
    start,
    end: minToTime(Math.min(24 * 60 - 1, timeToMin(start) + duration)),
    multiDay: Boolean(event?.endDate),
    endDate: event?.endDate ?? date,
    repeat: event?.recurrence?.freq ?? 'none',
    weekdays: event?.recurrence?.weekdays.length ? event.recurrence.weekdays : [parseKey(date).getDay()],
    until: event?.recurrence?.until ?? '',
    reminders: event?.reminders ?? [30],
    color: event?.color ?? null,
    important: event?.important ?? false,
    countdown: event?.countdown ?? false,
    notes: event?.notes ?? '',
  }
}

function validate(f: FormState): FormError[] {
  const errors: FormError[] = []
  if (!f.title.trim()) errors.push('title')
  if (!f.categoryId) errors.push('category')
  if (!f.allDay && timeToMin(f.end) <= timeToMin(f.start)) errors.push('end')
  if (f.multiDay && f.endDate <= f.date) errors.push('endDate')
  if (f.repeat === 'weekly' && f.weekdays.length === 0) errors.push('weekdays')
  if (f.repeat !== 'none' && f.until && f.until < f.date) errors.push('until')
  return errors
}

function toRecord(f: FormState, previous?: CalendarEvent): Omit<NewRecord<CalendarEvent>, 'exdates' | 'doneDates'> {
  return {
    title: f.title.trim(),
    categoryId: f.categoryId,
    date: f.date,
    endDate: f.multiDay ? f.endDate : null,
    time: f.allDay ? null : f.start,
    durationMin: f.allDay ? 0 : timeToMin(f.end) - timeToMin(f.start),
    color: f.color,
    important: f.important,
    countdown: f.countdown,
    reminders: [...f.reminders].sort((a, b) => a - b),
    notes: f.notes.trim(),
    recurrence:
      f.repeat === 'none'
        ? null
        : {
            freq: f.repeat,
            interval: previous?.recurrence?.interval ?? 1,
            weekdays: f.repeat === 'weekly' ? [...f.weekdays].sort((a, b) => a - b) : [],
            until: f.until || null,
          },
  }
}

export function EventPanel({ event, occurrenceDate, draft, categories, onClose }: EventPanelProps) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [form, setForm] = useState(() => initialForm(event, draft, categories))
  const [errors, setErrors] = useState<FormError[]>([])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors([])
  }
  const toggleIn = (list: number[], value: number) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  const hasError = (e: FormError) => errors.includes(e)

  const narrowWeekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
  const longDate = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  // 7 de enero de 2024 fue domingo: sirve para sacar el nombre de cada día de la semana
  const weekdayName = (wd: number) => narrowWeekday.format(new Date(2024, 0, 7 + wd))

  const occDate = occurrenceDate ?? event?.date
  const isDone = Boolean(event && occDate && event.doneDates.includes(occDate))

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = validate(form)
    if (found.length > 0) {
      setErrors(found)
      return
    }
    if (event) {
      await updateRecord('events', event.id, toRecord(form, event))
    } else {
      await createRecord('events', { ...toRecord(form), exdates: [], doneDates: [] })
    }
    showToast({ message: t('calendar.toast.saved') })
    onClose()
  }

  async function toggleDone() {
    if (!event || !occDate) return
    const doneDates = isDone ? event.doneDates.filter((d) => d !== occDate) : [...event.doneDates, occDate]
    await updateRecord('events', event.id, { doneDates })
  }

  async function trash() {
    if (!event) return
    await moveToTrash('events', event.id)
    showToast({
      message: t('calendar.toast.trashed', { name: event.title }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('events', event.id) },
    })
    onClose()
  }

  async function removeThisDay() {
    if (!event || !occDate) return
    const previous = event.exdates
    await updateRecord('events', event.id, { exdates: [...previous, occDate] })
    showToast({
      message: t('calendar.toast.dayRemoved'),
      action: { label: t('calendar.toast.undo'), run: () => void updateRecord('events', event.id, { exdates: previous }) },
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
      {event && (
        <span className="ml-auto flex flex-wrap justify-end gap-2">
          {event.recurrence ? (
            <>
              <button type="button" onClick={() => void removeThisDay()} className={btnDanger}>
                {t('calendar.form.deleteOne')}
              </button>
              <button type="button" onClick={() => void trash()} className={btnDanger} title={t('calendar.form.deleteSeries')}>
                <IconTrash size={18} aria-hidden />
                <span className="sr-only">{t('calendar.form.deleteSeries')}</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void trash()} className={btnDanger} title={t('calendar.form.delete')}>
              <IconTrash size={18} aria-hidden />
              <span className="sr-only">{t('calendar.form.delete')}</span>
            </button>
          )}
        </span>
      )}
    </>
  )

  return (
    <SidePanel size="lg" title={event ? t('calendar.form.editTitle') : t('calendar.form.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        {event && occDate && (
          <div className="flex items-center justify-between gap-2 card-2 px-3 py-2">
            <span className="text-fg-2 first-letter:uppercase">{longDate.format(parseKey(occDate))}</span>
            <button type="button" onClick={() => void toggleDone()} className={isDone ? btn : btnPrimary}>
              {isDone ? <IconArrowBackUp size={18} aria-hidden /> : <IconCheck size={18} aria-hidden />}
              {isDone ? t('calendar.form.markUndone') : t('calendar.form.markDone')}
            </button>
          </div>
        )}

        <div>
          <label htmlFor={`${id}-title`} className={fieldLabel}>
            {t('calendar.form.title')}
          </label>
          <input
            id={`${id}-title`}
            autoFocus={!event}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={t('calendar.form.titlePlaceholder')}
            aria-invalid={hasError('title')}
            className={input}
          />
          {hasError('title') && <p className={fieldError}>{t('calendar.form.errors.title')}</p>}
        </div>

        <div>
          <label htmlFor={`${id}-cat`} className={fieldLabel}>
            {t('calendar.form.calendar')}
          </label>
          <select id={`${id}-cat`} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={input}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {hasError('category') && <p className={fieldError}>{t('calendar.form.errors.category')}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor={`${id}-date`} className={fieldLabel}>
              {form.repeat === 'none' ? t('calendar.form.date') : t('calendar.form.starts')}
            </label>
            <input id={`${id}-date`} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={input} />
          </div>
          <label className="col-span-2 flex items-center gap-2 self-end pb-1.5 sm:col-span-1">
            <input type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />
            {t('calendar.form.allDay')}
          </label>
          {!form.allDay && (
            <>
              <div>
                <label htmlFor={`${id}-start`} className={fieldLabel}>
                  {t('calendar.form.from')}
                </label>
                <input id={`${id}-start`} type="time" value={form.start} onChange={(e) => set('start', e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor={`${id}-end`} className={fieldLabel}>
                  {t('calendar.form.to')}
                </label>
                <input
                  id={`${id}-end`}
                  type="time"
                  value={form.end}
                  onChange={(e) => set('end', e.target.value)}
                  aria-invalid={hasError('end')}
                  className={input}
                />
              </div>
              {hasError('end') && <p className={`col-span-2 -mt-2 ${fieldError}`}>{t('calendar.form.errors.end')}</p>}
            </>
          )}
          <label className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.multiDay} onChange={(e) => set('multiDay', e.target.checked)} />
            {t('calendar.form.multiDay')}
          </label>
          {form.multiDay && (
            <div className="col-span-2">
              <label htmlFor={`${id}-enddate`} className={fieldLabel}>
                {t('calendar.form.endDate')}
              </label>
              <input
                id={`${id}-enddate`}
                type="date"
                value={form.endDate}
                min={form.date}
                onChange={(e) => set('endDate', e.target.value)}
                aria-invalid={hasError('endDate')}
                className={input}
              />
              {hasError('endDate') && <p className={fieldError}>{t('calendar.form.errors.endDate')}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor={`${id}-repeat`} className={fieldLabel}>
              {t('calendar.form.repeat')}
            </label>
            <select
              id={`${id}-repeat`}
              value={form.repeat}
              onChange={(e) => set('repeat', e.target.value as FormState['repeat'])}
              className={input}
            >
              {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`calendar.form.repeatOptions.${r}`)}
                </option>
              ))}
            </select>
          </div>
          {form.repeat !== 'none' && (
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor={`${id}-until`} className={fieldLabel}>
                {t('calendar.form.until')}
              </label>
              <input
                id={`${id}-until`}
                type="date"
                value={form.until}
                min={form.date}
                onChange={(e) => set('until', e.target.value)}
                aria-invalid={hasError('until')}
                className={input}
              />
              {hasError('until') && <p className={fieldError}>{t('calendar.form.errors.until')}</p>}
            </div>
          )}
          {form.repeat === 'weekly' && (
            <fieldset className="col-span-2">
              <legend className={fieldLabel}>{t('calendar.form.weekdays')}</legend>
              <div className="flex gap-1">
                {WEEK_ORDER.map((wd) => (
                  <button
                    key={wd}
                    type="button"
                    aria-pressed={form.weekdays.includes(wd)}
                    onClick={() => set('weekdays', toggleIn(form.weekdays, wd))}
                    className={`w-8 ${toggleChip(form.weekdays.includes(wd))}`}
                  >
                    {weekdayName(wd)}
                  </button>
                ))}
              </div>
              {hasError('weekdays') && <p className={fieldError}>{t('calendar.form.errors.weekdays')}</p>}
            </fieldset>
          )}
        </div>

        <fieldset>
          <legend className={fieldLabel}>{t('calendar.form.reminders')}</legend>
          <div className="flex flex-wrap gap-1">
            {REMINDER_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                aria-pressed={form.reminders.includes(min)}
                onClick={() => set('reminders', toggleIn(form.reminders, min))}
                className={toggleChip(form.reminders.includes(min))}
              >
                {t(`calendar.form.reminderOptions.${min}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={fieldLabel}>{t('calendar.form.color')}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={form.color === null} onClick={() => set('color', null)} className={toggleChip(form.color === null)}>
              {t('calendar.form.colorAuto')}
            </button>
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={form.color === key}
                aria-label={t(`colors.${key}`)}
                title={t(`colors.${key}`)}
                onClick={() => set('color', key)}
                className={`size-6 rounded-full transition-shadow ${form.color === key ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: COLORS[key].strong }}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.important} onChange={(e) => set('important', e.target.checked)} />
            {t('calendar.form.important')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.countdown} onChange={(e) => set('countdown', e.target.checked)} />
            {t('calendar.form.countdown')}
          </label>
        </div>

        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea
            id={`${id}-notes`}
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={textarea}
          />
        </div>
      </form>
    </SidePanel>
  )
}
