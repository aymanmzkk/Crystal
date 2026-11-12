import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipForward, IconRefresh } from '@tabler/icons-react'
import { BarChart } from '../../components/BarChart'
import { btnIcon, btnPrimary, fieldLabel, input, segment } from '../../components/ui'
import { useActiveTasks, useFocusSessionsSince } from '../../db/hooks'
import { addDaysKey, parseKey, toDateKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import { usePomodoro } from '../../store/pomodoro'
import { durationMs, formatClock, remaining, type PomodoroMode } from './timer'

const MODES: PomodoroMode[] = ['focus', 'short', 'long']
const RING = 2 * Math.PI * 96

export default function PomodoroPage() {
  const { t, i18n } = useTranslation()
  const pomodoro = usePomodoro()
  const { timer, settings } = pomodoro
  const [now, setNow] = useState(() => Date.now())
  const today = toDateKey(new Date(now))
  const weekStart = addDaysKey(today, -6)
  const sessions = useFocusSessionsSince(weekStart)
  const tasks = useActiveTasks()

  // Refresco más rápido que un segundo para que el reloj no salte
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const left = remaining(timer, now)
  const total = durationMs(settings, timer.mode)
  const progress = 1 - left / total
  const pending = (tasks ?? []).filter((task) => task.status !== 'done')

  const todaySessions = (sessions ?? []).filter((s) => s.date === today).sort((a, b) => b.startedAt - a.startedAt)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const weekMinutes = (sessions ?? []).reduce((sum, s) => sum + s.minutes, 0)
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const longDay = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })
  const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const bars = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysKey(weekStart, i)
    const minutes = (sessions ?? []).filter((s) => s.date === day).reduce((sum, s) => sum + s.minutes, 0)
    return {
      key: day,
      label: weekday.format(parseKey(day)),
      fullLabel: longDay.format(parseKey(day)),
      value: minutes,
      valueLabel: formatMinutes(minutes),
      highlight: day === today,
    }
  })

  const setNumber = (key: keyof typeof settings, value: string) => {
    const n = Math.round(Number(value))
    if (n >= 1 && n <= 180) pomodoro.setSettings({ ...settings, [key]: n })
  }

  return (
    <main className="grid w-full flex-1 grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label={t('apps.pomodoro')} className="flex flex-col items-center gap-5 card p-6">
        <div role="group" aria-label={t('pomodoro.mode')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {MODES.map((m) => (
            <button key={m} type="button" aria-pressed={timer.mode === m} onClick={() => pomodoro.setMode(m)} className={segment(timer.mode === m)}>
              {t(`pomodoro.modes.${m}`)}
            </button>
          ))}
        </div>

        <div className="relative size-56">
          <svg viewBox="0 0 208 208" className="size-full -rotate-90" aria-hidden>
            <circle cx="104" cy="104" r="96" fill="none" stroke="var(--line)" strokeWidth="6" />
            <circle
              cx="104"
              cy="104"
              r="96"
              fill="none"
              stroke={timer.mode === 'focus' ? 'var(--fg)' : '#1D9E75'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-semibold tabular-nums" role="timer" aria-live="off">
              {formatClock(left)}
            </span>
            <span className="mt-1 text-fg-3">{t(`pomodoro.modes.${timer.mode}`)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={pomodoro.reset} aria-label={t('pomodoro.reset')} title={t('pomodoro.reset')} className={btnIcon}>
            <IconRefresh size={20} aria-hidden />
          </button>
          <button type="button" onClick={timer.running ? pomodoro.pause : pomodoro.start} className={`${btnPrimary} h-10 w-32 text-sm`}>
            {timer.running ? <IconPlayerPause size={20} aria-hidden /> : <IconPlayerPlay size={20} aria-hidden />}
            {timer.running ? t('pomodoro.pause') : t('pomodoro.start')}
          </button>
          <button type="button" onClick={() => pomodoro.complete('skip')} aria-label={t('pomodoro.skip')} title={t('pomodoro.skip')} className={btnIcon}>
            <IconPlayerSkipForward size={20} aria-hidden />
          </button>
        </div>

        <div className="flex gap-1.5" aria-label={t('pomodoro.cycle', { done: timer.focusDone % settings.cyclesBeforeLong, total: settings.cyclesBeforeLong })}>
          {Array.from({ length: settings.cyclesBeforeLong }, (_, i) => (
            <span key={i} className={`size-2.5 rounded-full ${i < timer.focusDone % settings.cyclesBeforeLong ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>

        <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pomo-label" className={fieldLabel}>
              {t('pomodoro.label')}
            </label>
            <input
              id="pomo-label"
              value={pomodoro.label}
              onChange={(e) => pomodoro.setLabel(e.target.value)}
              placeholder={t('pomodoro.labelPlaceholder')}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="pomo-task" className={fieldLabel}>
              {t('pomodoro.task')}
            </label>
            <select id="pomo-task" value={pomodoro.taskId ?? ''} onChange={(e) => pomodoro.setTaskId(e.target.value || null)} className={input}>
              <option value="">{t('pomodoro.noTask')}</option>
              {pending.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="w-full max-w-md">
          <summary className="cursor-pointer text-fg-2">{t('pomodoro.settings')}</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['focusMin', 'shortMin', 'longMin', 'cyclesBeforeLong'] as const).map((key) => (
              <div key={key}>
                <label htmlFor={`pomo-${key}`} className={fieldLabel}>
                  {t(`pomodoro.fields.${key}`)}
                </label>
                <input
                  id={`pomo-${key}`}
                  type="number"
                  min={1}
                  max={180}
                  defaultValue={settings[key]}
                  onChange={(e) => setNumber(key, e.target.value)}
                  className={input}
                />
              </div>
            ))}
          </div>
        </details>
      </section>

      <section aria-label={t('pomodoro.stats')} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('pomodoro.today'), value: formatMinutes(todayMinutes) },
            { label: t('pomodoro.sessionsToday'), value: String(todaySessions.length) },
            { label: t('pomodoro.last7'), value: formatMinutes(weekMinutes) },
          ].map((tile) => (
            <div key={tile.label} className="card px-3 py-2.5">
              <div className="text-xs text-fg-3">{tile.label}</div>
              <div className="mt-0.5 text-lg font-semibold">{tile.value}</div>
            </div>
          ))}
        </div>
        <div className="card p-3">
          <BarChart title={t('pomodoro.chartTitle')} bars={bars} />
        </div>
        <div className="card">
          <h2 className="border-b border-line px-3 py-2 text-xs text-fg-3">{t('pomodoro.todayList')}</h2>
          {todaySessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-fg-3">{t('pomodoro.noSessions')}</p>
          ) : (
            <ul>
              {todaySessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
                  <span className="w-12 text-fg-2">{time.format(s.startedAt)}</span>
                  <span className="min-w-0 flex-1 truncate">{s.label || tasks?.find((x) => x.id === s.taskId)?.title || t('pomodoro.untitled')}</span>
                  <span className="text-fg-2">{formatMinutes(s.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
