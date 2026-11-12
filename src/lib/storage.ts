import type { ArchiveRef, Attachment, DateKey, TableName } from '../db/types'

// Cálculos del gestor de almacenamiento. Todo es código normal (sin IA ni servicios externos).

export const MB = 1024 * 1024
export const GB = 1024 * MB
export const LIMIT_PRESETS = [500 * MB, GB, 2 * GB, 5 * GB]
export const DEFAULT_LIMIT = GB

export type FileCategory = 'photos' | 'videos' | 'documents' | 'other'
export const CATEGORIES: FileCategory[] = ['photos', 'videos', 'documents', 'other']

const DOC_TYPES = ['application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats', 'application/vnd.ms-', 'application/vnd.oasis']

export function categoryOf(type: string): FileCategory {
  if (type.startsWith('image/')) return 'photos'
  if (type.startsWith('video/')) return 'videos'
  if (DOC_TYPES.some((d) => type.startsWith(d))) return 'documents'
  return 'other'
}

// App a la que pertenece cada tabla (para el filtro y para las traducciones apps.<id>)
const MODULE_OF: Partial<Record<TableName, string>> = {
  trips: 'travel',
  memories: 'memories',
  documents: 'documents',
  inventory: 'inventory',
  transactions: 'finance',
  notes: 'notes',
}
export const moduleOf = (table: TableName) => MODULE_OF[table] ?? 'other'

// Datos de un archivo para el panel (sin cargar su contenido)
export interface FileInfo {
  id: string
  ownerTable: TableName
  ownerId: string
  slot: string
  name: string
  type: string
  category: FileCategory
  module: string
  // Tamaño original del archivo
  size: number
  // Lo que ocupa ahora en este dispositivo (archivo + miniatura). 0 + miniatura si está liberado.
  localBytes: number
  // true = el archivo sigue en Crystal; false = solo existe la copia archivada
  local: boolean
  archive: ArchiveRef | null
  date: DateKey | null
  createdAt: number
  comment: string
  inTrash: boolean
  // Imagen pequeña para las listas (miniatura, o la foto si no tiene); null en PDFs y otros
  preview: Blob | null
}

export function toFileInfo(a: Attachment): FileInfo {
  return {
    id: a.id,
    ownerTable: a.ownerTable,
    ownerId: a.ownerId,
    slot: a.slot,
    name: a.name,
    type: a.type,
    category: categoryOf(a.type),
    module: moduleOf(a.ownerTable),
    size: a.size,
    localBytes: (a.blob?.size ?? 0) + (a.thumb?.size ?? 0),
    local: a.blob !== null,
    archive: a.archive ?? null,
    date: a.date,
    createdAt: a.createdAt,
    comment: a.comment,
    inTrash: a.deletedAt !== 0,
    preview: a.thumb ?? (a.type.startsWith('image/') ? a.blob : null),
  }
}

export interface StorageSummary {
  // Bytes de archivos en este dispositivo y cuántos son
  localBytes: number
  localCount: number
  byCategory: Record<FileCategory, { bytes: number; count: number }>
  byModule: { module: string; bytes: number; count: number }[]
  // Archivados: con copia externa verificada / pendientes de verificar / ya liberados (solo fuera)
  archivedVerified: number
  archivedPending: number
  released: number
  releasedBytes: number
  // Se podría liberar ya (copia verificada y el archivo todavía en Crystal)
  releasableBytes: number
}

export function summarize(files: FileInfo[]): StorageSummary {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, { bytes: 0, count: 0 }])) as StorageSummary['byCategory']
  const modules = new Map<string, { bytes: number; count: number }>()
  const s: StorageSummary = { localBytes: 0, localCount: 0, byCategory, byModule: [], archivedVerified: 0, archivedPending: 0, released: 0, releasedBytes: 0, releasableBytes: 0 }
  for (const f of files) {
    s.localBytes += f.localBytes
    if (f.local) {
      s.localCount++
      byCategory[f.category].bytes += f.localBytes
      byCategory[f.category].count++
      const m = modules.get(f.module) ?? { bytes: 0, count: 0 }
      m.bytes += f.localBytes
      m.count++
      modules.set(f.module, m)
    } else {
      s.released++
      s.releasedBytes += f.size
    }
    if (f.archive?.verifiedAt) s.archivedVerified++
    else if (f.archive) s.archivedPending++
    if (f.local && f.archive?.verifiedAt) s.releasableBytes += f.size
  }
  s.byModule = [...modules].map(([module, v]) => ({ module, ...v })).sort((a, b) => b.bytes - a.bytes)
  return s
}

// ───────────── Límite y avisos ─────────────

export const ALERT_LEVELS = [70, 85, 95] as const
export type AlertLevel = 0 | (typeof ALERT_LEVELS)[number]

// Nivel de aviso según el uso: 0 (todo bien), 70 (informativo), 85 (advertencia), 95 (importante)
export function alertLevel(used: number, limit: number): AlertLevel {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  return ([...ALERT_LEVELS].reverse().find((l) => pct >= l) ?? 0) as AlertLevel
}

// ¿Hay que avisar? Solo cuando se sube a un nivel más alto que el último avisado (así no se repite).
// Al bajar (por ejemplo, tras archivar), el último nivel baja también, con un margen del 5 % para no avisar en bucle.
export function nextAlert(used: number, limit: number, lastNotified: AlertLevel): { notify: AlertLevel | null; last: AlertLevel } {
  const level = alertLevel(used, limit)
  if (level > lastNotified) return { notify: level, last: level }
  const pct = limit > 0 ? (used / limit) * 100 : 0
  const lowered = ([...ALERT_LEVELS].reverse().find((l) => l <= lastNotified && pct >= l - 5) ?? 0) as AlertLevel
  return { notify: null, last: Math.min(lastNotified, lowered) as AlertLevel }
}

// ───────────── Evolución ─────────────

export interface StorageSnapshot {
  date: DateKey
  bytes: number
  files: number
}

// Guarda (o actualiza) la medida del día. Se conservan los últimos 180 días.
export function addSnapshot(history: StorageSnapshot[], snap: StorageSnapshot): StorageSnapshot[] {
  const rest = history.filter((h) => h.date !== snap.date)
  return [...rest, snap].sort((a, b) => a.date.localeCompare(b.date)).slice(-180)
}

// ───────────── Recomendaciones (reglas normales, sin IA) ─────────────

export type TipRule = 'large' | 'old' | 'pastTrips' | 'notOpened' | 'trash'

export interface Tip {
  rule: TipRule
  ids: string[]
  bytes: number
}

export interface TipContext {
  now: number
  // Fin de cada viaje: id del viaje -> fecha de vuelta
  tripEnds: Map<string, DateKey>
  // Última vez que se abrió cada archivo en este dispositivo (ms)
  openedAt: Record<string, number>
}

const DAY = 24 * 60 * 60 * 1000
export const TIP_LIMITS = { largeBytes: 5 * MB, oldDays: 365, tripEndedDays: 30, notOpenedDays: 180 }

// Qué merece la pena archivar. Solo propone: nunca archiva ni borra nada por su cuenta.
export function recommend(files: FileInfo[], ctx: TipContext): Tip[] {
  const candidates = files.filter((f) => f.local && !f.archive && !f.inTrash)
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const fileDay = (f: FileInfo) => f.date ?? day(f.createdAt)
  const rules: Record<TipRule, FileInfo[]> = {
    large: candidates.filter((f) => f.size >= TIP_LIMITS.largeBytes),
    old: candidates.filter((f) => fileDay(f) < day(ctx.now - TIP_LIMITS.oldDays * DAY)),
    pastTrips: candidates.filter((f) => f.ownerTable === 'trips' && (ctx.tripEnds.get(f.ownerId) ?? '9999') < day(ctx.now - TIP_LIMITS.tripEndedDays * DAY)),
    notOpened: candidates.filter((f) => (ctx.openedAt[f.id] ?? f.createdAt) < ctx.now - TIP_LIMITS.notOpenedDays * DAY),
    trash: files.filter((f) => f.local && f.inTrash),
  }
  return (Object.entries(rules) as [TipRule, FileInfo[]][])
    .filter(([, list]) => list.length > 0)
    .map(([rule, list]) => ({ rule, ids: list.map((f) => f.id), bytes: list.reduce((s, f) => s + f.localBytes, 0) }))
    .sort((a, b) => b.bytes - a.bytes)
}

// ───────────── Cuándo se abrió cada archivo (solo en este dispositivo) ─────────────

const OPENED_KEY = 'vida-file-opened'

export function readOpened(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(OPENED_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function markOpened(id: string, now = Date.now()) {
  try {
    const all = readOpened()
    all[id] = now
    // Como mucho 3000 archivos: se quedan los abiertos más recientemente
    const entries = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 3000)
    localStorage.setItem(OPENED_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Sin localStorage (modo privado): no pasa nada, solo se pierde esta pista
  }
}
