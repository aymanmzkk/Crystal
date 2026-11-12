import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input, textarea, toggleChip } from '../../components/ui'
import { moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Category, Task, TaskStatus } from '../../db/types'
import { useToast } from '../../store/toast'
import { STATUSES, addTask } from './taskActions'

const REMINDER_OPTIONS = [0, 10, 30, 60, 1440]

interface TaskPanelProps {
  // Tarea que se edita; si no hay, se crea una nueva
  task?: Task
  categories: Category[]
  onClose: () => void
}

export function TaskPanel({ task, categories, onClose }: TaskPanelProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [title, setTitle] = useState(task?.title ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? '')
  const [due, setDue] = useState(task?.due ?? '')
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '')
  const [urgent, setUrgent] = useState(task?.urgent ?? false)
  const [important, setImportant] = useState(task?.important ?? false)
  const [reminders, setReminders] = useState<number[]>(task?.reminders ?? [])
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [titleError, setTitleError] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    const data = {
      title: title.trim(),
      categoryId: categoryId || null,
      due: due || null,
      dueTime: due && dueTime ? dueTime : null,
      urgent,
      important,
      // Sin fecha límite no hay a qué hora avisar
      reminders: due ? [...reminders].sort((a, b) => a - b) : [],
      notes: notes.trim(),
    }
    if (task) {
      const statusChange =
        status === task.status ? {} : { status, completedAt: status === 'done' ? Date.now() : null }
      await updateRecord('tasks', task.id, { ...data, ...statusChange })
    } else {
      await addTask({ ...data, status })
    }
    onClose()
  }

  async function trash() {
    if (!task) return
    await moveToTrash('tasks', task.id)
    showToast({
      message: t('calendar.toast.trashed', { name: task.title }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('tasks', task.id) },
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
      {task && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={task ? t('tasks.form.editTitle') : t('tasks.form.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-title`} className={fieldLabel}>
            {t('tasks.form.title')}
          </label>
          <input
            id={`${id}-title`}
            autoFocus={!task}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setTitleError(false)
            }}
            placeholder={t('tasks.form.titlePlaceholder')}
            aria-invalid={titleError}
            className={input}
          />
          {titleError && <p className={fieldError}>{t('calendar.form.errors.title')}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-status`} className={fieldLabel}>
              {t('tasks.form.status')}
            </label>
            <select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={input}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`tasks.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-cat`} className={fieldLabel}>
              {t('tasks.form.category')}
            </label>
            <select id={`${id}-cat`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
              <option value="">{t('tasks.form.noCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-due`} className={fieldLabel}>
              {t('tasks.form.due')}
            </label>
            <input id={`${id}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-time`} className={fieldLabel}>
              {t('tasks.form.dueTime')}
            </label>
            <input
              id={`${id}-time`}
              type="time"
              value={dueTime}
              disabled={!due}
              onChange={(e) => setDueTime(e.target.value)}
              className={`${input} disabled:opacity-50`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            {t('tasks.urgent')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
            {t('tasks.important')}
          </label>
        </div>

        {due && (
          <fieldset>
            <legend className={fieldLabel}>{t('calendar.form.reminders')}</legend>
            <div className="flex flex-wrap gap-1">
              {REMINDER_OPTIONS.map((min) => (
                <button
                  key={min}
                  type="button"
                  aria-pressed={reminders.includes(min)}
                  onClick={() => setReminders((r) => (r.includes(min) ? r.filter((x) => x !== min) : [...r, min]))}
                  className={toggleChip(reminders.includes(min))}
                >
                  {t(`calendar.form.reminderOptions.${min}`)}
                </button>
              ))}
            </div>
            {!dueTime && <p className="mt-1 text-xs text-fg-3">{t('tasks.form.reminderHint')}</p>}
          </fieldset>
        )}

        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={textarea} />
        </div>
      </form>
    </SidePanel>
  )
}
