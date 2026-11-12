import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconCheckbox, IconChevronLeft, IconChevronRight, IconFilter, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconPlus } from '@tabler/icons-react'
import { COLORS } from '../../lib/colors'
import { btn, btnIcon, btnPrimary, segment } from '../../components/ui'
import { useActiveTasks, useCalendarEvents, useCategories } from '../../db/hooks'
import type { Category, DateKey } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { addDays, addDaysKey, addMonths, parseKey, startOfMonth, startOfWeek, toDateKey } from '../../lib/dates'
import { useCalendarPrefs, type CalendarView } from '../../store/calendarPrefs'
import { TaskPanel } from '../tasks/TaskPanel'
import { isEditable, isTaskEvent, taskEvents, taskIdOf } from './activities'
import { AgendaView } from './AgendaView'
import { EventPeek, QuickCreate, type Point } from './CalendarPopover'
import { CategoryPanel } from './CategoryPanel'
import { EventPanel } from './EventPanel'
import { MonthView } from './MonthView'
import { Sidebar } from './Sidebar'
import { WeekView } from './WeekView'
import { externalTarget } from './external'
import { expandEvents, type Occurrence } from './recurrence'

type Panel =
  | { kind: 'event'; eventId: string; date: DateKey }
  | { kind: 'new-event'; date: DateKey; time: string | null; title?: string; categoryId?: string; durationMin?: number }
  | { kind: 'category'; category: Category | null }
  | { kind: 'task'; taskId: string }
  | { kind: 'quick'; date: DateKey; time: string | null; at: Point }
  | { kind: 'peek'; occ: Occurrence; at: Point }
  | null

const VIEWS: CalendarView[] = ['day', 'week', 'month', 'agenda']

// En el móvil la semana entera no cabe: se enseñan 3 días a partir del elegido
const NARROW = '(max-width: 639px)'
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(NARROW)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(NARROW).matches,
  )
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const { view, setView, hidden, toggleHidden, showTasks, setShowTasks, sidebarCollapsed, setSidebarCollapsed } = useCalendarPrefs()
  const [anchor, setAnchor] = useState(() => new Date())
  const [panel, setPanel] = useState<Panel>(null)
  const [showFilters, setShowFilters] = useState(false)
  const categories = useCategories()
  // Incluye el horario y los exámenes de Clase
  const events = useCalendarEvents()
  const tasks = useActiveTasks()
  const navigate = useNavigate()
  const today = toDateKey(useNow())
  const [params, setParams] = useSearchParams()
  const narrow = useNarrow()

  // Enlaces desde el buscador Ctrl+K: ?open=<id> abre un evento y ?new=<título> crea uno
  useEffect(() => {
    const openId = params.get('open')
    const newTitle = params.get('new')
    if (newTitle !== null) {
      setPanel({ kind: 'new-event', date: today, time: '09:00', title: newTitle })
      setParams({}, { replace: true })
    } else if (openId && events) {
      const event = events.find((e) => e.id === openId)
      if (event) {
        // La próxima vez que ocurre, o su primer día si ya pasó
        const date = expandEvents([event], today, addDaysKey(today, 400))[0]?.start ?? event.date
        setAnchor(parseKey(date))
        setPanel({ kind: 'event', eventId: event.id, date })
      }
      setParams({}, { replace: true })
    }
  }, [params, setParams, events, today])

  const categoryMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])
  // Solo eventos de calendarios que existen (no en la papelera) y que no están ocultos
  const visible = useMemo(
    () => (events ?? []).filter((e) => categoryMap.has(e.categoryId) && !hidden.includes(e.categoryId)),
    [events, categoryMap, hidden],
  )
  // Tareas con fecha como actividades (las de un calendario oculto, no)
  const taskActivities = useMemo(
    () => (showTasks ? taskEvents((tasks ?? []).filter((x) => !x.categoryId || !hidden.includes(x.categoryId))) : []),
    [tasks, showTasks, hidden],
  )
  const unscheduled = useMemo(() => (tasks ?? []).filter((x) => !x.due && x.status !== 'done'), [tasks])

  const range = useMemo(() => {
    if (view === 'day') {
      const d = toDateKey(anchor)
      return { from: d, to: d }
    }
    if (view === 'week') {
      if (narrow) return { from: toDateKey(anchor), to: toDateKey(addDays(anchor, 2)) }
      const s = startOfWeek(anchor)
      return { from: toDateKey(s), to: toDateKey(addDays(s, 6)) }
    }
    const first = startOfMonth(anchor)
    if (view === 'month') {
      const s = startOfWeek(first)
      return { from: toDateKey(s), to: toDateKey(addDays(s, 41)) }
    }
    // Agenda: el mes entero, o desde hoy si es el mes actual
    const from = toDateKey(first)
    const to = toDateKey(addDays(addMonths(first, 1), -1))
    return { from: today > from && today <= to ? today : from, to }
  }, [view, anchor, today, narrow])

  const occurrences = useMemo(() => expandEvents([...visible, ...taskActivities], range.from, range.to), [visible, taskActivities, range])

  // Próxima aparición de cada evento marcado como cuenta atrás
  const countdowns = useMemo(() => {
    const seen = new Set<string>()
    return expandEvents(
      visible.filter((e) => e.countdown),
      today,
      addDaysKey(today, 366),
    )
      .filter((o) => (seen.has(o.event.id) ? false : (seen.add(o.event.id), true)))
      .slice(0, 6)
  }, [visible, today])

  const title =
    view === 'day'
      ? new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(anchor)
      : view === 'week'
      ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(parseKey(range.from), parseKey(range.to))
      : new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(anchor)

  const move = (dir: 1 | -1) => setAnchor((a) => (view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, (narrow ? 3 : 7) * dir) : addMonths(a, dir)))
  // Al pulsar una actividad sale su vista rápida junto al clic (como en Google Calendar)
  const open = (occ: Occurrence, at?: Point) => setPanel({ kind: 'peek', occ, at: at ?? { x: window.innerWidth / 2 - 190, y: 160 } })
  // Editar desde la vista rápida: las tareas en su ficha, lo de otras apps en su app y el resto en el formulario completo
  const edit = (occ: Occurrence) => {
    if (isTaskEvent(occ.event.id)) return setPanel({ kind: 'task', taskId: taskIdOf(occ.event.id) })
    const target = externalTarget(occ.event.id)
    if (target) navigate(target)
    else setPanel({ kind: 'event', eventId: occ.event.id, date: occ.start })
  }
  // Pulsar un hueco abre la creación rápida; el botón "Evento", el formulario completo
  const create = (date: DateKey, time: string | null, at?: Point) => setPanel(at ? { kind: 'quick', date, time, at } : { kind: 'new-event', date, time })
  const close = () => setPanel(null)
  const defaultDate = today >= range.from && today <= range.to ? today : range.from

  // El evento del panel se busca en los datos actuales para que el panel se actualice al marcarlo como hecho
  const panelEvent = panel?.kind === 'event' ? events?.find((e) => e.id === panel.eventId) : undefined

  const sidebar = (
    <Sidebar
      categories={categories ?? []}
      hidden={hidden}
      today={today}
      countdowns={countdowns}
      onToggle={toggleHidden}
      onEditCategory={(category) => setPanel({ kind: 'category', category })}
      onOpen={open}
      showTasks={showTasks}
      onToggleTasks={() => setShowTasks(!showTasks)}
      unscheduled={unscheduled}
      onOpenTask={(taskId) => setPanel({ kind: 'task', taskId })}
    />
  )

  return (
    // El calendario ocupa justo la pantalla (menos la cabecera y, en el móvil, la barra de abajo) para que la cuadrícula llegue hasta el final
    <div className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] min-h-[28rem] flex-col md:h-[calc(100dvh-3.5rem)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <button type="button" onClick={() => setAnchor(new Date())} className={btn}>
          {t('calendar.today')}
        </button>
        <button type="button" onClick={() => move(-1)} aria-label={t('calendar.prev')} className={btnIcon}>
          <IconChevronLeft size={20} aria-hidden />
        </button>
        <button type="button" onClick={() => move(1)} aria-label={t('calendar.next')} className={btnIcon}>
          <IconChevronRight size={20} aria-hidden />
        </button>
        <h1 className="ml-1 text-base font-semibold tracking-tight first-letter:uppercase">{title}</h1>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          aria-label={t('calendar.calendars')}
          className={`${btnIcon} lg:hidden`}
        >
          <IconFilter size={20} aria-hidden />
        </button>
        <div role="group" aria-label={t('calendar.viewLabel')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {VIEWS.map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={segment(view === v)}>
              {t(`calendar.views.${v}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => create(defaultDate, '09:00')} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('calendar.newEvent')}
        </button>
      </div>

      {showFilters && <div className="border-b border-line bg-surface p-3 lg:hidden">{sidebar}</div>}

      <div className="flex min-h-0 flex-1">
        {/* Barra lateral: se pliega igual que la de la app; plegada solo deja los colores de cada calendario */}
        <aside className={`hidden shrink-0 overflow-y-auto border-r border-line transition-[width] duration-200 lg:block ${sidebarCollapsed ? 'w-14' : 'w-60'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1 py-3">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label={t('nav.expand')}
                title={t('nav.expand')}
                className="mb-2 inline-flex size-8 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <IconLayoutSidebarLeftExpand size={18} aria-hidden />
              </button>
              {(categories ?? []).map((c) => {
                const on = !hidden.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleHidden(c.id)}
                    aria-pressed={on}
                    aria-label={c.name}
                    title={c.name}
                    className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-surface-2"
                  >
                    <span className="size-3.5 rounded-[4px] border-2" style={{ borderColor: COLORS[c.color].base, backgroundColor: on ? COLORS[c.color].base : 'transparent' }} />
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setShowTasks(!showTasks)}
                aria-pressed={showTasks}
                aria-label={t('apps.tasks')}
                title={t('apps.tasks')}
                className={`inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-surface-2 ${showTasks ? 'text-fg-2' : 'text-fg-3 opacity-50'}`}
              >
                <IconCheckbox size={18} aria-hidden />
              </button>
            </div>
          ) : (
            <div className="p-3 pt-2">
              <div className="mb-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label={t('nav.collapse')}
                  title={t('nav.collapse')}
                  className="inline-flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <IconLayoutSidebarLeftCollapse size={17} aria-hidden />
                </button>
              </div>
              {sidebar}
            </div>
          )}
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-surface">
          {view === 'month' && (
            <MonthView
              anchor={anchor}
              today={today}
              occurrences={occurrences}
              categories={categoryMap}
              onOpen={open}
              onCreate={(date, at) => create(date, null, at)}
              onShowWeek={(date) => {
                setAnchor(parseKey(date))
                setView('week')
              }}
            />
          )}
          {(view === 'week' || view === 'day') && (
            <WeekView
              key={view}
              start={view === 'day' || narrow ? parseKey(toDateKey(anchor)) : startOfWeek(anchor)}
              dayCount={view === 'day' ? 1 : narrow ? 3 : 7}
              today={today}
              occurrences={occurrences}
              categories={categoryMap}
              onOpen={open}
              onCreate={create}
            />
          )}
          {view === 'agenda' && (
            <AgendaView from={range.from} today={today} occurrences={occurrences} categories={categoryMap} onOpen={open} />
          )}
        </section>
      </div>

      {panel?.kind === 'event' && panelEvent && (
        <EventPanel
          key={`${panel.eventId}:${panel.date}`}
          event={panelEvent}
          occurrenceDate={panel.date}
          categories={categories ?? []}
          onClose={close}
        />
      )}
      {panel?.kind === 'new-event' && (
        <EventPanel
          key={`new:${panel.date}:${panel.time}`}
          draft={{ date: panel.date, time: panel.time, title: panel.title, categoryId: panel.categoryId, durationMin: panel.durationMin }}
          categories={categories ?? []}
          onClose={close}
        />
      )}
      {panel?.kind === 'quick' && (
        <QuickCreate
          key={`${panel.date}:${panel.time}:${panel.at.x}`}
          at={panel.at}
          date={panel.date}
          time={panel.time}
          categories={categories ?? []}
          onClose={close}
          onMore={(draft) => setPanel({ kind: 'new-event', ...draft })}
        />
      )}
      {panel?.kind === 'peek' && (
        <EventPeek
          key={panel.occ.key}
          at={panel.at}
          occ={panel.occ}
          categories={categoryMap}
          onClose={close}
          onEdit={() => edit(panel.occ)}
          openApp={externalTarget(panel.occ.event.id) && !isEditable(panel.occ) ? () => edit(panel.occ) : undefined}
        />
      )}
      {panel?.kind === 'task' && tasks?.find((x) => x.id === panel.taskId) && (
        <TaskPanel key={panel.taskId} task={tasks.find((x) => x.id === panel.taskId)} categories={categories ?? []} onClose={close} />
      )}
      {panel?.kind === 'category' && (
        <CategoryPanel
          key={panel.category?.id ?? 'new'}
          category={panel.category}
          nextOrder={Math.max(-1, ...(categories ?? []).map((c) => c.order)) + 1}
          onClose={close}
        />
      )}
    </div>
  )
}
