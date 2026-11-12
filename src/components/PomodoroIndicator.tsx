import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconClockPause, IconClockPlay } from '@tabler/icons-react'
import { durationMs, formatClock, remaining } from '../modules/pomodoro/timer'
import { usePomodoro } from '../store/pomodoro'

// Tiempo del Pomodoro en la barra inferior, visible desde cualquier app mientras hay un bloque empezado
export function PomodoroIndicator() {
  const { t } = useTranslation()
  const timer = usePomodoro((s) => s.timer)
  const settings = usePomodoro((s) => s.settings)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer.running])

  const started = timer.running || timer.remainingMs < durationMs(settings, timer.mode)
  if (!started) return null

  const Icon = timer.running ? IconClockPlay : IconClockPause
  return (
    <Link to="/pomodoro" className={`flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 font-medium tabular-nums shadow-sm transition-colors hover:border-line-strong hover:text-fg ${timer.running ? 'text-accent' : ''}`}>
      <Icon size={15} aria-hidden />
      {t(`pomodoro.modes.${timer.mode}`)} {formatClock(remaining(timer, now))}
    </Link>
  )
}
