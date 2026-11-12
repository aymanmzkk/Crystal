import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBolt, IconStar } from '@tabler/icons-react'
import type { Category, DateKey, Task } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { addDaysKey, diffDays, parseKey } from '../../lib/dates'
import { dueTone } from './taskActions'

const TONE_CLASS = {
  overdue: 'text-danger',
  today: 'font-semibold text-fg',
  soon: 'text-fg',
  later: 'text-fg-2',
}

// Fecha límite en lenguaje natural ("ayer", "hoy 20:00", "dentro de 3 días", "15 nov")
export function DueBadge({ task, today }: { task: Task; today: DateKey }) {
  const { i18n } = useTranslation()
  if (!task.due) return null
  const tone = task.status === 'done' ? 'later' : dueTone(task.due, today, addDaysKey(today, 3))
  const days = diffDays(today, task.due)
  const text =
    Math.abs(days) <= 3
      ? new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(days, 'day')
      : new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(parseKey(task.due))
  return (
    <span className={`whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {text}
      {task.dueTime && ` ${task.dueTime}`}
    </span>
  )
}

export function PriorityFlags({ task }: { task: Task }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-0.5">
      {task.urgent && <IconBolt size={16} className="text-danger" aria-label={t('tasks.urgent')} />}
      {task.important && <IconStar size={16} className="text-fg" aria-label={t('tasks.important')} />}
    </span>
  )
}

export function CategoryTag({ category }: { category: Category | undefined }) {
  if (!category) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-fg-2">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[category.color].base }} aria-hidden />
      <span className="truncate">{category.name}</span>
    </span>
  )
}

interface TaskCardProps {
  task: Task
  category: Category | undefined
  today: DateKey
  onOpen: (task: Task) => void
  onDragStart?: (e: DragEvent, task: Task) => void
  onDragEnd?: () => void
  onDragOver?: (e: DragEvent, task: Task) => void
}

// Tarjeta de una tarea para el Kanban y la matriz. Se puede arrastrar.
export function TaskCard({ task, category, today, onOpen, onDragStart, onDragEnd, onDragOver }: TaskCardProps) {
  const done = task.status === 'done'
  return (
    <button
      type="button"
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver?.(e, task)}
      onClick={() => onOpen(task)}
      className="flex w-full cursor-grab flex-col gap-1.5 card px-2.5 py-2 text-left transition hover:-translate-y-px hover:border-line-strong active:cursor-grabbing"
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`min-w-0 ${done ? 'text-fg-3 line-through' : ''}`}>{task.title}</span>
        <PriorityFlags task={task} />
      </span>
      {(category || task.due) && (
        <span className="flex items-center justify-between gap-2 text-xs">
          <CategoryTag category={category} />
          <DueBadge task={task} today={today} />
        </span>
      )}
    </button>
  )
}
