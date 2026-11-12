import type { UpdateSpec } from 'dexie'
import { db } from './db'
import type { NewRecord, TableName, Tables, TrashableTable } from './types'

export const TRASH_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

// Orden en el que se buscan los elementos de la papelera
const TRASHABLE: TrashableTable[] = ['events', 'tasks', 'habits', 'routines', 'workShifts', 'assessments', 'cards', 'decks', 'subjects', 'workouts', 'gymRoutines', 'exercises', 'transactions', 'subscriptions', 'savingsGoals', 'wishlist', 'debts', 'contacts', 'shopping', 'chores', 'inventory', 'documents', 'measurements', 'medications', 'notes', 'goals', 'trips', 'memories', 'library', 'projects', 'courses', 'attachments', 'categories']

export interface TrashItem {
  table: TrashableTable
  id: string
  label: string
  deletedAt: number
}

// Texto con el que se ve un registro en la papelera
function labelOf(r: Tables[TrashableTable]): string {
  if ('title' in r) return r.title
  if ('name' in r) return r.name
  if ('front' in r) return r.front
  if ('weight' in r) return `${r.date} · ${r.weight ?? '—'} kg`
  return `${r.date} · ${r.start}${r.end ? `–${r.end}` : ''}`
}

function tableOf<K extends TableName>(name: K) {
  return db.table<Tables[K], string>(name)
}

// Todas las escrituras pasan por aquí para marcar el registro como cambiado
function patch<K extends TableName>(name: K, id: string, changes: Partial<Tables[K]>) {
  return tableOf(name).update(id, { ...changes, updatedAt: Date.now(), dirty: 1 } as UpdateSpec<Tables[K]>)
}

export async function createRecord<K extends TableName>(name: K, data: NewRecord<Tables[K]>): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  await tableOf(name).add({ ...data, id, createdAt: now, updatedAt: now, deletedAt: 0, dirty: 1 } as Tables[K])
  return id
}

export async function updateRecord<K extends TableName>(
  name: K,
  id: string,
  changes: Partial<NewRecord<Tables[K]>>,
): Promise<void> {
  await patch(name, id, changes as Partial<Tables[K]>)
}

// Crea el registro con ese id o, si ya existe, lo actualiza. Para registros diarios con id fijo (hábito + fecha).
export async function upsertRecord<K extends TableName>(name: K, id: string, data: NewRecord<Tables[K]>): Promise<void> {
  await db.transaction('rw', tableOf(name), async () => {
    if (await tableOf(name).get(id)) {
      await patch(name, id, { ...data, deletedAt: 0 } as Partial<Tables[K]>)
    } else {
      const now = Date.now()
      await tableOf(name).add({ ...data, id, createdAt: now, updatedAt: now, deletedAt: 0, dirty: 1 } as Tables[K])
    }
  })
}

export async function moveToTrash(name: TableName, id: string): Promise<void> {
  await patch(name, id, { deletedAt: Date.now() })
}

export async function restoreFromTrash(name: TableName, id: string): Promise<void> {
  await patch(name, id, { deletedAt: 0 })
}

// Borra el registro de verdad y deja una "lápida" para que la sincronización sepa que hay que borrarlo en la nube
// Sus archivos adjuntos se borran con él.
export async function deleteForever(name: TableName, id: string): Promise<void> {
  await db.transaction('rw', tableOf(name), db.attachments, db.tombstones, async () => {
    await tableOf(name).delete(id)
    await db.tombstones.put({ id, table: name, deletedAt: Date.now() })
    if (name === 'attachments') return
    const files = await db.attachments.where('ownerId').equals(id).primaryKeys()
    await db.attachments.bulkDelete(files)
    await db.tombstones.bulkPut(files.map((f) => ({ id: f, table: 'attachments' as const, deletedAt: Date.now() })))
  })
}

export async function listTrash(): Promise<TrashItem[]> {
  const groups = await Promise.all(
    TRASHABLE.map(async (name) => {
      const rows = await tableOf(name).where('deletedAt').above(0).toArray()
      return rows.map((r) => ({
        table: name,
        id: r.id,
        label: labelOf(r),
        deletedAt: r.deletedAt,
      }))
    }),
  )
  return groups.flat().sort((a, b) => b.deletedAt - a.deletedAt)
}

export async function countTrash(): Promise<number> {
  const counts = await Promise.all(TRASHABLE.map((name) => tableOf(name).where('deletedAt').above(0).count()))
  return counts.reduce((a, b) => a + b, 0)
}

export async function emptyTrash(): Promise<void> {
  const items = await listTrash()
  await db.transaction('rw', [...TRASHABLE.map(tableOf), db.attachments, db.tombstones], async () => {
    for (const item of items) await deleteForever(item.table, item.id)
  })
}

// Borra para siempre lo que lleva en la papelera más de TRASH_DAYS días. Devuelve cuántos ha borrado.
export async function purgeExpired(now = Date.now()): Promise<number> {
  const limit = now - TRASH_DAYS * DAY_MS
  let purged = 0
  for (const name of TRASHABLE) {
    const ids = await tableOf(name).where('deletedAt').between(1, limit, true, true).primaryKeys()
    for (const id of ids) await deleteForever(name, id)
    purged += ids.length
  }
  return purged
}

// Días que le quedan a un elemento antes de borrarse solo (0 = hoy)
export function daysUntilPurge(deletedAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY_MS - now) / DAY_MS))
}
