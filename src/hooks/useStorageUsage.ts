import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { summarize, toFileInfo, type FileInfo, type StorageSummary } from '../lib/storage'

export interface StorageUsage {
  files: FileInfo[]
  summary: StorageSummary
  // Lo que dice el navegador: todo lo que ocupa Crystal (datos, archivos y la propia app) y el máximo permitido
  estimate: { usage: number; quota: number } | null
  // Lo que se compara con el límite: el total del navegador si se sabe; si no, los archivos
  used: number
}

// Mide el espacio de Crystal. Se actualiza solo cuando cambian los archivos.
export function useStorageUsage(): StorageUsage | undefined {
  const files = useLiveQuery(async () => (await db.attachments.toArray()).map(toFileInfo))
  const [estimate, setEstimate] = useState<StorageUsage['estimate']>(null)

  useEffect(() => {
    if (!files || !navigator.storage?.estimate) return
    let alive = true
    void navigator.storage.estimate().then((e) => alive && setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
    return () => {
      alive = false
    }
  }, [files])

  return useMemo(() => {
    if (!files) return undefined
    const summary = summarize(files)
    return { files, summary, estimate, used: Math.max(estimate?.usage ?? 0, summary.localBytes) }
  }, [files, estimate])
}
