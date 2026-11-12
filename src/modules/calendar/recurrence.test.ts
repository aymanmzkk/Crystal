import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Recurrence } from '../../db/types'
import { layoutDay } from './layout'
import { expandEvents } from './recurrence'

let nextId = 0
function ev(date: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `e${nextId++}`,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: 0,
    dirty: 0,
    title: 'Evento',
    categoryId: 'cat-clase',
    date,
    endDate: null,
    time: null,
    durationMin: 60,
    color: null,
    important: false,
    countdown: false,
    reminders: [],
    notes: '',
    recurrence: null,
    exdates: [],
    doneDates: [],
    ...extra,
  }
}

const rule = (r: Partial<Recurrence> & Pick<Recurrence, 'freq'>): Recurrence => ({ interval: 1, weekdays: [], until: null, ...r })
const starts = (events: CalendarEvent[], from: string, to: string) => expandEvents(events, from, to).map((o) => o.start)

describe('repeticiones', () => {
  it('un evento sin repetición solo aparece en su día', () => {
    expect(starts([ev('2026-11-11')], '2026-11-01', '2026-11-30')).toEqual(['2026-11-11'])
    expect(starts([ev('2026-11-11')], '2026-12-01', '2026-12-31')).toEqual([])
  })

  it('un evento de varios días aparece si el rango toca cualquiera de sus días', () => {
    const trip = ev('2026-11-28', { endDate: '2026-12-02' })
    expect(expandEvents([trip], '2026-12-01', '2026-12-07')).toMatchObject([{ start: '2026-11-28', end: '2026-12-02' }])
  })

  it('semanal en lunes, miércoles y viernes', () => {
    const gym = ev('2026-11-02', { recurrence: rule({ freq: 'weekly', weekdays: [1, 3, 5] }) })
    expect(starts([gym], '2026-11-09', '2026-11-15')).toEqual(['2026-11-09', '2026-11-11', '2026-11-13'])
  })

  it('semanal cada 2 semanas, empezando en la semana correcta aunque el rango sea lejano', () => {
    const e = ev('2026-01-05', { recurrence: rule({ freq: 'weekly', interval: 2, weekdays: [1] }) })
    expect(starts([e], '2026-11-01', '2026-11-30')).toEqual(['2026-11-09', '2026-11-23'])
  })

  it('respeta la fecha de fin y los días quitados', () => {
    const e = ev('2026-11-02', {
      recurrence: rule({ freq: 'daily', until: '2026-11-06' }),
      exdates: ['2026-11-04'],
    })
    expect(starts([e], '2026-11-01', '2026-11-30')).toEqual(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'])
  })

  it('diario cada 3 días salta bien a un rango posterior', () => {
    const e = ev('2026-11-01', { recurrence: rule({ freq: 'daily', interval: 3 }) })
    expect(starts([e], '2026-11-10', '2026-11-17')).toEqual(['2026-11-10', '2026-11-13', '2026-11-16'])
  })

  it('mensual el día 31 se salta los meses que no lo tienen', () => {
    const e = ev('2026-01-31', { recurrence: rule({ freq: 'monthly' }) })
    expect(starts([e], '2026-01-01', '2026-05-31')).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])
  })

  it('anual, como un cumpleaños', () => {
    const e = ev('2000-11-17', { recurrence: rule({ freq: 'yearly' }) })
    expect(starts([e], '2026-01-01', '2027-12-31')).toEqual(['2026-11-17', '2027-11-17'])
  })

  it('ordena primero los de todo el día y luego por hora', () => {
    const list = [ev('2026-11-05', { time: '19:00', title: 'B' }), ev('2026-11-05', { title: 'A' }), ev('2026-11-05', { time: '09:00', title: 'C' })]
    expect(expandEvents(list, '2026-11-05', '2026-11-05').map((o) => o.event.title)).toEqual(['A', 'C', 'B'])
  })
})

describe('colocación en la vista semana', () => {
  it('pone en columnas distintas los eventos que se solapan', () => {
    const occs = expandEvents(
      [
        ev('2026-11-05', { time: '09:00', durationMin: 120, title: 'Largo' }),
        ev('2026-11-05', { time: '10:00', durationMin: 60, title: 'Solapado' }),
        ev('2026-11-05', { time: '12:00', durationMin: 60, title: 'Solo' }),
      ],
      '2026-11-05',
      '2026-11-05',
    )
    const placed = Object.fromEntries(layoutDay(occs).map((p) => [p.occ.event.title, [p.col, p.cols]]))
    expect(placed).toEqual({ Largo: [0, 2], Solapado: [1, 2], Solo: [0, 1] })
  })
})
