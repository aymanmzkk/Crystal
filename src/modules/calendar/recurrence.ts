import { addDays, addDaysKey, diffDays, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import type { CalendarEvent, DateKey } from '../../db/types'

// Una aparición concreta de un evento en el calendario
export interface Occurrence {
  event: CalendarEvent
  // Primer y último día de esta aparición (iguales si dura un solo día)
  start: DateKey
  end: DateKey
  // Identificador único de la aparición: id del evento + día
  key: string
}

// Límite de seguridad para no quedarse en un bucle infinito con datos raros
const MAX_STEPS = 20000

// Devuelve todas las apariciones de los eventos que tocan el rango [from, to], ordenadas
export function expandEvents(events: CalendarEvent[], from: DateKey, to: DateKey): Occurrence[] {
  const out: Occurrence[] = []
  for (const event of events) {
    const span = event.endDate ? Math.max(0, diffDays(event.date, event.endDate)) : 0
    // Un evento de varios días que empezó antes de "from" también se ve en el rango
    for (const start of occurrenceStarts(event, addDaysKey(from, -span), to)) {
      if (event.exdates.includes(start)) continue
      out.push({ event, start, end: addDaysKey(start, span), key: `${event.id}:${start}` })
    }
  }
  return out.sort(compareOccurrences)
}

// Agrupa las apariciones por día. Un evento de varios días aparece en cada uno de sus días dentro del rango.
export function groupByDay(occs: Occurrence[], from: DateKey, to: DateKey): Map<DateKey, Occurrence[]> {
  const map = new Map<DateKey, Occurrence[]>()
  for (const occ of occs) {
    let day = occ.start < from ? from : occ.start
    const last = occ.end > to ? to : occ.end
    while (day <= last) {
      const list = map.get(day)
      if (list) list.push(occ)
      else map.set(day, [occ])
      day = addDaysKey(day, 1)
    }
  }
  return map
}

export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1
  // Los de todo el día van primero, luego por hora
  const ta = a.event.time ?? ''
  const tb = b.event.time ?? ''
  if (ta !== tb) return ta < tb ? -1 : 1
  return a.event.title.localeCompare(b.event.title)
}

function* occurrenceStarts(event: CalendarEvent, from: DateKey, to: DateKey): Generator<DateKey> {
  const rule = event.recurrence
  if (!rule) {
    if (event.date >= from && event.date <= to) yield event.date
    return
  }
  const last = rule.until && rule.until < to ? rule.until : to
  const interval = Math.max(1, rule.interval)
  const first = parseKey(event.date)

  if (rule.freq === 'daily') {
    // Salta directamente a la primera aparición dentro del rango
    const skip = from > event.date ? Math.ceil(diffDays(event.date, from) / interval) * interval : 0
    let d = addDays(first, skip)
    for (let i = 0; i < MAX_STEPS && toDateKey(d) <= last; i++, d = addDays(d, interval)) yield toDateKey(d)
    return
  }

  if (rule.freq === 'weekly') {
    const days = rule.weekdays.length > 0 ? rule.weekdays : [first.getDay()]
    // Desplazamiento desde el lunes (lunes = 0 ... domingo = 6), ordenado
    const offsets = [...new Set(days.map((wd) => (wd + 6) % 7))].sort((a, b) => a - b)
    const firstWeek = startOfWeek(first)
    let weeks = 0
    if (from > event.date) {
      const passed = Math.floor(diffDays(toDateKey(firstWeek), toDateKey(startOfWeek(parseKey(from)))) / 7)
      weeks = Math.floor(passed / interval) * interval
    }
    for (let i = 0; i < MAX_STEPS; i++, weeks += interval) {
      const monday = addDays(firstWeek, weeks * 7)
      for (const offset of offsets) {
        const key = toDateKey(addDays(monday, offset))
        if (key < event.date) continue
        if (key > last) return
        if (key >= from) yield key
      }
    }
    return
  }

  // Mensual y anual: mismo día del mes. Si ese mes no tiene ese día (31, 29 de febrero...), se salta.
  const stepMonths = rule.freq === 'monthly' ? interval : interval * 12
  const day = first.getDate()
  let months = 0
  if (from > event.date) {
    const f = parseKey(from)
    const passed = (f.getFullYear() - first.getFullYear()) * 12 + (f.getMonth() - first.getMonth())
    months = Math.max(0, Math.floor((passed - 1) / stepMonths) * stepMonths)
  }
  for (let i = 0; i < MAX_STEPS; i++, months += stepMonths) {
    const d = new Date(first.getFullYear(), first.getMonth() + months, day)
    if (d.getDate() !== day) continue
    const key = toDateKey(d)
    if (key > last) return
    if (key >= from) yield key
  }
}
