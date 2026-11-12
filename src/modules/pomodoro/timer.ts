// Lógica del temporizador Pomodoro como funciones puras: reciben el estado y la hora y devuelven el estado nuevo.

export type PomodoroMode = 'focus' | 'short' | 'long'

export interface TimerSettings {
  focusMin: number
  shortMin: number
  longMin: number
  // Cuántas sesiones de concentración hasta el descanso largo
  cyclesBeforeLong: number
}

export interface TimerState {
  mode: PomodoroMode
  running: boolean
  // Cuándo termina (ms) mientras está en marcha; null si está parado
  endsAt: number | null
  // Lo que queda cuando está parado
  remainingMs: number
  // Sesiones de concentración terminadas desde que se abrió el ciclo
  focusDone: number
}

export const DEFAULT_SETTINGS: TimerSettings = { focusMin: 25, shortMin: 5, longMin: 15, cyclesBeforeLong: 4 }

export function durationMs(settings: TimerSettings, mode: PomodoroMode): number {
  const minutes = { focus: settings.focusMin, short: settings.shortMin, long: settings.longMin }[mode]
  return minutes * 60_000
}

export function initialState(settings: TimerSettings): TimerState {
  return { mode: 'focus', running: false, endsAt: null, remainingMs: durationMs(settings, 'focus'), focusDone: 0 }
}

export function remaining(state: TimerState, now: number): number {
  return state.running && state.endsAt !== null ? Math.max(0, state.endsAt - now) : state.remainingMs
}

export function start(state: TimerState, now: number): TimerState {
  if (state.running) return state
  return { ...state, running: true, endsAt: now + state.remainingMs }
}

export function pause(state: TimerState, now: number): TimerState {
  if (!state.running) return state
  return { ...state, running: false, endsAt: null, remainingMs: remaining(state, now) }
}

export function switchMode(state: TimerState, settings: TimerSettings, mode: PomodoroMode): TimerState {
  return { ...state, mode, running: false, endsAt: null, remainingMs: durationMs(settings, mode) }
}

// Termina el bloque actual (porque se acabó el tiempo o porque se salta) y prepara el siguiente.
// focusedMs = tiempo de concentración que hay que guardar (0 si era un descanso).
export function finish(state: TimerState, settings: TimerSettings, now: number): { next: TimerState; focusedMs: number } {
  if (state.mode !== 'focus') return { next: switchMode(state, settings, 'focus'), focusedMs: 0 }
  const focusedMs = durationMs(settings, 'focus') - remaining(state, now)
  const focusDone = state.focusDone + 1
  const nextMode = focusDone % settings.cyclesBeforeLong === 0 ? 'long' : 'short'
  return { next: { ...switchMode(state, settings, nextMode), focusDone }, focusedMs }
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
