import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { btnPrimary, field, segment } from '../../components/ui'
import { useActiveTasks, useCategories } from '../../db/hooks'
import type { Task } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'
import { useTasksPrefs, type TasksView } from '../../store/tasksPrefs'
import { KanbanView } from './KanbanView'
import { ListView } from './ListView'
import { MatrixView } from './MatrixView'
import { TaskPanel } from './TaskPanel'
import { addTask } from './taskActions'

const VIEWS: TasksView[] = ['list', 'kanban', 'matrix']

type Panel = { kind: 'edit'; taskId: string } | { kind: 'new' } | null

export default function TasksPage({ forcedView }: { forcedView?: TasksView }) {
  const { t } = useTranslation()
  const prefs = useTasksPrefs()
  const [params, setParams] = useSearchParams()
  const [localView, setLocalView] = useState<TasksView | undefined>(forcedView)
  const view = localView ?? prefs.view
  const [quick, setQuick] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const tasks = useActiveTasks()
  const categories = useCategories()
  const today = toDateKey(useNow())

  // ?open=<id> abre una tarea directamente (lo usa el buscador Ctrl+K)
  useEffect(() => {
    const open = params.get('open')
    if (open) {
      setPanel({ kind: 'edit', taskId: open })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const categoryMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase()
    return (tasks ?? []).filter(
      (task) =>
        (!words || task.title.toLowerCase().includes(words) || task.notes.toLowerCase().includes(words)) &&
        (!categoryFilter || task.categoryId === categoryFilter) &&
        (view !== 'list' || prefs.showDone || task.status !== 'done'),
    )
  }, [tasks, search, categoryFilter, view, prefs.showDone])

  const setView = (v: TasksView) => {
    setLocalView(undefined)
    prefs.setView(v)
  }

  async function quickAdd(e: FormEvent) {
    e.preventDefault()
    if (!quick.trim()) return
    await addTask({ title: quick.trim(), categoryId: categoryFilter || null })
    setQuick('')
  }

  const open = (task: Task) => setPanel({ kind: 'edit', taskId: task.id })
  const panelTask = panel?.kind === 'edit' ? tasks?.find((x) => x.id === panel.taskId) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <form onSubmit={(e) => void quickAdd(e)} className="flex min-w-48 flex-1 items-center gap-2">
          <label htmlFor="quick-task" className="sr-only">
            {t('tasks.quickAdd')}
          </label>
          <input
            id="quick-task"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder={t('tasks.quickAdd')}
            className={`${field} w-full max-w-md`}
          />
        </form>
        <div className="relative">
          <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-fg-3" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tasks.search')}
            aria-label={t('tasks.search')}
            className={`${field} w-40 pl-7`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label={t('tasks.form.category')}
          className={`${field} max-w-48`}
        >
          <option value="">{t('tasks.allCategories')}</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {view === 'list' && (
          <label className="flex items-center gap-1.5 text-fg-2">
            <input type="checkbox" checked={prefs.showDone} onChange={(e) => prefs.setShowDone(e.target.checked)} />
            {t('tasks.showDone')}
          </label>
        )}
        <div role="group" aria-label={t('calendar.viewLabel')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {VIEWS.map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={segment(view === v)}>
              {t(`tasks.views.${v}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPanel({ kind: 'new' })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('tasks.newTask')}
        </button>
      </div>

      {tasks && view === 'list' && <ListView tasks={filtered} categories={categoryMap} today={today} onOpen={open} />}
      {tasks && view === 'kanban' && <KanbanView tasks={filtered} categories={categoryMap} today={today} onOpen={open} />}
      {tasks && view === 'matrix' && <MatrixView tasks={filtered} categories={categoryMap} today={today} onOpen={open} />}

      {panel?.kind === 'edit' && panelTask && (
        <TaskPanel key={panelTask.id} task={panelTask} categories={categories ?? []} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'new' && <TaskPanel key="new" categories={categories ?? []} onClose={() => setPanel(null)} />}
    </div>
  )
}

// La app "Prioridades" es la misma lista de tareas, abierta en la vista de matriz
export function PrioritiesPage() {
  return <TasksPage forcedView="matrix" />
}
