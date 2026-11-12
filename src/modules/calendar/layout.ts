import { timeToMin } from '../../lib/dates'
import type { Occurrence } from './recurrence'

export interface PositionedOccurrence {
  occ: Occurrence
  startMin: number
  endMin: number
  // Columna dentro del grupo de eventos que se solapan, y cuántas columnas tiene el grupo
  col: number
  cols: number
}

// Duración mínima en pantalla, para que un evento corto se pueda leer y pulsar
const MIN_VISIBLE = 20

// Coloca los eventos con hora de un día en columnas para que los que se solapan no se tapen
export function layoutDay(occs: Occurrence[]): PositionedOccurrence[] {
  const items = occs
    .filter((o) => o.event.time !== null && o.start === o.end)
    .map((occ) => {
      const startMin = timeToMin(occ.event.time!)
      return { occ, startMin, endMin: Math.min(24 * 60, startMin + Math.max(MIN_VISIBLE, occ.event.durationMin)), col: 0, cols: 1 }
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const result: PositionedOccurrence[] = []
  let group: PositionedOccurrence[] = []
  let columnEnds: number[] = []
  let groupEnd = -1

  const closeGroup = () => {
    for (const item of group) item.cols = columnEnds.length
    result.push(...group)
    group = []
    columnEnds = []
  }

  for (const item of items) {
    if (item.startMin >= groupEnd) closeGroup()
    let col = columnEnds.findIndex((end) => end <= item.startMin)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(item.endMin)
    } else {
      columnEnds[col] = item.endMin
    }
    item.col = col
    group.push(item)
    groupEnd = Math.max(groupEnd, item.endMin)
  }
  closeGroup()
  return result
}
