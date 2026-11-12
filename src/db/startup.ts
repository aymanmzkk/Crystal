import { db } from './db'
import { moveMemoryPhotos } from './migrations'
import { purgeExpired, updateRecord } from './repo'
import { isImage } from '../lib/files'
import { resizeImage } from '../lib/images'

// Tareas de la base de datos al abrir la app
export async function initDatabase() {
  // Pide al navegador que no borre los datos aunque le falte espacio
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Algunos navegadores no lo permiten; los datos se guardan igual
  }
  // Recuerdos con fotos en el formato antiguo (por ejemplo, al restaurar una copia de seguridad antigua)
  await db.transaction('rw', db.memories, db.attachments, () => moveMemoryPhotos(db.memories, db.attachments))
  await purgeExpired()
  void createMissingThumbs()
}

// Miniaturas que faltan (fotos que venían de los recuerdos antiguos). Hacen las galerías más ligeras
// y se conservan si la foto se archiva fuera de Crystal.
async function createMissingThumbs() {
  if (typeof createImageBitmap !== 'function') return
  const pending = await db.attachments.filter((a) => a.deletedAt === 0 && a.thumb === null && a.blob !== null && isImage(a.type)).toArray()
  for (const a of pending) {
    try {
      const thumb = await resizeImage(a.blob!, 420, 0.75)
      await updateRecord('attachments', a.id, { thumb: thumb.blob })
    } catch {
      // Si una imagen no se puede leer, se deja sin miniatura
    }
  }
}
