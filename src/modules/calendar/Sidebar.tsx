import { useTranslation } from 'react-i18next'
import { IconCheckbox, IconGripVertical, IconHourglass, IconPencil, IconPlus } from '@tabler/icons-react'
import type { Category, DateKey, Task } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { diffDays } from '../../lib/dates'
import { getCategoryIcon } from '../../lib/icons'
import { UNSCHEDULED, startDrag } from './EventChip'
import type { Occurrence } from './recurrence'

interface SidebarProps {
  categories: Category[]
  hidden: string[]
  today: DateKey
  countdowns: Occurrence[]
  onToggle: (id: string) => void
  onEditCategory: (category: Category | null) => void
  onOpen: (occ: Occurrence) => void
  showTasks: boolean
  onToggleTasks: () => void
  // Tareas sin fecha: se arrastran al calendario para programarlas
  unscheduled: Task[]
  onOpenTask: (taskId: string) => void
}

export function Sidebar({ categories, hidden, today, countdowns, onToggle, onEditCategory, onOpen, showTasks, onToggleTasks, unscheduled, onOpenTask }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-1 flex items-center justify-between px-1.5 text-xs text-fg-3">
          <h2>{t('calendar.calendars')}</h2>
          <button
            type="button"
            onClick={() => onEditCategory(null)}
            aria-label={t('calendar.newCalendar')}
            title={t('calendar.newCalendar')}
            className="rounded p-0.5 hover:bg-surface-2 hover:text-fg"
          >
            <IconPlus size={18} aria-hidden />
          </button>
        </div>
        <ul>
          {categories.map((c) => {
            const visible = !hidden.includes(c.id)
            const Icon = getCategoryIcon(c.icon)
            const color = COLORS[c.color].base
            return (
              <li key={c.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => onToggle(c.id)}
                  aria-pressed={visible}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                >
                  <span
                    className="size-3 shrink-0 rounded-[3px] border-2"
                    style={{ borderColor: color, backgroundColor: visible ? color : 'transparent' }}
                    aria-hidden
                  />
                  <Icon size={18} className="shrink-0 text-fg-2" aria-hidden />
                  <span className={`truncate ${visible ? '' : 'text-fg-3'}`}>{c.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEditCategory(c)}
                  aria-label={`${t('calendar.editCalendar')}: ${c.name}`}
                  className="rounded p-1 text-fg-3 hover:text-fg focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                  <IconPencil size={16} aria-hidden />
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={onToggleTasks}
              aria-pressed={showTasks}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
            >
              <span className="size-3 shrink-0 rounded-[3px] border-2 border-fg-3" style={{ backgroundColor: showTasks ? 'var(--fg-3)' : 'transparent' }} aria-hidden />
              <IconCheckbox size={18} className="shrink-0 text-fg-2" aria-hidden />
              <span className={`truncate ${showTasks ? '' : 'text-fg-3'}`}>{t('apps.tasks')}</span>
            </button>
          </li>
        </ul>
      </section>

      {showTasks && unscheduled.length > 0 && (
        <section>
          <h2 className="mb-1 px-1.5 text-xs text-fg-3">{t('calendar.unscheduled')}</h2>
          <p className="mb-2 px-1.5 text-[0.6875rem] leading-snug text-fg-3">{t('calendar.unscheduledHint')}</p>
          <ul className="flex flex-col gap-1">
            {unscheduled.slice(0, 12).map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => startDrag(e, `${UNSCHEDULED}${task.id}`, 0, 30)}
                  onClick={() => onOpenTask(task.id)}
                  className="group flex w-full cursor-grab items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-1 text-left text-[0.8125rem] shadow-sm transition-[border-color,transform] hover:-translate-y-px hover:border-line-strong active:cursor-grabbing"
                >
                  <IconGripVertical size={14} className="shrink-0 text-fg-3" aria-hidden />
                  <span className="truncate">{task.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 flex items-center gap-1 px-1.5 text-xs text-fg-3">
          <IconHourglass size={15} aria-hidden />
          {t('calendar.countdowns')}
        </h2>
        {countdowns.length === 0 ? (
          <p className="px-1.5 text-xs text-fg-3">{t('calendar.noCountdowns')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {countdowns.map((occ) => {
              const days = diffDays(today, occ.start)
              return (
                <li key={occ.key}>
                  <button
                    type="button"
                    onClick={() => onOpen(occ)}
                    className="w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="font-semibold">{days === 0 ? t('calendar.todayShort') : t('calendar.days', { count: days })}</span>
                    <span className="block truncate text-xs text-fg-2">{occ.event.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
