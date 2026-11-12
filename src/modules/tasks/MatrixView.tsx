import { useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { updateRecord } from '../../db/repo'
import type { Category, DateKey, Task } from '../../db/types'
import { TaskCard } from './TaskBits'
import { compareTasks } from './taskActions'

type Quadrant = 'now' | 'plan' | 'quick' | 'later'

const QUADRANTS: { id: Quadrant; urgent: boolean; important: boolean }[] = [
  { id: 'now', urgent: true, important: true },
  { id: 'plan', urgent: false, important: true },
  { id: 'quick', urgent: true, important: false },
  { id: 'later', urgent: false, important: false },
]

interface MatrixViewProps {
  tasks: Task[]
  categories: Map<string, Category>
  today: DateKey
  onOpen: (task: Task) => void
}

// Matriz urgente / importante. Solo tareas sin terminar. Arrastrar a otro cuadro cambia las marcas.
export function MatrixView({ tasks, categories, today, onOpen }: MatrixViewProps) {
  const { t } = useTranslation()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Quadrant | null>(null)
  const pending = tasks.filter((task) => task.status !== 'done')

  const onDragStart = (e: DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    setDragId(task.id)
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-4 md:grid-cols-2">
      {QUADRANTS.map((q) => {
        const list = pending.filter((task) => task.urgent === q.urgent && task.important === q.important).sort(compareTasks)
        return (
          <section
            key={q.id}
            aria-label={t(`tasks.matrix.${q.id}.title`)}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(q.id)
            }}
            onDragLeave={() => setOver((o) => (o === q.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              const task = pending.find((x) => x.id === dragId)
              setDragId(null)
              setOver(null)
              if (task) void updateRecord('tasks', task.id, { urgent: q.urgent, important: q.important })
            }}
            className={`flex min-h-44 flex-col gap-2 rounded-app border p-2 transition-colors ${
              over === q.id && dragId ? 'border-accent bg-surface-2' : 'border-line bg-bg'
            }`}
          >
            <h2 className="px-1">
              <span className="font-semibold">{t(`tasks.matrix.${q.id}.title`)}</span>
              <span className="ml-2 text-xs text-fg-3">{t(`tasks.matrix.${q.id}.hint`)}</span>
            </h2>
            {list.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                category={task.categoryId ? categories.get(task.categoryId) : undefined}
                today={today}
                onOpen={onOpen}
                onDragStart={onDragStart}
                onDragEnd={() => {
                  setDragId(null)
                  setOver(null)
                }}
              />
            ))}
            {list.length === 0 && <p className="px-1 py-4 text-center text-xs text-fg-3">{t('tasks.emptyColumn')}</p>}
          </section>
        )
      })}
    </div>
  )
}
