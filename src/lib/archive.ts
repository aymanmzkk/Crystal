import { db } from '../db/db'
import { updateRecord } from '../db/repo'
import type { ArchiveRef, ArchiveTarget, Attachment } from '../db/types'
import { isImage } from './files'
import { resizeImage } from './images'

// ───────────────────────── Archivado de archivos ─────────────────────────
// Regla de oro: un archivo SOLO se puede quitar de Crystal si tiene una copia externa VERIFICADA
// (misma huella SHA-256 y mismo tamaño, comprobados leyendo la copia). Si algo falla, el original se queda.

// Carpeta raíz que crea Crystal dentro de la carpeta elegida, e índice con todo lo archivado
export const ARCHIVE_ROOT = 'Crystal'
export const MANIFEST_NAME = 'crystal-archivo.json'

// Huella SHA-256 en hexadecimal
export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ¿Este navegador deja elegir una carpeta? (Chrome y Edge en ordenador; en Android depende de la versión)
export const canUseFolders = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

// Carpeta de cada app dentro del archivo
const MODULE_FOLDER: Partial<Record<string, string>> = {
  trips: 'Viajes',
  memories: 'Recuerdos',
  documents: 'Documentos',
  inventory: 'Inventario',
  transactions: 'Finanzas',
  notes: 'Notas',
}

const EXT_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/plain': 'txt' }

function extensionOf(a: Pick<Attachment, 'name' | 'type'>): string {
  const fromName = /\.([a-z0-9]{1,6})$/i.exec(a.name)?.[1]
  return (fromName ?? EXT_BY_TYPE[a.type] ?? a.type.split('/')[1] ?? 'bin').toLowerCase()
}

const safe = (text: string) =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\.[a-z0-9]{1,6}$/i, '')
    .trim()
    .slice(0, 60) || 'archivo'

// Nombre del archivo archivado: fecha, nombre y el principio del id (así nunca se repite)
export function archiveFileName(a: Pick<Attachment, 'id' | 'name' | 'type' | 'date' | 'createdAt'>): string {
  const day = a.date ?? new Date(a.createdAt).toISOString().slice(0, 10)
  return `${day}_${safe(a.name)}_${a.id.slice(0, 8)}.${extensionOf(a)}`
}

// Ruta dentro de la carpeta elegida: Crystal/Viajes/2026/2026-11-29_billete_ab12cd34.pdf
export function archivePath(a: Pick<Attachment, 'id' | 'name' | 'type' | 'date' | 'createdAt' | 'ownerTable'>): string {
  const day = a.date ?? new Date(a.createdAt).toISOString().slice(0, 10)
  return [ARCHIVE_ROOT, MODULE_FOLDER[a.ownerTable] ?? 'Otros', day.slice(0, 4), archiveFileName(a)].join('/')
}

// ───────────── Carpetas elegidas ─────────────

// Carpetas usadas en esta sesión (así no hace falta leerlas de la base de datos cada vez)
const targetCache = new Map<string, ArchiveTarget>()

const isDirectoryHandle = (h: unknown): h is FileSystemDirectoryHandle => !!h && typeof (h as FileSystemDirectoryHandle).getFileHandle === 'function'

export async function listTargets(): Promise<ArchiveTarget[]> {
  const stored = await db.archiveTargets.toArray()
  for (const t of stored) if (isDirectoryHandle(t.handle)) targetCache.set(t.id, t)
  return [...targetCache.values()]
}

export async function getTarget(id: string | null): Promise<ArchiveTarget | undefined> {
  if (!id) return undefined
  if (targetCache.has(id)) return targetCache.get(id)
  const stored = await db.archiveTargets.get(id)
  if (stored && isDirectoryHandle(stored.handle)) {
    targetCache.set(id, stored)
    return stored
  }
  return undefined
}

// Recuerda una carpeta para la próxima vez. Si ya estaba guardada (la misma carpeta), devuelve la que había.
export async function rememberTarget(handle: FileSystemDirectoryHandle): Promise<ArchiveTarget> {
  for (const t of await listTargets()) if (await t.handle.isSameEntry(handle)) return t
  const target: ArchiveTarget = { id: crypto.randomUUID(), name: handle.name, handle, createdAt: Date.now() }
  targetCache.set(target.id, target)
  try {
    await db.archiveTargets.put(target)
  } catch {
    // Si el navegador no deja guardarla, sirve igual para esta sesión
  }
  return target
}

// Abre el selector de carpetas del sistema (necesita un clic del usuario)
export async function pickFolder(): Promise<ArchiveTarget | null> {
  if (!canUseFolders()) return null
  try {
    const handle = await window.showDirectoryPicker!({ id: 'crystal-archivo', mode: 'readwrite', startIn: 'documents' })
    return rememberTarget(handle)
  } catch {
    // Cancelado
    return null
  }
}

export async function forgetTarget(id: string): Promise<void> {
  targetCache.delete(id)
  await db.archiveTargets.delete(id)
}

// Pide permiso para usar la carpeta (Chrome lo vuelve a pedir en cada sesión)
export async function ensurePermission(handle: FileSystemHandle, mode: 'read' | 'readwrite'): Promise<boolean> {
  if (!handle.queryPermission) return true
  if ((await handle.queryPermission({ mode })) === 'granted') return true
  try {
    return (await handle.requestPermission?.({ mode })) === 'granted'
  } catch {
    return false
  }
}

async function fileAt(dir: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  let current = dir
  for (const part of parts.slice(0, -1)) current = await current.getDirectoryHandle(part, { create })
  return current.getFileHandle(parts[parts.length - 1], { create })
}

async function removeAt(dir: FileSystemDirectoryHandle, path: string): Promise<void> {
  try {
    const parts = path.split('/')
    let current = dir
    for (const part of parts.slice(0, -1)) current = await current.getDirectoryHandle(part)
    await current.removeEntry(parts[parts.length - 1])
  } catch {
    // Si no se puede borrar la copia fallida, no pasa nada: el original sigue en Crystal
  }
}

// ───────────── Archivar ─────────────

export type ArchiveError = 'not-found' | 'no-local' | 'write-failed' | 'verify-failed' | 'permission'

export interface ArchiveResult {
  id: string
  ok: boolean
  error?: ArchiveError
  size: number
}

export interface ManifestEntry {
  id: string
  ownerTable: string
  ownerId: string
  slot: string
  name: string
  type: string
  size: number
  sha256: string
  path: string
  date: string | null
  comment: string
  archivedAt: number
}

interface Manifest {
  format: 'crystal-archive'
  version: 1
  updatedAt: number
  files: ManifestEntry[]
}

async function readManifest(dir: FileSystemDirectoryHandle): Promise<Manifest | null> {
  try {
    const file = await (await fileAt(dir, `${ARCHIVE_ROOT}/${MANIFEST_NAME}`, false)).getFile()
    const parsed = JSON.parse(await file.text()) as Manifest
    return parsed.format === 'crystal-archive' && Array.isArray(parsed.files) ? parsed : null
  } catch {
    return null
  }
}

// Índice en la carpeta con todo lo archivado: sirve para recuperar los archivos aunque se pierda Crystal
async function writeManifest(dir: FileSystemDirectoryHandle, entries: ManifestEntry[]): Promise<void> {
  const current = (await readManifest(dir))?.files ?? []
  const byId = new Map(current.map((e) => [e.id, e]))
  for (const e of entries) byId.set(e.id, e)
  const manifest: Manifest = { format: 'crystal-archive', version: 1, updatedAt: Date.now(), files: [...byId.values()] }
  const handle = await fileAt(dir, `${ARCHIVE_ROOT}/${MANIFEST_NAME}`, true)
  const writable = await handle.createWritable()
  await writable.write(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }))
  await writable.close()
}

// Copia archivos a una carpeta y comprueba cada copia leyéndola otra vez. NO quita nada de Crystal.
export async function archiveToFolder(target: ArchiveTarget, ids: string[], onProgress?: (done: number, total: number) => void): Promise<ArchiveResult[]> {
  targetCache.set(target.id, target)
  const results: ArchiveResult[] = []
  const manifest: ManifestEntry[] = []
  if (!(await ensurePermission(target.handle, 'readwrite'))) return ids.map((id) => ({ id, ok: false, error: 'permission', size: 0 }))

  for (const [i, id] of ids.entries()) {
    const a = await db.attachments.get(id)
    if (!a) {
      results.push({ id, ok: false, error: 'not-found', size: 0 })
    } else if (!a.blob) {
      results.push({ id, ok: false, error: 'no-local', size: a.size })
    } else {
      const path = archivePath(a)
      try {
        const hash = await sha256(a.blob)
        const handle = await fileAt(target.handle, path, true)
        const writable = await handle.createWritable()
        await writable.write(a.blob)
        await writable.close()
        // Verificación: se lee la copia recién escrita y se compara con el original
        const copy = await handle.getFile()
        if (copy.size !== a.blob.size || (await sha256(copy)) !== hash) {
          await removeAt(target.handle, path)
          results.push({ id, ok: false, error: 'verify-failed', size: a.size })
        } else {
          const now = Date.now()
          const ref: ArchiveRef = { kind: 'folder', targetId: target.id, targetName: target.name, path, sha256: hash, archivedAt: now, verifiedAt: now }
          await updateRecord('attachments', id, { archive: ref })
          manifest.push({ id, ownerTable: a.ownerTable, ownerId: a.ownerId, slot: a.slot, name: a.name, type: a.type, size: a.size, sha256: hash, path, date: a.date, comment: a.comment, archivedAt: now })
          results.push({ id, ok: true, size: a.size })
        }
      } catch {
        results.push({ id, ok: false, error: 'write-failed', size: a.size })
      }
    }
    onProgress?.(i + 1, ids.length)
  }

  if (manifest.length) {
    try {
      await writeManifest(target.handle, manifest)
    } catch {
      // El índice es una ayuda extra: si falla, los archivos ya están copiados y verificados
    }
  }
  return results
}

// Descarga los archivos (para móviles sin selector de carpetas). La copia queda SIN verificar:
// hay que volver a elegir los archivos descargados con verifyDownloads().
export async function archiveByDownload(ids: string[], download: (blob: Blob, name: string) => void, onProgress?: (done: number, total: number) => void): Promise<ArchiveResult[]> {
  const results: ArchiveResult[] = []
  for (const [i, id] of ids.entries()) {
    const a = await db.attachments.get(id)
    if (!a) results.push({ id, ok: false, error: 'not-found', size: 0 })
    else if (!a.blob) results.push({ id, ok: false, error: 'no-local', size: a.size })
    else {
      try {
        const hash = await sha256(a.blob)
        const name = archiveFileName(a)
        download(a.blob, name)
        const ref: ArchiveRef = { kind: 'download', targetId: null, targetName: '', path: name, sha256: hash, archivedAt: Date.now(), verifiedAt: null }
        await updateRecord('attachments', id, { archive: ref })
        results.push({ id, ok: true, size: a.size })
      } catch {
        results.push({ id, ok: false, error: 'write-failed', size: a.size })
      }
    }
    onProgress?.(i + 1, ids.length)
  }
  return results
}

// Comprueba archivos descargados que el usuario vuelve a elegir: se reconocen por su huella, aunque les haya cambiado el nombre.
// Devuelve los ids verificados y los archivos elegidos que no corresponden a ninguna copia pendiente.
export async function verifyDownloads(files: File[]): Promise<{ verified: string[]; unknown: string[] }> {
  const pending = (await db.attachments.toArray()).filter((a) => a.deletedAt === 0 && a.archive?.kind === 'download' && a.archive.verifiedAt === null)
  const byHash = new Map<string, Attachment[]>()
  for (const a of pending) byHash.set(a.archive!.sha256, [...(byHash.get(a.archive!.sha256) ?? []), a])
  const verified: string[] = []
  const unknown: string[] = []
  for (const file of files) {
    const matches = byHash.get(await sha256(file))?.filter((a) => a.size === file.size) ?? []
    if (!matches.length) {
      unknown.push(file.name)
      continue
    }
    for (const a of matches) {
      await updateRecord('attachments', a.id, { archive: { ...a.archive!, verifiedAt: Date.now() } })
      verified.push(a.id)
    }
  }
  return { verified, unknown }
}

// ───────────── Liberar espacio ─────────────

// ¿Se puede quitar de Crystal? Solo si tiene una copia externa verificada.
export const canRelease = (a: Pick<Attachment, 'blob' | 'archive'>) => !!a.blob && !!a.archive?.verifiedAt

// Quita de Crystal los archivos que tienen copia verificada. Antes vuelve a comprobar la huella del original:
// si no coincide con la copia, NO lo quita. Las fotos conservan su miniatura.
export async function releaseLocalCopies(ids: string[]): Promise<{ released: string[]; skipped: string[]; freed: number }> {
  const released: string[] = []
  const skipped: string[] = []
  let freed = 0
  for (const id of ids) {
    const a = await db.attachments.get(id)
    if (!a || !a.blob || !canRelease(a) || (await sha256(a.blob)) !== a.archive!.sha256) {
      skipped.push(id)
      continue
    }
    let thumb = a.thumb
    if (!thumb && isImage(a.type) && typeof createImageBitmap === 'function') {
      try {
        thumb = (await resizeImage(a.blob, 420, 0.75)).blob
      } catch {
        thumb = null
      }
    }
    await updateRecord('attachments', id, { blob: null, thumb })
    released.push(id)
    freed += a.blob.size
  }
  return { released, skipped, freed }
}

// ───────────── Recuperar ─────────────

export type RecoverResult = 'ok' | 'no-target' | 'permission' | 'missing' | 'mismatch' | 'not-found'

async function restoreBlob(a: Attachment, file: Blob): Promise<RecoverResult> {
  // Tiene que ser exactamente el mismo archivo: mismo tamaño y misma huella
  if (!a.archive || file.size !== a.size || (await sha256(file)) !== a.archive.sha256) return 'mismatch'
  // Se copia el contenido: así Crystal no depende del archivo externo
  const blob = new Blob([await file.arrayBuffer()], { type: a.type })
  await updateRecord('attachments', a.id, { blob })
  return 'ok'
}

// Trae de vuelta un archivo archivado desde su carpeta. La referencia al archivo nunca se pierde, aunque falle.
export async function recoverAttachment(id: string): Promise<RecoverResult> {
  const a = await db.attachments.get(id)
  if (!a) return 'not-found'
  if (a.blob) return 'ok'
  if (a.archive?.kind !== 'folder') return 'no-target'
  const target = await getTarget(a.archive.targetId)
  if (!target) return 'no-target'
  if (!(await ensurePermission(target.handle, 'read'))) return 'permission'
  try {
    const file = await (await fileAt(target.handle, a.archive.path, false)).getFile()
    return restoreBlob(a, file)
  } catch {
    // Disco desconectado, carpeta movida o archivo borrado
    return 'missing'
  }
}

// Recupera eligiendo el archivo a mano (descargas, otro dispositivo, carpeta movida...). Solo vale si la huella coincide.
export async function recoverFromFile(id: string, file: File): Promise<RecoverResult> {
  const a = await db.attachments.get(id)
  if (!a) return 'not-found'
  if (a.blob) return 'ok'
  return restoreBlob(a, file)
}

// Vuelve a enlazar una carpeta (por ejemplo, en otro dispositivo o tras restaurar una copia de seguridad):
// los archivos archivados que estén en ella pasan a apuntar a esta carpeta.
export async function relinkFolder(target: ArchiveTarget): Promise<number> {
  const manifest = await readManifest(target.handle)
  if (!manifest) return 0
  const byId = new Map(manifest.files.map((e) => [e.id, e]))
  let linked = 0
  for (const a of await db.attachments.toArray()) {
    const entry = byId.get(a.id)
    if (!entry || a.deletedAt !== 0 || entry.sha256 !== a.archive?.sha256) continue
    if (a.archive.kind === 'folder' && a.archive.targetId === target.id) continue
    await updateRecord('attachments', a.id, { archive: { ...a.archive, kind: 'folder', targetId: target.id, targetName: target.name, path: entry.path } })
    linked++
  }
  return linked
}
