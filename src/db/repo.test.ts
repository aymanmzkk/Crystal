import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import {
  countTrash,
  createRecord,
  daysUntilPurge,
  deleteForever,
  emptyTrash,
  listTrash,
  moveToTrash,
  purgeExpired,
  restoreFromTrash,
  updateRecord,
} from './repo'
import type { CalendarEvent, NewRecord } from './types'

const DAY = 24 * 60 * 60 * 1000
const START = new Date(2026, 10, 5, 12, 0).getTime()

function newEvent(title: string): NewRecord<CalendarEvent> {
  return {
    title,
    categoryId: 'cat-clase',
    date: '2026-11-11',
    endDate: null,
    time: '09:00',
    durationMin: 60,
    color: null,
    important: false,
    countdown: false,
    reminders: [],
    notes: '',
    recurrence: null,
    exdates: [],
    doneDates: [],
  }
}

beforeEach(async () => {
  // Solo se simula el reloj; IndexedDB sigue usando los temporizadores reales
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(START)
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('base de datos', () => {
  it('crea los calendarios por defecto con ids fijos', async () => {
    const categories = await db.categories.orderBy('order').toArray()
    expect(categories).toHaveLength(8)
    expect(categories[0]).toMatchObject({ id: 'cat-clase', name: 'Clase', color: 'blue', deletedAt: 0 })
  })

  it('createRecord rellena los campos comunes', async () => {
    const id = await createRecord('events', newEvent('Examen'))
    const event = await db.events.get(id)
    expect(event).toMatchObject({ title: 'Examen', createdAt: START, updatedAt: START, deletedAt: 0, dirty: 1 })
  })

  it('updateRecord guarda la fecha del cambio y lo marca para sincronizar', async () => {
    const id = await createRecord('events', newEvent('Examen'))
    await db.events.update(id, { dirty: 0 })
    vi.setSystemTime(START + 1000)
    await updateRecord('events', id, { title: 'Examen final' })
    expect(await db.events.get(id)).toMatchObject({ title: 'Examen final', createdAt: START, updatedAt: START + 1000, dirty: 1 })
  })
})

describe('papelera', () => {
  it('mueve a la papelera y restaura', async () => {
    const id = await createRecord('events', newEvent('Dentista'))
    await moveToTrash('events', id)
    expect(await listTrash()).toEqual([{ table: 'events', id, label: 'Dentista', deletedAt: START }])
    expect(await countTrash()).toBe(1)

    await restoreFromTrash('events', id)
    expect(await countTrash()).toBe(0)
    expect((await db.events.get(id))?.deletedAt).toBe(0)
  })

  it('ordena la papelera de lo más reciente a lo más antiguo, con tareas y calendarios', async () => {
    const event = await createRecord('events', newEvent('Antiguo'))
    await moveToTrash('events', event)
    vi.setSystemTime(START + DAY)
    await moveToTrash('categories', 'cat-gimnasio')
    expect((await listTrash()).map((i) => i.label)).toEqual(['Gimnasio', 'Antiguo'])
  })

  it('borrar para siempre elimina el registro y deja una lápida para sincronizar', async () => {
    const id = await createRecord('events', newEvent('Cena'))
    await moveToTrash('events', id)
    await deleteForever('events', id)
    expect(await db.events.get(id)).toBeUndefined()
    expect(await db.tombstones.get(id)).toEqual({ id, table: 'events', deletedAt: START })
  })

  it('vaciar la papelera no toca lo que no está borrado', async () => {
    const keep = await createRecord('events', newEvent('Se queda'))
    await moveToTrash('events', await createRecord('events', newEvent('Fuera 1')))
    await moveToTrash('categories', 'cat-viajes')
    await emptyTrash()
    expect(await countTrash()).toBe(0)
    expect(await db.events.get(keep)).toBeDefined()
    expect(await db.tombstones.count()).toBe(2)
  })

  it('borra solo lo que lleva más de 30 días en la papelera', async () => {
    const old = await createRecord('events', newEvent('Viejo'))
    const recent = await createRecord('events', newEvent('Reciente'))
    await moveToTrash('events', old)
    vi.setSystemTime(START + 26 * DAY)
    await moveToTrash('events', recent)

    vi.setSystemTime(START + 31 * DAY)
    expect(await purgeExpired()).toBe(1)
    expect(await db.events.get(old)).toBeUndefined()
    expect(await db.events.get(recent)).toBeDefined()
  })

  it('calcula los días que faltan para el borrado automático', () => {
    expect(daysUntilPurge(START, START)).toBe(30)
    expect(daysUntilPurge(START, START + 29.5 * DAY)).toBe(1)
    expect(daysUntilPurge(START, START + 40 * DAY)).toBe(0)
  })
})

describe('adjuntos', () => {
  it('se borran para siempre junto con su registro', async () => {
    const id = await createRecord('events', newEvent('Con billete'))
    await createRecord('attachments', {
      ownerTable: 'events', ownerId: id, slot: '', name: 'billete.pdf', type: 'application/pdf', size: 3,
      blob: new Blob(['pdf']), thumb: null, width: 0, height: 0, date: null, comment: '', archive: null,
    })
    expect(await db.attachments.count()).toBe(1)
    await deleteForever('events', id)
    expect(await db.attachments.count()).toBe(0)
    expect(await db.tombstones.count()).toBe(2)
  })
})
