import { db as currentDb, type VidaDB } from '../db/db'

// Copia de seguridad: todas las tablas en un archivo JSON. Las fotos y archivos (Blob) van dentro como texto base64.

const FORMAT = 'crystal-backup'
const VERSION = 1
// Ajustes de este dispositivo (localStorage) que también se guardan
const LOCAL_KEYS = ['vida-settings', 'vida-calendar', 'vida-dashboard', 'vida-pomodoro', 'vida-tasks']
const storage = typeof localStorage === 'undefined' ? null : localStorage
// Tablas que solo tienen sentido en este dispositivo (carpetas elegidas para archivar): ni se copian ni se borran al restaurar
const LOCAL_ONLY_TABLES = new Set(['archiveTargets'])
const backupTables = (db: VidaDB) => db.tables.filter((t) => !LOCAL_ONLY_TABLES.has(t.name))

interface BackupFile {
  format: typeof FORMAT
  version: number
  createdAt: number
  tables: Record<string, unknown[]>
  local: Record<string, string>
}

const BLOB_TAG = '__blob'

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Por trozos para no pasarse del límite de argumentos con archivos grandes
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

// Recorre un valor y cambia cada Blob por { __blob: "data:..." } (y al revés al restaurar)
async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return { [BLOB_TAG]: await blobToDataUrl(value) }
  if (Array.isArray(value)) return Promise.all(value.map(encode))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = await encode(v)
    return out
  }
  return value
}

async function decode(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(decode))
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj[BLOB_TAG] === 'string' && Object.keys(obj).length === 1) return dataUrlToBlob(obj[BLOB_TAG] as string)
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = await decode(v)
    return out
  }
  return value
}

export async function createBackup(db: VidaDB = currentDb): Promise<Blob> {
  const tables: Record<string, unknown[]> = {}
  // Los archivos archivados y liberados (blob = null) van solo con su referencia: la copia está fuera de Crystal
  for (const table of backupTables(db)) tables[table.name] = (await encode(await table.toArray())) as unknown[]
  const local: Record<string, string> = {}
  for (const key of LOCAL_KEYS) {
    const v = storage?.getItem(key) ?? null
    if (v !== null) local[key] = v
  }
  const file: BackupFile = { format: FORMAT, version: VERSION, createdAt: Date.now(), tables, local }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

// Nombre del archivo: crystal-copia-2026-11-06.json
export function backupFileName(date = new Date()): string {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `crystal-copia-${d}.json`
}

// Cambia TODOS los datos por los de la copia. Lanza un error si el archivo no es una copia válida.
export async function restoreBackup(file: Blob, db: VidaDB = currentDb): Promise<number> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
  if (parsed.format !== FORMAT || typeof parsed.tables !== 'object' || !parsed.tables) throw new Error('invalid')
  const known = new Set(backupTables(db).map((t) => t.name))
  const decoded: Record<string, unknown[]> = {}
  for (const [name, rows] of Object.entries(parsed.tables)) if (known.has(name) && Array.isArray(rows)) decoded[name] = (await decode(rows)) as unknown[]
  let count = 0
  await db.transaction('rw', backupTables(db), async () => {
    for (const table of backupTables(db)) {
      await table.clear()
      const rows = decoded[table.name]
      if (rows?.length) {
        await table.bulkAdd(rows)
        count += rows.length
      }
    }
  })
  for (const [key, value] of Object.entries(parsed.local ?? {})) if (LOCAL_KEYS.includes(key)) storage?.setItem(key, value)
  return count
}

// Borra todo: la base de datos y los ajustes de las apps (menos el tema y el idioma). Al recargar se crean los calendarios por defecto.
export async function deleteAllData(): Promise<void> {
  await currentDb.delete()
  for (const key of LOCAL_KEYS) if (key !== 'vida-settings') storage?.removeItem(key)
  storage?.removeItem('vida-reminders-last')
  storage?.removeItem('vida-reminders-fired')
}
