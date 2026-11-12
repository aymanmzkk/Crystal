import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconCheckbox,
  IconChevronRight,
  IconClockPlay,
  IconHome2,
  IconNotebook,
  IconPhotoPlus,
  IconPlus,
  IconReceipt2,
  IconRepeat,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react'
import { AppGrid } from '../components/AppGrid'
import { ProgressRing } from '../components/ProgressRing'
import { TopBar } from '../components/TopBar'
import { useActiveTasks, useCalendarEvents, useCategories } from '../db/hooks'
import type { DateKey } from '../db/types'
import { useNow } from '../hooks/useNow'
import { COLORS } from '../lib/colors'
import { addDaysKey, diffDays, minToTime, parseKey, timeToMin, toDateKey } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { externalTarget } from '../modules/calendar/external'
import { compareOccurrences, expandEvents } from '../modules/calendar/recurrence'
import { useXp } from '../modules/achievements/useXp'
import { greetingKey, useKpis } from '../modules/dashboard/kpis'
import { CountdownsWidget, FocusWidget, HabitsWidget } from '../modules/dashboard/widgets'
import { DueBadge, PriorityFlags } from '../modules/tasks/TaskBits'
import { addTask, compareTasks, toggleDone } from '../modules/tasks/taskActions'

// Tarjeta del bento: cabecera pequeña con icono, título y enlace "ver todo"
function Tile({ title, icon, to, className = '', children }: { title: string; icon: ReactNode; to?: string; className?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className={`card flex min-w-0 flex-col p-4 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-fg-3" aria-hidden>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {to && (
          <Link to={to} className="ml-auto flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg">
            {t('common.seeAll')}
            <IconChevronRight size={14} aria-hidden />
          </Link>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function Priorities({ today }: { today: DateKey }) {
  const { t } = useTranslation()
  const tasks = useActiveTasks()
  const [text, setText] = useState('')
  // Primero lo atrasado y lo de hoy, luego lo urgente o importante
  const list = (tasks ?? [])
    .filter((x) => x.status !== 'done' && ((x.due !== null && x.due <= addDaysKey(today, 1)) || x.urgent || x.important))
    .sort(compareTasks)
    .slice(0, 6)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await addTask({ title: text.trim(), due: today })
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      {tasks && list.length === 0 && (
        <p className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center text-sm text-fg-3">
          <IconSparkles size={22} stroke={1.5} aria-hidden />
          {t('home.noPriorities')}
        </p>
      )}
      <ul className="stagger -mx-1 flex flex-col">
        {list.map((task) => (
          <li key={task.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
            <input type="checkbox" checked={false} onChange={() => void toggleDone(task)} aria-label={`${t('tasks.done')}: ${task.title}`} />
            <Link to={`/tasks?open=${task.id}`} className="min-w-0 flex-1 truncate">
              {task.title}
            </Link>
            <PriorityFlags task={task} />
            <span className="shrink-0 text-xs">
              <DueBadge task={task} today={today} />
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => void add(e)} className="mt-auto flex items-center gap-2 border-t border-line pt-3">
        <IconPlus size={16} className="shrink-0 text-fg-3" aria-hidden />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('tasks.quickAdd')}
          aria-label={t('tasks.quickAdd')}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-3"
        />
      </form>
    </div>
  )
}

function Upcoming({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const events = useCalendarEvents()
  const categories = useCategories()
  const active = new Set((categories ?? []).map((c) => c.id))
  const occs = expandEvents((events ?? []).filter((e) => active.has(e.categoryId)), today, addDaysKey(today, 6)).sort(compareOccurrences).slice(0, 7)
  const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })

  if (events && occs.length === 0) return <p className="py-6 text-center text-sm text-fg-3">{t('home.noUpcoming')}</p>
  return (
    <ul className="stagger -mx-1 flex flex-col">
      {occs.map((occ) => {
        const color = COLORS[occ.event.color ?? categories?.find((c) => c.id === occ.event.categoryId)?.color ?? 'gray'].base
        const d = parseKey(occ.start < today ? today : occ.start)
        const days = diffDays(today, occ.start < today ? today : occ.start)
        const done = occ.event.doneDates.includes(occ.start)
        return (
          <li key={occ.key}>
            <Link to={externalTarget(occ.event.id) ?? `/calendar?open=${occ.event.id}`} className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
              <span className="flex w-10 shrink-0 flex-col items-center rounded-md border border-line bg-surface-2 py-0.5 leading-tight">
                <span className="text-[0.625rem] font-medium text-fg-3 uppercase">{dayName.format(d)}</span>
                <span className="text-sm font-semibold">{d.getDate()}</span>
              </span>
              <span className="w-0.5 self-stretch rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${done ? 'text-fg-3 line-through' : ''}`}>{occ.event.title}</span>
                <span className="block text-xs text-fg-3">
                  {days <= 1 ? rtf.format(days, 'day') : ''}
                  {days <= 1 && ' · '}
                  {occ.event.time ? `${occ.event.time}–${minToTime(Math.min(1439, timeToMin(occ.event.time) + occ.event.durationMin))}` : t('calendar.allDay')}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

const QUICK = [
  { to: '/calendar?new=', icon: IconCalendarPlus, label: 'home.quick.event' },
  { to: '/pomodoro', icon: IconClockPlay, label: 'home.quick.focus' },
  { to: '/finance?tab=movements', icon: IconReceipt2, label: 'home.quick.expense' },
  { to: '/notes', icon: IconNotebook, label: 'home.quick.note' },
  { to: '/memories', icon: IconPhotoPlus, label: 'home.quick.memory' },
  { to: '/tasks', icon: IconCheckbox, label: 'home.quick.task' },
]

export function Home() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const today = toDateKey(now)
  const kpis = useKpis(today)
  const xp = useXp()
  const tasks = useActiveTasks()

  // Progreso del día: hábitos de hoy + tareas que vencían hasta hoy (hechas o no) + eventos de hoy ya pasados
  const dueToday = (tasks ?? []).filter((x) => x.due !== null && x.due <= today && (x.status !== 'done' || (x.completedAt !== null && toDateKey(new Date(x.completedAt)) === today)))
  const tasksDone = dueToday.filter((x) => x.status === 'done').length
  const total = kpis.habitsTotal + dueToday.length
  const done = kpis.habitsDone + tasksDone
  const ratio = total ? done / total : 0

  const stats = [
    { to: '/calendar', icon: IconCalendarEvent, value: String(kpis.events), label: t('dashboard.kpis.events') },
    { to: '/tasks', icon: IconCheckbox, value: String(kpis.tasks), label: t('dashboard.kpis.tasks'), alert: kpis.tasks > 0 },
    { to: '/habits', icon: IconRepeat, value: kpis.habitsTotal ? `${kpis.habitsDone}/${kpis.habitsTotal}` : '—', label: t('dashboard.kpis.habits') },
    { to: '/pomodoro', icon: IconClockPlay, value: formatMinutes(kpis.focus), label: t('dashboard.kpis.focus') },
  ]

  return (
    <>
      <TopBar title={t('nav.home')} icon={<IconHome2 size={18} stroke={1.8} />} />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12 md:gap-4">
          {/* Bienvenida y resumen del día */}
          <section className="hero-glow card relative overflow-hidden p-5 md:col-span-6 lg:col-span-8 md:p-6">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              {new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{t(greetingKey(now))}</h1>
            {/* Nivel y puntos: lleva a Logros */}
            {xp && (
              <Link
                to="/achievements"
                className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1 pr-3 pl-1 text-xs font-medium backdrop-blur-md transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong sm:absolute sm:top-5 sm:right-5 sm:mt-0 md:top-6 md:right-6"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-warning">
                  <IconTrophy size={15} aria-hidden />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold">{t('achievements.level', { level: xp.level.level })}</span>
                  <span className="mt-0.5 block h-1 w-20 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                    <span className="accent-gradient block h-full rounded-full" style={{ width: `${(xp.level.into / xp.level.needed) * 100}%` }} />
                  </span>
                </span>
                <span className="text-fg-3 tabular-nums">
                  {xp.level.into}/{xp.level.needed}
                </span>
              </Link>
            )}
            <p className="mt-1 text-sm text-fg-2">{t('home.overview')}</p>
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map(({ to, icon: Icon, value, label, alert }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex h-full flex-col gap-2 rounded-xl border border-line bg-surface/70 p-3 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
                  >
                    <Icon size={18} stroke={1.75} className={alert ? 'text-danger' : 'text-fg-3 transition-colors group-hover:text-accent'} aria-hidden />
                    <span>
                      <span className="block text-xl leading-tight font-semibold tracking-tight tabular-nums">{value}</span>
                      <span className="block text-xs leading-snug text-fg-3">{label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Progreso del día */}
          <section className="card flex items-center gap-5 p-5 md:col-span-6 lg:col-span-4 lg:flex-col lg:justify-center lg:text-center">
            <ProgressRing value={ratio} size={112} label={t('home.dayProgress')} />
            <div>
              <h2 className="text-sm font-semibold">{t('home.dayProgress')}</h2>
              <p className="mt-0.5 text-sm text-fg-2">{total ? t('home.dayProgressHint', { done, total }) : t('home.nothingToday')}</p>
              {total > 0 && (
                <div className="mt-3 flex gap-1 lg:justify-center" aria-hidden>
                  {Array.from({ length: Math.min(total, 12) }, (_, i) => (
                    <span key={i} className={`h-1.5 w-4 rounded-full transition-colors duration-500 ${i < Math.round((done / total) * Math.min(total, 12)) ? 'bg-accent' : 'bg-surface-3'}`} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <Tile title={t('home.priorities')} icon={<IconCheckbox size={17} />} to="/tasks" className="md:col-span-6 lg:col-span-5 lg:row-span-2">
            <Priorities today={today} />
          </Tile>

          <Tile title={t('home.upcoming')} icon={<IconCalendarEvent size={17} />} to="/calendar" className="md:col-span-3 lg:col-span-4 lg:row-span-2">
            <Upcoming today={today} />
          </Tile>

          <Tile title={t('home.habitProgress')} icon={<IconRepeat size={17} />} to="/habits" className="md:col-span-3 lg:col-span-3 lg:row-span-2">
            <HabitsWidget today={today} />
          </Tile>

          <Tile title={t('home.quickActions')} icon={<IconSparkles size={17} />} className="md:col-span-2 lg:col-span-4">
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map(({ to, icon: Icon, label }) => (
                <Link
                  key={label}
                  to={to}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2/50 px-1 py-3 text-xs font-medium text-fg-2 transition-[border-color,background-color,transform,color] duration-150 hover:border-line-strong hover:bg-surface-2 hover:text-fg active:scale-95"
                >
                  <Icon size={20} stroke={1.75} className="text-fg-3 transition-colors group-hover:text-accent" aria-hidden />
                  {t(label)}
                </Link>
              ))}
            </div>
          </Tile>

          <Tile title={t('home.countdowns')} icon={<IconCalendarEvent size={17} />} to="/calendar" className="md:col-span-2 lg:col-span-4">
            <CountdownsWidget today={today} />
          </Tile>

          <Tile title={t('dashboard.widgets.focus')} icon={<IconClockPlay size={17} />} to="/pomodoro" className="md:col-span-2 lg:col-span-4">
            <FocusWidget today={today} />
          </Tile>
        </div>

        {/* En el móvil la barra lateral está escondida: aquí están todas las apps a mano */}
        <section className="mt-6 md:hidden">
          <h2 className="eyebrow mb-3">{t('home.allApps')}</h2>
          <AppGrid />
        </section>
      </main>
    </>
  )
}
