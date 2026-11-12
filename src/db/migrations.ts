import type { Attachment, Memory, Photo } from './types'

// Migraciones de datos que se pueden ejecutar varias veces sin estropear nada.

// Las fotos de un recuerdo en el formato antiguo, como adjuntos (mismo id que la foto, en el apartado 'photos')
export function memoryPhotosToAttachments(memory: Pick<Memory, 'id' | 'title' | 'date' | 'createdAt' | 'photos'>, now: number): Attachment[] {
  return (memory.photos ?? []).map((photo: Photo, i) => ({
    id: photo.id,
    // createdAt ordena las fotos: se respeta el orden que tenían
    createdAt: memory.createdAt + i,
    updatedAt: now,
    deletedAt: 0,
    dirty: 1,
    ownerTable: 'memories',
    ownerId: memory.id,
    slot: 'photos',
    name: `${memory.title || 'foto'} ${i + 1}.jpg`,
    type: photo.blob?.type || 'image/jpeg',
    size: photo.blob?.size ?? 0,
    blob: photo.blob ?? null,
    thumb: null,
    width: photo.width,
    height: photo.height,
    date: photo.date ?? memory.date,
    comment: photo.comment ?? '',
    archive: null,
  }))
}

// Saca las fotos de dentro de los recuerdos y las guarda como adjuntos. Devuelve cuántas fotos ha movido.
// Se usa en la actualización de la base de datos (versión 15) y al arrancar (por si se restaura una copia antigua).
// Lo mínimo que hace falta de cada tabla (vale tanto para la tabla normal como para la de una actualización de Dexie)
interface MemoryTable {
  filter(fn: (m: Memory) => boolean): { toArray(): Promise<Memory[]> }
  update(id: string, changes: { photos: Photo[]; updatedAt: number; dirty: 1 }): Promise<number>
}
interface AttachmentTable {
  bulkPut(rows: Attachment[]): Promise<unknown>
}

export async function moveMemoryPhotos(memories: MemoryTable, attachments: AttachmentTable, now = Date.now()): Promise<number> {
  const pending = await memories.filter((m) => Array.isArray(m.photos) && m.photos.length > 0).toArray()
  let moved = 0
  for (const memory of pending) {
    const rows = memoryPhotosToAttachments(memory, now)
    // put: si ya existían (migración repetida), se sobrescriben con lo mismo
    await attachments.bulkPut(rows)
    await memories.update(memory.id, { photos: [], updatedAt: now, dirty: 1 })
    moved += rows.length
  }
  return moved
}
