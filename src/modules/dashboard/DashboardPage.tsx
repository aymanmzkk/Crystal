import { useState, type ComponentType, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconArrowDown,
  IconArrowUp,
  IconBarbell,
  IconCalendarEvent,
  IconCheckbox,
  IconClockPlay,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconHourglass,
  IconLayoutDashboard,
  IconRepeat,
  IconSchool,
} from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary } from '../../components/ui'
import type { DateKey } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import type { AppIcon } from '../registry'
import { fullOrder, useDashboardPrefs, type WidgetId } from '../../store/dashboardPrefs'
import { greetingKey, useKpis } from './kpis'
import {
  CountdownsWidget,
  FocusWidget,
  GymWidget,
  HabitsWidget,
  SchoolWidget,
  TasksWidget,
  TodayWidget,
  WidgetLink,
} from './widgets'

const WIDGET_DEFS: Record<WidgetId, { icon: AppIcon; to: string; Component: ComponentType<{ today: DateKey }> }> = {
  today: { icon: IconCalendarEvent, to: '/calendar', Component: TodayWidget },
  tasks: { icon: IconCheckbox, to: '/tasks', Component: TasksWidget },
  habits: { icon: IconRepeat, to: '/habits', Component: HabitsWidget },
  countdowns: { icon: IconHourglass, to: '/calendar', Component: CountdownsWidget },
  focus: { icon: IconClockPlay, to: '/pomodoro', Component: FocusWidget },
  school: { icon: IconSchool, to: '/exams', Component: SchoolWidget },
  gym: { icon: IconBarbell, to: '/gym', Component: GymWidget },
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const { order, hidden, setOrder, toggleHidden } = useDashboardPrefs()
  const [editing, setEditing] = useState(false)
  const [dragId, setDragId] = useState<WidgetId | null>(null)
  const kpis = useKpis(today)
  const widgets = fullOrder(order)
  const visible = editing ? widgets : widgets.filter((id) => !hidden.includes(id))

  const move = (id: WidgetId, to: number) => {
    const list = widgets.filter((x) => x !== id)
    list.splice(Math.max(0, Math.min(list.length, to)), 0, id)
    setOrder(list)
  }
  const onDrop = (target: WidgetId) => (e: DragEvent) => {
    e.preventDefault()
    if (dragId && dragId !== target) move(dragId, widgets.indexOf(target))
    setDragId(null)
  }

  const greeting = t(greetingKey(new Date()))
  const kpiTiles = [
    { label: t('dashboard.kpis.events'), value: String(kpis.events) },
    { label: t('dashboard.kpis.tasks'), value: String(kpis.tasks) },
    { label: t('dashboard.kpis.habits'), value: kpis.habitsTotal ? `${kpis.habitsDone}/${kpis.habitsTotal}` : '—' },
    { label: t('dashboard.kpis.focus'), value: formatMinutes(kpis.focus) },
  ]

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <IconLayoutDashboard size={20} aria-hidden />
          {greeting}
          <span className="font-normal text-fg-3 first-letter:uppercase">
            · {new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </span>
        </h1>
        <span className="flex-1" />
        <button type="button" onClick={() => setEditing((e) => !e)} aria-pressed={editing} className={editing ? btnPrimary : btn}>
          {editing ? t('dashboard.done') : t('dashboard.customize')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {kpiTiles.map((tile) => (
          <div key={tile.label} className="card px-3 py-2.5">
            <div className="text-xs text-fg-3">{tile.label}</div>
            <div className="mt-0.5 text-xl font-semibold">{tile.value}</div>
          </div>
        ))}
      </div>

      {editing && <p className="text-xs text-fg-3">{t('dashboard.customizeHint')}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((id, index) => {
          const { icon: Icon, to, Component } = WIDGET_DEFS[id]
          const isHidden = hidden.includes(id)
          return (
            <section
              key={id}
              aria-label={t(`dashboard.widgets.${id}`)}
              draggable={editing}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDragId(id)
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={onDrop(id)}
              className={`flex flex-col rounded-app border bg-surface transition ${
                dragId === id ? 'opacity-40' : ''
              } ${editing ? 'cursor-grab border-dashed border-line-strong' : 'border-line'} ${isHidden ? 'opacity-50' : ''}`}
            >
              <header className="flex items-center gap-2 border-b border-line px-3 py-2">
                {editing && <IconGripVertical size={18} className="text-fg-3" aria-hidden />}
                <Icon size={19} className="text-fg-2" aria-hidden />
                <h2 className="min-w-0 flex-1 truncate font-semibold">{t(`dashboard.widgets.${id}`)}</h2>
                {editing ? (
                  <span className="flex gap-1">
                    <button type="button" onClick={() => move(id, index - 1)} disabled={index === 0} aria-label={t('routines.moveUp')} className={`${btnIcon} size-7 disabled:opacity-30`}>
                      <IconArrowUp size={16} aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(id, index + 1)} disabled={index === visible.length - 1} aria-label={t('routines.moveDown')} className={`${btnIcon} size-7 disabled:opacity-30`}>
                      <IconArrowDown size={16} aria-hidden />
                    </button>
                    <button type="button" onClick={() => toggleHidden(id)} aria-pressed={!isHidden} aria-label={isHidden ? t('dashboard.show') : t('dashboard.hide')} className={`${btnIcon} size-7`}>
                      {isHidden ? <IconEyeOff size={16} aria-hidden /> : <IconEye size={16} aria-hidden />}
                    </button>
                  </span>
                ) : (
                  <WidgetLink to={to} />
                )}
              </header>
              <div className="flex-1 px-3 py-2">{!isHidden || !editing ? <Component today={today} /> : null}</div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
