import type { Assessment, CalendarEvent, Contact, DocumentRecord, InventoryItem, Medication, Subscription, Subject, Trip } from '../../db/types'
import { formatMoney } from '../../lib/format'
import { schoolEvents, schoolTarget } from '../school/calendarBridge'

// Eventos del calendario que vienen de otras apps (no se guardan en la tabla de eventos):
// el horario y los exámenes de Clase, los cobros de las suscripciones y los cumpleaños de los contactos.

const FINANCE_PREFIX = 'finance:'
const PEOPLE_PREFIX = 'people:'
const DOC_PREFIX = 'doc:'
const TRIP_PREFIX = 'trip:'

// Viajes: un evento de varios días en el calendario Viajes, con cuenta atrás y aviso una semana y un día antes
export function tripEvents(trips: Trip[]): CalendarEvent[] {
  return trips.map((trip) => ({
    id: `${TRIP_PREFIX}${trip.id}`,
    createdAt: trip.createdAt,
    updatedAt: 0,
    deletedAt: 0,
    dirty: 0,
    title: trip.name,
    categoryId: 'cat-viajes',
    date: trip.start,
    endDate: trip.end > trip.start ? trip.end : null,
    time: null,
    durationMin: 0,
    color: null,
    important: true,
    countdown: true,
    reminders: [10080, 1440],
    notes: trip.destination,
    recurrence: null,
    exdates: [],
    doneDates: [],
  }))
}
const WARRANTY_PREFIX = 'warranty:'

// Caducidades de documentos y fin de garantías: un evento de todo el día con aviso una semana y un día antes
function expiryEvent(id: string, title: string, date: string): CalendarEvent {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: 0,
    dirty: 0,
    title,
    categoryId: 'cat-salud',
    date,
    endDate: null,
    time: null,
    durationMin: 0,
    color: null,
    important: false,
    countdown: false,
    reminders: [10080, 1440],
    notes: '',
    recurrence: null,
    exdates: [],
    doneDates: [],
  }
}

export function expiryEvents(documents: DocumentRecord[], inventory: InventoryItem[], language: string): CalendarEvent[] {
  const expires = language.startsWith('es') ? 'caduca' : 'expires'
  const warranty = language.startsWith('es') ? 'fin de garantía' : 'warranty ends'
  return [
    ...documents.filter((d) => d.expires).map((d) => expiryEvent(`${DOC_PREFIX}${d.id}`, `${d.name} · ${expires}`, d.expires!)),
    ...inventory.filter((i) => i.warrantyUntil).map((i) => expiryEvent(`${WARRANTY_PREFIX}${i.id}`, `${i.name} · ${warranty}`, i.warrantyUntil!)),
  ]
}

// Cumpleaños de los contactos: cada año, todo el día, con aviso el día antes
export function birthdayEvents(contacts: Contact[]): CalendarEvent[] {
  return contacts
    .filter((c) => c.birthday)
    .map((c) => ({
      id: `${PEOPLE_PREFIX}${c.id}`,
      createdAt: 0,
      updatedAt: 0,
      deletedAt: 0,
      dirty: 0,
      title: c.name,
      categoryId: 'cat-cumpleanos',
      // 2000 fue bisiesto: así también existe el 29 de febrero
      date: `${c.birthYear && c.birthYear > 2000 ? c.birthYear : 2000}-${c.birthday}`,
      endDate: null,
      time: null,
      durationMin: 0,
      color: null,
      important: true,
      // Los de la familia salen también en las cuentas atrás del inicio
      countdown: c.relation === 'family',
      reminders: [1440],
      notes: '',
      recurrence: { freq: 'yearly', interval: 1, weekdays: [], until: null },
      exdates: [],
      doneDates: [],
    }))
}

// Tomas de medicación: cada día a su hora, con aviso al momento. Solo las usa el motor de avisos (no se ven en el calendario).
export function medicationEvents(medications: Medication[]): CalendarEvent[] {
  return medications
    .filter((m) => m.active)
    .flatMap((m) =>
      m.times.map((time, i) => ({
        id: `med:${m.id}:${i}`,
        createdAt: 0,
        updatedAt: 0,
        deletedAt: 0,
        dirty: 0 as const,
        title: m.dose ? `${m.name} · ${m.dose}` : m.name,
        categoryId: 'cat-salud',
        date: '2000-01-01',
        endDate: null,
        time,
        durationMin: 5,
        color: null,
        important: false,
        countdown: false,
        reminders: [0],
        notes: '',
        recurrence: { freq: 'daily' as const, interval: 1, weekdays: [], until: m.until },
        exdates: [],
        doneDates: [],
      })),
    )
}

export function financeEvents(subscriptions: Subscription[], language: string): CalendarEvent[] {
  return subscriptions
    .filter((s) => s.active)
    .map((s) => ({
      id: `${FINANCE_PREFIX}sub:${s.id}`,
      createdAt: 0,
      updatedAt: 0,
      deletedAt: 0,
      dirty: 0,
      title: `${s.name} · ${formatMoney(s.amount, language)}`,
      categoryId: 'cat-finanzas',
      date: s.nextDate,
      endDate: null,
      time: null,
      durationMin: 0,
      color: null,
      important: false,
      countdown: false,
      reminders: [1440],
      notes: '',
      recurrence: { freq: 'monthly', interval: s.cycle === 'monthly' ? 1 : 12, weekdays: [], until: null },
      exdates: [],
      doneDates: [],
    }))
}

export interface ExternalSources {
  subjects: Subject[]
  assessments: Assessment[]
  subscriptions: Subscription[]
  contacts: Contact[]
  inventory: InventoryItem[]
  documents: DocumentRecord[]
  trips: Trip[]
}

export function externalEvents(sources: ExternalSources, language: string): CalendarEvent[] {
  return [
    ...schoolEvents(sources.subjects, sources.assessments),
    ...financeEvents(sources.subscriptions, language),
    ...birthdayEvents(sources.contacts),
    ...expiryEvents(sources.documents, sources.inventory, language),
    ...tripEvents(sources.trips),
  ]
}

// Dónde se abre un evento que viene de otra app; null si es un evento normal del calendario
export function externalTarget(eventId: string): string | null {
  if (eventId.startsWith(FINANCE_PREFIX)) return '/finance?tab=subscriptions'
  if (eventId.startsWith(DOC_PREFIX)) return '/documents'
  if (eventId.startsWith(TRIP_PREFIX)) return `/travel?open=${eventId.slice(TRIP_PREFIX.length)}`
  if (eventId.startsWith(WARRANTY_PREFIX)) return '/inventory'
  if (eventId.startsWith(PEOPLE_PREFIX)) return `/contacts?open=${eventId.slice(PEOPLE_PREFIX.length)}`
  return schoolTarget(eventId)
}
