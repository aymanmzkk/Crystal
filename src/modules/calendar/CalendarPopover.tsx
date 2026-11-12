import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { IconAlignLeft, IconCalendar, IconCheck, IconClock, IconExternalLink, IconPencil, IconRepeat, IconTrash, IconX } from '@tabler/icons-react'
import { btnGhost, btnPrimary } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash } from '../../db/repo'
import type { Category, DateKey } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { minToTime, parseKey, timeToMin } from '../../lib/dates'
import { useToast } from '../../store/toast'
import { addTask } from '../tasks/taskActions'
import { assessmentIdOf, isAssessmentEvent, isEditable, isTaskEvent, taskIdOf, toggleOccurrenceDone } from './activities'
import type { Occurrence } from './recurrence'

export interface Point {
  x: number
  y: number
}

const WIDTH = 380

// Tarjeta flotante junto al punto donde se pulsó (como en Google Calendar). En el móvil sale desde abajo.
function Popover({ at, onClose, children, label }: { at: Point; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const narrow = window.innerWidth < 640

  // Se coloca al lado del clic sin salirse de la pantalla
  useLayoutEffect(() => {
    if (narrow || !ref.current) return
    const h = ref.current.offsetHeight
    const margin = 12
    let left = at.x + 12
    if (left + WIDTH > window.innerWidth - margin) left = Math.max(margin, at.x - WIDTH - 12)
    const top = Math.min(Math.max(margin, at.y - 40), window.innerHeight - h - margin)
    setPos({ left, top })
  }, [at, narrow])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className={`absolute inset-0 ${narrow ? 'animate-[fade-in_0.2s_ease-out] bg-(--overlay)' : ''}`} onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        style={narrow ? undefined : { left: pos?.left ?? at.x, top: pos?.top ?? at.y, width: WIDTH, visibility: pos ? 'visible' : 'hidden' }}
        className={
          narrow
            ? 'absolute inset-x-0 bottom-0 animate-[sheet-in_0.25s_var(--ease-out-soft)] rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl'
            : 'absolute animate-[pop-in_0.16s_var(--ease-out-soft)] rounded-2xl border border-line bg-surface p-4 shadow-2xl'
        }
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

// Fila con icono a la izquierda, como en Google Calendar
function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="mt-0.5 flex w-5 shrink-0 justify-center text-fg-3" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const quietInput = 'h-8 rounded-md bg-transparent px-1.5 text-sm text-fg outline-none transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-(--ring)'

interface QuickCreateProps {
  at: Point
  date: DateKey
  time: string | null
  categories: Category[]
  onClose: () => void
  // "Más opciones": abre el formulario completo con lo escrito
  onMore: (draft: { date: DateKey; time: string | null; title: string; categoryId: string; durationMin: number }) => void
}

// Crear rápido: título, día y hora, calendario. Evento o tarea.
export function QuickCreate({ at, date: initialDate, time: initialTime, categories, onClose, onMore }: QuickCreateProps) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<'event' | 'task'>('event')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate)
  const [allDay, setAllDay] = useState(initialTime === null)
  const [start, setStart] = useState(initialTime ?? '09:00')
  const [end, setEnd] = useState(minToTime(Math.min(24 * 60 - 1, timeToMin(initialTime ?? '09:00') + 60)))
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const duration = Math.max(15, timeToMin(end) - timeToMin(start))
  const category = categories.find((c) => c.id === categoryId)

  async function save(e: FormEvent) {
    e.preventDefault()
    const clean = title.trim() || t('calendar.untitled')
    if (kind === 'task') {
      await addTask({ title: clean, due: date, dueTime: allDay ? null : start, categoryId: categoryId || null })
    } else {
      await createRecord('events', {
        title: clean,
        categoryId,
        date,
        endDate: null,
        time: allDay ? null : start,
        durationMin: allDay ? 0 : duration,
        color: null,
        important: false,
        countdown: false,
        reminders: [30],
        notes: '',
        recurrence: null,
        exdates: [],
        doneDates: [],
      })
    }
    onClose()
  }

  return (
    <Popover at={at} onClose={onClose} label={t('calendar.form.newTitle')}>
      <form onSubmit={(e) => void save(e)}>
        <div className="flex items-start gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('calendar.addTitle')}
            aria-label={t('calendar.form.title')}
            className="min-w-0 flex-1 border-b-2 border-line bg-transparent pb-1.5 text-lg font-medium outline-none placeholder:text-fg-3 focus:border-accent"
          />
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg">
            <IconX size={18} aria-hidden />
          </button>
        </div>

        <div role="tablist" className="mt-3 flex gap-1">
          {(['event', 'task'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${kind === k ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent' : 'text-fg-2 hover:bg-surface-2'}`}
            >
              {k === 'event' ? t('calendar.event') : t('calendar.task')}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <Row icon={<IconClock size={18} />}>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={t('calendar.form.date')} className={`${quietInput} w-full`} />
            {!allDay && (
              <div className="mt-0.5 flex items-center gap-1">
                <input type="time" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label={t('calendar.form.starts')} className={quietInput} />
                {kind === 'event' && (
                  <>
                    <span className="text-fg-3">–</span>
                    <input type="time" value={end} onChange={(e) => e.target.value && setEnd(e.target.value)} aria-label={t('calendar.form.ends')} className={quietInput} />
                  </>
                )}
              </div>
            )}
            <label className="mt-1 flex items-center gap-2 px-1.5 text-sm text-fg-2">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              {t('calendar.form.allDay')}
            </label>
          </Row>
          <Row icon={<span className="block size-3 rounded-[4px]" style={{ backgroundColor: category ? COLORS[category.color].base : 'var(--fg-3)' }} />}>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={t('calendar.form.calendar')} className={`${quietInput} w-full`}>
              {kind === 'task' && <option value="">{t('calendar.noCalendar')}</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Row>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {kind === 'event' && (
            <button type="button" onClick={() => onMore({ date, time: allDay ? null : start, title: title.trim(), categoryId, durationMin: duration })} className={btnGhost}>
              {t('calendar.moreOptions')}
            </button>
          )}
          <button type="submit" className={btnPrimary}>
            {t('calendar.form.save')}
          </button>
        </div>
      </form>
    </Popover>
  )
}

interface EventPeekProps {
  at: Point
  occ: Occurrence
  categories: Map<string, Category>
  onClose: () => void
  onEdit: () => void
  // Para lo que viene de otra app (clase, cumpleaños, cobros...): botón para abrirlo allí
  openApp?: () => void
}

// Vista rápida de un evento o tarea al pulsarlo: datos, marcar hecho, editar y borrar
export function EventPeek({ at, occ, categories, onClose, onEdit, openApp }: EventPeekProps) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const { event } = occ
  const category = categories.get(event.categoryId)
  const color = COLORS[event.color ?? category?.color ?? 'gray'].base
  const done = event.doneDates.includes(occ.start)
  const task = isTaskEvent(event.id)
  const editable = isEditable(occ)
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const when =
    occ.start !== occ.end
      ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).formatRange(parseKey(occ.start), parseKey(occ.end))
      : dayFormat.format(parseKey(occ.start))
  const hours = event.time ? (task ? event.time : `${event.time} – ${minToTime(Math.min(24 * 60 - 1, timeToMin(event.time) + event.durationMin))}`) : t('calendar.allDay')

  async function trash() {
    // En una serie se decide en el formulario completo (este día o todos)
    if (event.recurrence) return onEdit()
    const exam = isAssessmentEvent(event.id)
    const table = task ? 'tasks' : exam ? 'assessments' : 'events'
    const id = task ? taskIdOf(event.id) : exam ? assessmentIdOf(event.id) : event.id
    await moveToTrash(table, id)
    showToast({ message: t('calendar.toast.trashed', { name: event.title }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash(table, id) } })
    onClose()
  }

  const iconBtn = 'inline-flex size-8 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg'

  return (
    <Popover at={at} onClose={onClose} label={event.title}>
      <div className="-mt-1 -mr-1 flex justify-end gap-0.5">
        {editable && (
          <>
            <button type="button" onClick={onEdit} aria-label={t('calendar.form.editTitle')} title={t('calendar.form.editTitle')} className={iconBtn}>
              <IconPencil size={18} aria-hidden />
            </button>
            <button type="button" onClick={() => void trash()} aria-label={t('calendar.form.delete')} title={t('calendar.form.delete')} className={`${iconBtn} hover:text-danger`}>
              <IconTrash size={18} aria-hidden />
            </button>
          </>
        )}
        <button type="button" onClick={onClose} aria-label={t('common.close')} className={iconBtn}>
          <IconX size={18} aria-hidden />
        </button>
      </div>
      <Row icon={<span className="mt-1 block size-3.5 rounded-[4px]" style={{ backgroundColor: color }} />}>
        <h2 className={`text-lg leading-snug font-semibold ${done ? 'text-fg-3 line-through' : ''}`}>{event.title}</h2>
        <p className="mt-0.5 text-sm text-fg-2 first-letter:uppercase">
          {when} · {hours}
        </p>
      </Row>
      {event.recurrence && (
        <Row icon={<IconRepeat size={17} />}>
          <p className="text-sm text-fg-2">{t(`calendar.form.repeatOptions.${event.recurrence.freq}`)}</p>
        </Row>
      )}
      <Row icon={<IconCalendar size={17} />}>
        <p className="text-sm text-fg-2">{task ? `${t('apps.tasks')}${category ? ` · ${category.name}` : ''}` : (category?.name ?? '—')}</p>
      </Row>
      {event.notes && (
        <Row icon={<IconAlignLeft size={17} />}>
          <p className="line-clamp-4 text-sm whitespace-pre-wrap text-fg-2">{event.notes}</p>
        </Row>
      )}
      {openApp && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={openApp} className={btnPrimary}>
            <IconExternalLink size={17} aria-hidden />
            {t('calendar.openInApp')}
          </button>
        </div>
      )}
      {editable && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void toggleOccurrenceDone(occ).then(onClose)}
            className={done ? btnGhost : 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3.5 font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.97]'}
          >
            <IconCheck size={17} aria-hidden />
            {done ? t('calendar.markUndone') : t('calendar.markDone')}
          </button>
        </div>
      )}
    </Popover>
  )
}
