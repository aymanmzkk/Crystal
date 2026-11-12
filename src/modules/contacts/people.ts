import type { Contact, DateKey } from '../../db/types'
import { diffDays, parseKey, toDateKey } from '../../lib/dates'

// Próximo cumpleaños (hoy incluido). Quien nació un 29 de febrero lo celebra el 28 los años que no son bisiestos.
export function nextBirthday(birthday: string, today: DateKey): DateKey {
  const [month, day] = birthday.split('-').map(Number)
  const year = parseKey(today).getFullYear()
  const on = (y: number) => {
    const lastDay = new Date(y, month, 0).getDate()
    return toDateKey(new Date(y, month - 1, Math.min(day, lastDay)))
  }
  const thisYear = on(year)
  return thisYear >= today ? thisYear : on(year + 1)
}

// Años que cumple en esa fecha (null si no se sabe el año)
export function ageOn(birthYear: number | null, date: DateKey): number | null {
  return birthYear ? parseKey(date).getFullYear() - birthYear : null
}

// Días de retraso para escribir a alguien (0 = toca hoy). null si no hay aviso o aún no toca.
export function contactOverdue(contact: Pick<Contact, 'lastContact' | 'contactEveryDays' | 'createdAt'>, today: DateKey): number | null {
  if (!contact.contactEveryDays) return null
  const since = contact.lastContact ?? toDateKey(new Date(contact.createdAt))
  const late = diffDays(since, today) - contact.contactEveryDays
  return late >= 0 ? late : null
}
