import type { Contact } from '../../db/types'

// Importar contactos del móvil: con el selector de contactos de Android (Chrome) o con un archivo .vcf
// (exportado desde la app de Contactos del móvil o desde Google Contactos). Todo se procesa en el dispositivo.

export interface ImportedContact {
  name: string
  phone: string
  email: string
  // 'MM-DD' y año si se sabe (el selector de Android no da el cumpleaños; el .vcf sí)
  birthday: string | null
  birthYear: number | null
}

// ¿Este navegador tiene el selector de contactos? (Chrome en Android, con la app abierta en https)
export const canPickContacts = () => typeof navigator !== 'undefined' && !!navigator.contacts && typeof window !== 'undefined' && 'ContactsManager' in window

// Abre el selector del móvil: el usuario elige qué contactos compartir (Crystal no ve los demás)
export async function pickContacts(): Promise<ImportedContact[]> {
  const manager = navigator.contacts!
  const supported = await manager.getProperties()
  const props = ['name', 'tel', 'email'].filter((p) => supported.includes(p))
  const picked = await manager.select(props, { multiple: true })
  return picked
    .map((c) => ({ name: (c.name?.[0] ?? '').trim(), phone: (c.tel?.[0] ?? '').trim(), email: (c.email?.[0] ?? '').trim().toLowerCase(), birthday: null, birthYear: null }))
    .filter((c) => c.name || c.phone || c.email)
    .map((c) => ({ ...c, name: c.name || c.phone || c.email }))
}

// ───────────── vCard (.vcf) ─────────────

// Texto "quoted-printable" de las vCard 2.1 de Android (=C3=A1 -> á)
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = []
  const text = value.replace(/=\r?\n/g, '')
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '=' && /^[0-9A-F]{2}$/i.test(text.slice(i + 1, i + 3))) {
      bytes.push(parseInt(text.slice(i + 1, i + 3), 16))
      i += 2
    } else bytes.push(...new TextEncoder().encode(text[i]))
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

const unescapeValue = (v: string) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim()

// Cumpleaños: 1998-03-07, 19980307, --03-07, --0307 (sin año)
export function parseBirthday(raw: string): { birthday: string; birthYear: number | null } | null {
  const v = raw.trim().slice(0, 10)
  const full = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v)
  if (full) {
    const year = Number(full[1])
    return { birthday: `${full[2]}-${full[3]}`, birthYear: year > 1900 && year < 2200 ? year : null }
  }
  const noYear = /^--(\d{2})-?(\d{2})/.exec(v)
  return noYear ? { birthday: `${noYear[1]}-${noYear[2]}`, birthYear: null } : null
}

// Lee un archivo .vcf con uno o muchos contactos
export function parseVCard(text: string): ImportedContact[] {
  // Las líneas largas siguen en la siguiente empezando por un espacio (y en quoted-printable, terminando en '=')
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  const lines = unfolded.split('\n')
  const out: ImportedContact[] = []
  let current: Partial<ImportedContact> & { n?: string } = {}
  let pendingQp = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    // Quoted-printable que sigue en la línea siguiente
    if (pendingQp) {
      line = pendingQp + line
      pendingQp = ''
    }
    if (/ENCODING=QUOTED-PRINTABLE/i.test(line) && line.endsWith('=')) {
      pendingQp = line.slice(0, -1)
      continue
    }
    const sep = line.indexOf(':')
    if (sep < 0) continue
    const head = line.slice(0, sep)
    let value = line.slice(sep + 1)
    const key = head.split(';')[0].split('.').pop()!.toUpperCase()
    if (/ENCODING=QUOTED-PRINTABLE/i.test(head)) value = decodeQuotedPrintable(value)

    if (key === 'BEGIN') current = {}
    else if (key === 'FN') current.name = unescapeValue(value)
    else if (key === 'N') current.n = value
    else if (key === 'TEL' && !current.phone) current.phone = unescapeValue(value)
    else if (key === 'EMAIL' && !current.email) current.email = unescapeValue(value).toLowerCase()
    else if (key === 'BDAY') {
      const b = parseBirthday(value)
      if (b) Object.assign(current, b)
    } else if (key === 'END') {
      // Sin FN, se monta el nombre con N (apellidos;nombre;...)
      const fromN = current.n
        ?.split(';')
        .map(unescapeValue)
        .filter(Boolean)
        .slice(0, 2)
        .reverse()
        .join(' ')
      const name = (current.name || fromN || current.phone || current.email || '').trim()
      if (name) out.push({ name, phone: current.phone ?? '', email: current.email ?? '', birthday: current.birthday ?? null, birthYear: current.birthYear ?? null })
      current = {}
    }
  }
  return out
}

// ───────────── Duplicados ─────────────

// Últimas 9 cifras: así +34 600 11 22 33 y 600112233 son el mismo número
const phoneKey = (p: string) => p.replace(/\D/g, '').slice(-9)
const nameKey = (n: string) =>
  n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export type ImportStatus = 'new' | 'update' | 'same'

export interface ImportRow {
  contact: ImportedContact
  status: ImportStatus
  // Contacto de Crystal que ya existe (mismo teléfono, correo o nombre)
  existingId: string | null
  // Datos que le faltan al existente y trae el importado
  changes: Partial<Pick<Contact, 'phone' | 'email' | 'birthday' | 'birthYear'>>
}

// Compara lo importado con los contactos de Crystal: nuevo, completa datos de uno que ya existe, o ya está igual.
// Nunca propone borrar ni cambiar datos que ya tienes: solo rellena lo que falta.
export function planImport(imported: ImportedContact[], existing: Contact[]): ImportRow[] {
  const seen = new Set<string>()
  const rows: ImportRow[] = []
  for (const c of imported) {
    const signature = `${nameKey(c.name)}|${phoneKey(c.phone)}|${c.email}`
    if (seen.has(signature)) continue
    seen.add(signature)
    const match = existing.find(
      (e) =>
        (c.phone && phoneKey(c.phone).length >= 6 && phoneKey(e.phone) === phoneKey(c.phone)) ||
        (c.email && e.email.toLowerCase() === c.email) ||
        nameKey(e.name) === nameKey(c.name),
    )
    if (!match) {
      rows.push({ contact: c, status: 'new', existingId: null, changes: {} })
      continue
    }
    const changes: ImportRow['changes'] = {}
    if (!match.phone && c.phone) changes.phone = c.phone
    if (!match.email && c.email) changes.email = c.email
    if (!match.birthday && c.birthday) {
      changes.birthday = c.birthday
      if (!match.birthYear && c.birthYear) changes.birthYear = c.birthYear
    }
    rows.push({ contact: c, status: Object.keys(changes).length ? 'update' : 'same', existingId: match.id, changes })
  }
  return rows.sort((a, b) => a.contact.name.localeCompare(b.contact.name))
}
