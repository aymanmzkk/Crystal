import { useTranslation } from 'react-i18next'
import type { Category, DateKey, Task } from '../../db/types'
import { CategoryTag, DueBadge, PriorityFlags } from './TaskBits'
import { compareTasks, toggleDone } from './taskActions'

interface ListViewProps {
  tasks: Task[]
  categories: Map<string, Category>
  today: DateKey
  onOpen: (task: Task) => void
}

const STATUS_PILL = {
  todo: 'border-line-strong text-fg-2',
  doing: 'border-accent text-fg',
  done: 'border-line text-fg-3',
}

export function ListView({ tasks, categories, today, onOpen }: ListViewProps) {
  const { t } = useTranslation()
  const sorted = [...tasks].sort(compareTasks)

  if (sorted.length === 0) return <p className="px-4 py-16 text-center text-fg-2">{t('tasks.empty')}</p>

  return (
    <div className="p-4">
      <div className="overflow-hidden card">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
            <tr>
              <th className="w-10 px-3 py-2">
                <span className="sr-only">{t('tasks.done')}</span>
              </th>
              <th className="px-3 py-2 font-normal">{t('tasks.form.title')}</th>
              <th className="hidden w-40 px-3 py-2 font-normal md:table-cell">{t('tasks.form.category')}</th>
              <th className="w-28 px-3 py-2 font-normal">{t('tasks.form.due')}</th>
              <th className="hidden w-16 px-3 py-2 font-normal sm:table-cell">{t('tasks.priority')}</th>
              <th className="hidden w-28 px-3 py-2 font-normal sm:table-cell">{t('tasks.form.status')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => (
              <tr key={task.id} onClick={() => onOpen(task)} className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2">
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => void toggleDone(task)}
                    aria-label={`${t('tasks.done')}: ${task.title}`}
                  />
                </td>
                <td className={`truncate px-3 py-2 ${task.status === 'done' ? 'text-fg-3 line-through' : ''}`}>{task.title}</td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <CategoryTag category={task.categoryId ? categories.get(task.categoryId) : undefined} />
                </td>
                <td className="px-3 py-2">
                  <DueBadge task={task} today={today} />
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <PriorityFlags task={task} />
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_PILL[task.status]}`}>
                    {t(`tasks.status.${task.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
