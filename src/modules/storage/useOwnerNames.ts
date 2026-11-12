import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { TableName } from '../../db/types'
import type { FileInfo } from '../../lib/storage'

// Nombre del registro al que pertenece cada archivo ("Viaje a Lisboa", "Pasaporte"...): ownerId -> nombre
export function useOwnerNames(files: FileInfo[]): Map<string, string> {
  const key = [...new Set(files.map((f) => `${f.ownerTable}:${f.ownerId}`))].sort().join('|')
  return (
    useLiveQuery(async () => {
      const byTable = new Map<TableName, Set<string>>()
      for (const f of files) byTable.set(f.ownerTable, (byTable.get(f.ownerTable) ?? new Set()).add(f.ownerId))
      const names = new Map<string, string>()
      for (const [table, ids] of byTable) {
        if (!db.tables.some((t) => t.name === table)) continue
        const rows = await db.table<Record<string, unknown>, string>(table).bulkGet([...ids])
        rows.forEach((row) => {
          if (!row) return
          const label = row.name ?? row.title ?? row.date
          if (typeof label === 'string' && label) names.set(String(row.id), label)
        })
      }
      return names
    }, [key]) ?? new Map()
  )
}
