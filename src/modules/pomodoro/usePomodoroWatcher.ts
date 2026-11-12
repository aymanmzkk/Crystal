import { useEffect } from 'react'
import { usePomodoro } from '../../store/pomodoro'
import { formatClock, remaining } from './timer'

// Cada segundo: si el temporizador ha llegado a 0 termina el bloque, y pone el tiempo en el título de la pestaña
export function usePomodoroWatcher() {
  useEffect(() => {
    const tick = () => {
      const { timer, complete } = usePomodoro.getState()
      const now = Date.now()
      if (timer.running && timer.endsAt !== null && now >= timer.endsAt) complete('time')
      const current = usePomodoro.getState().timer
      document.title = current.running ? `${formatClock(remaining(current, now))} · Crystal` : 'Crystal'
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
}
