import { db } from '../db/db'
import { createRecord, moveToTrash } from '../db/repo'
import type { DateKey, TableName } from '../db/types'
import { resizeImage } from './images'

// Tamaño máximo de un archivo que no es imagen (las imágenes se reducen y no tienen límite)
export const MAX_FILE_BYTES = 25 * 1024 * 1024

export const isImage = (type: string) => type.startsWith('image/')
export const isPdf = (type: string) => type === 'application/pdf'

export interface FileOwner {
  table: TableName
  id: string
}

// Guarda archivos subidos como adjuntos de un registro. Las fotos se reducen y llevan miniatura.
// Devuelve cuántos no se han podido guardar (demasiado grandes o ilegibles).
export async function addAttachments(owner: FileOwner, slot: string, files: Iterable<File>, date: DateKey | null = null): Promise<number> {
  let failed = 0
  for (const file of files) {
    try {
      if (isImage(file.type)) {
        const full = await resizeImage(file)
        const thumb = await resizeImage(full.blob, 420, 0.75)
        await createRecord('attachments', {
          ownerTable: owner.table, ownerId: owner.id, slot, name: file.name, type: 'image/jpeg', size: full.blob.size,
          blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height, date, comment: '', archive: null,
        })
      } else {
        if (file.size > MAX_FILE_BYTES) {
          failed++
          continue
        }
        await createRecord('attachments', {
          ownerTable: owner.table, ownerId: owner.id, slot, name: file.name, type: file.type || 'application/octet-stream', size: file.size,
          blob: file, thumb: null, width: 0, height: 0, date, comment: '', archive: null,
        })
      }
    } catch {
      failed++
    }
  }
  return failed
}

// 1,2 MB / 340 KB
export function formatBytes(bytes: number, language: string): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: i ? 1 : 0 }).format(value)} ${units[i]}`
}

// Manda a la papelera los adjuntos de un apartado (al quitar una reserva de un viaje, por ejemplo)
export async function trashSlot(ownerId: string, slot: string): Promise<void> {
  const ids = await db.attachments.where('ownerId').equals(ownerId).filter((a) => a.slot === slot && a.deletedAt === 0).primaryKeys()
  for (const id of ids) await moveToTrash('attachments', id)
}
