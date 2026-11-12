import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS as S, finish, formatClock, initialState, pause, remaining, start } from './timer'

const MIN = 60_000

describe('temporizador Pomodoro', () => {
  it('cuenta hacia atrás y conserva lo que queda al pausar', () => {
    let state = start(initialState(S), 0)
    expect(remaining(state, 10 * MIN)).toBe(15 * MIN)
    state = pause(state, 10 * MIN)
    // Aunque pase el tiempo, en pausa no baja
    expect(remaining(state, 60 * MIN)).toBe(15 * MIN)
    state = start(state, 60 * MIN)
    expect(remaining(state, 75 * MIN)).toBe(0)
  })

  it('tras una sesión de concentración toca descanso corto, y largo cada 4', () => {
    let state = initialState(S)
    const modes: string[] = []
    for (let i = 0; i < 8; i++) {
      state = finish(start(state, 0), S, 25 * MIN).next
      modes.push(state.mode)
    }
    expect(modes).toEqual(['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus'])
  })

  it('al saltar una sesión a medias solo guarda el tiempo concentrado', () => {
    const { focusedMs, next } = finish(start(initialState(S), 0), S, 10 * MIN)
    expect(focusedMs).toBe(10 * MIN)
    expect(next).toMatchObject({ mode: 'short', running: false, remainingMs: 5 * MIN })
  })

  it('formatea el reloj en mm:ss', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_500)).toBe('01:02')
  })
})
