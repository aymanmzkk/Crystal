import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../i18n'
import { createRecord } from '../db/repo'
import { toDateKey } from '../lib/dates'
import { notifyUser } from '../lib/notify'
import {
  DEFAULT_SETTINGS,
  durationMs,
  finish,
  initialState,
  pause,
  start,
  switchMode,
  type PomodoroMode,
  type TimerSettings,
  type TimerState,
} from '../modules/pomodoro/timer'
import { useToast } from './toast'

interface PomodoroStore {
  settings: TimerSettings
  timer: TimerState
  // En qué te concentras: texto libre y, opcionalmente, una tarea
  label: string
  taskId: string | null
  // Cuándo empezó la sesión de concentración actual (para guardarla al terminar)
  focusStartedAt: number | null
  start: () => void
  pause: () => void
  reset: () => void
  // Termina el bloque actual: lo llama el vigilante al acabarse el tiempo, o el botón "Saltar"
  complete: (reason: 'time' | 'skip') => void
  setMode: (mode: PomodoroMode) => void
  setLabel: (label: string) => void
  setTaskId: (taskId: string | null) => void
  setSettings: (settings: TimerSettings) => void
}

// Pitido corto al terminar, generado con el navegador (sin archivos de sonido)
function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // Sin audio no pasa nada
  }
}

export const usePomodoro = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      timer: initialState(DEFAULT_SETTINGS),
      label: '',
      taskId: null,
      focusStartedAt: null,
      start: () => {
        const { timer, focusStartedAt } = get()
        const now = Date.now()
        set({ timer: start(timer, now), focusStartedAt: timer.mode === 'focus' ? (focusStartedAt ?? now) : null })
      },
      pause: () => set({ timer: pause(get().timer, Date.now()) }),
      reset: () => {
        const { timer, settings } = get()
        set({ timer: switchMode(timer, settings, timer.mode), focusStartedAt: null })
      },
      complete: (reason) => {
        const { timer, settings, label, taskId, focusStartedAt } = get()
        const now = Date.now()
        const { next, focusedMs } = finish(timer, settings, now)
        set({ timer: next, focusStartedAt: null })
        // Solo se guardan las sesiones de al menos un minuto
        if (focusedMs >= 60_000) {
          const startedAt = focusStartedAt ?? now - focusedMs
          void createRecord('focusSessions', {
            startedAt,
            minutes: Math.round(focusedMs / 60_000),
            date: toDateKey(new Date(startedAt)),
            label: label.trim(),
            taskId,
          })
        }
        if (reason === 'time') {
          beep()
          const message = i18n.t(timer.mode === 'focus' ? 'pomodoro.doneFocus' : 'pomodoro.doneBreak')
          useToast.getState().show({ message })
          void notifyUser('Pomodoro', message, 'pomodoro')
        }
      },
      setMode: (mode) => set({ timer: switchMode(get().timer, get().settings, mode), focusStartedAt: null }),
      setLabel: (label) => set({ label }),
      setTaskId: (taskId) => set({ taskId }),
      setSettings: (settings) => {
        const { timer } = get()
        // Si está parado al principio de un bloque, se ajusta a la nueva duración
        const untouched = !timer.running && timer.remainingMs === durationMs(get().settings, timer.mode)
        set({ settings, timer: untouched ? switchMode(timer, settings, timer.mode) : timer })
      },
    }),
    { name: 'vida-pomodoro' },
  ),
)
