import { useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, DateKey, Task, TaskStatus } from '../../db/types'
import { TaskCard } from './TaskBits'
import { STATUSES, moveTask, orderBetween } from './taskActions'

interface KanbanViewProps {
  tasks: Task[]
  categories: Map<string, Category>
  today: DateKey
  onOpen: (task: Task) => void
}

// Dónde se soltaría la tarjeta: columna y tarjeta delante de la que queda (null = al final)
interface DropTarget {
  status: TaskStatus
  beforeId: string | null
}

export function KanbanView({ tasks, categories, today, onOpen }: KanbanViewProps) {
  const { t } = useTranslation()
  const [dragId, setDragId] = useState<string | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)

  const columns = Object.fromEntries(
    STATUSES.map((s) => [s, tasks.filter((task) => task.status === s).sort((a, b) => a.order - b.order)]),
  ) as Record<TaskStatus, Task[]>

  const onDragStart = (e: DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    setDragId(task.id)
  }

  const onCardOver = (status: TaskStatus) => (e: DragEvent, task: Task) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const list = columns[status]
    const below = e.clientY > rect.top + rect.height / 2
    const index = list.findIndex((x) => x.id === task.id) + (below ? 1 : 0)
    setTarget({ status, beforeId: list[index]?.id ?? null })
  }

  const drop = async (status: TaskStatus) => {
    const task = tasks.find((x) => x.id === dragId)
    const beforeId = target?.status === status ? target.beforeId : null
    setDragId(null)
    setTarget(null)
    if (!task || beforeId === task.id) return
    const list = columns[status].filter((x) => x.id !== task.id)
    const index = beforeId ? list.findIndex((x) => x.id === beforeId) : list.length
    await moveTask(task, status, orderBetween(list[index - 1]?.order, list[index]?.order))
  }

  const indicator = <div className="h-0.5 rounded bg-accent" aria-hidden />

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-4 md:grid-cols-3">
      {STATUSES.map((status) => {
        const isTarget = target?.status === status
        return (
          <section
            key={status}
            aria-label={t(`tasks.status.${status}`)}
            onDragOver={(e) => {
              e.preventDefault()
              if (!isTarget) setTarget({ status, beforeId: null })
            }}
            onDrop={(e) => {
              e.preventDefault()
              void drop(status)
            }}
            className={`flex min-h-40 flex-col gap-2 rounded-app border p-2 transition-colors ${
              isTarget && dragId ? 'border-accent bg-surface-2' : 'border-line bg-bg'
            }`}
          >
            <h2 className="flex items-center justify-between px-1 text-xs text-fg-3">
              <span>{t(`tasks.status.${status}`)}</span>
              <span>{columns[status].length}</span>
            </h2>
            {columns[status].map((task) => (
              <div key={task.id} className={`flex flex-col gap-2 ${task.id === dragId ? 'opacity-40' : ''}`}>
                {dragId && isTarget && target.beforeId === task.id && indicator}
                <TaskCard
                  task={task}
                  category={task.categoryId ? categories.get(task.categoryId) : undefined}
                  today={today}
                  onOpen={onOpen}
                  onDragStart={onDragStart}
                  onDragEnd={() => {
                    setDragId(null)
                    setTarget(null)
                  }}
                  onDragOver={onCardOver(status)}
                />
              </div>
            ))}
            {dragId && isTarget && target.beforeId === null && indicator}
            {columns[status].length === 0 && !dragId && (
              <p className="px-1 py-4 text-center text-xs text-fg-3">{t('tasks.emptyColumn')}</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
