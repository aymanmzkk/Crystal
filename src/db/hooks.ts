import { useMemo } from 'react'
import { Dexie } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { externalEvents } from '../modules/calendar/external'
import { db } from './db'
import { countTrash, listTrash } from './repo'
import type { Attachment, CalendarEvent, DateKey, TableName } from './types'

// useLiveQuery vuelve a ejecutar la consulta sola cada vez que cambian los datos.
// Devuelve undefined mientras carga la primera vez.

export function useTrashItems() {
  return useLiveQuery(listTrash)
}

export function useTrashCount() {
  return useLiveQuery(countTrash) ?? 0
}

export function useCategories() {
  return useLiveQuery(() => db.categories.where('deletedAt').equals(0).sortBy('order'))
}

export function useActiveEvents() {
  return useLiveQuery(() => db.events.where('deletedAt').equals(0).toArray())
}

export function useActiveTasks() {
  return useLiveQuery(() => db.tasks.where('deletedAt').equals(0).toArray())
}

export function useHabits() {
  return useLiveQuery(() => db.habits.where('deletedAt').equals(0).sortBy('order'))
}

// Registros de hábitos desde una fecha (incluida)
export function useHabitLogsSince(from: DateKey) {
  return useLiveQuery(() => db.habitLogs.where('date').aboveOrEqual(from).toArray(), [from])
}

export function useFocusSessionsSince(from: DateKey) {
  return useLiveQuery(
    () =>
      db.focusSessions
        .where('date')
        .aboveOrEqual(from)
        .filter((s) => s.deletedAt === 0)
        .toArray(),
    [from],
  )
}

export function useWorkShiftsBetween(from: DateKey, to: DateKey) {
  return useLiveQuery(
    () =>
      db.workShifts
        .where('date')
        .between(from, to, true, true)
        .filter((s) => s.deletedAt === 0)
        .toArray(),
    [from, to],
  )
}

// Ajuste guardado: undefined mientras carga, null si nunca se ha guardado
export function useSetting<T>(key: string): T | null | undefined {
  return useLiveQuery(async () => ((await db.settings.get(key))?.value as T | undefined) ?? null, [key])
}

export function useSubjects() {
  return useLiveQuery(() => db.subjects.where('deletedAt').equals(0).sortBy('order'))
}

export function useAssessments() {
  return useLiveQuery(() => db.assessments.where('deletedAt').equals(0).toArray())
}

export function useDecks() {
  return useLiveQuery(() => db.decks.where('deletedAt').equals(0).sortBy('name'))
}

export function useCards() {
  return useLiveQuery(() => db.cards.where('deletedAt').equals(0).toArray())
}

export function useTrips() {
  return useLiveQuery(() => db.trips.where('deletedAt').equals(0).sortBy('start'))
}

// Archivos adjuntos de un registro (opcionalmente de un apartado), del más antiguo al más nuevo
export function useAttachments(ownerTable: TableName, ownerId: string | undefined, slot?: string) {
  return useLiveQuery(
    () =>
      ownerId
        ? db.attachments
            .where('[ownerTable+ownerId]')
            .equals([ownerTable, ownerId])
            .filter((a) => a.deletedAt === 0 && (slot === undefined || a.slot === slot))
            .sortBy('createdAt')
        : [],
    [ownerTable, ownerId, slot],
  )
}

// Todos los adjuntos (activos) de una app, agrupados por registro y en orden
export function useAttachmentsByOwner(ownerTable: TableName, slot?: string) {
  return useLiveQuery(async () => {
    const rows = await db.attachments
      .where('[ownerTable+ownerId]')
      .between([ownerTable, Dexie.minKey], [ownerTable, Dexie.maxKey])
      .filter((a) => a.deletedAt === 0 && (slot === undefined || a.slot === slot))
      .sortBy('createdAt')
    const map = new Map<string, Attachment[]>()
    for (const a of rows) map.set(a.ownerId, [...(map.get(a.ownerId) ?? []), a])
    return map
  }, [ownerTable, slot])
}

export function useMemories() {
  return useLiveQuery(() => db.memories.where('deletedAt').equals(0).sortBy('date'))
}

export function useLibrary() {
  return useLiveQuery(() => db.library.where('deletedAt').equals(0).toArray())
}

export function useProjects() {
  return useLiveQuery(() => db.projects.where('deletedAt').equals(0).toArray())
}

export function useCourses() {
  return useLiveQuery(() => db.courses.where('deletedAt').equals(0).toArray())
}

export function useMeasurements() {
  return useLiveQuery(() => db.measurements.where('deletedAt').equals(0).sortBy('date'))
}

export function useMedications() {
  return useLiveQuery(() => db.medications.where('deletedAt').equals(0).sortBy('name'))
}

export function useNotes() {
  return useLiveQuery(() => db.notes.where('deletedAt').equals(0).toArray())
}

export function useGoals() {
  return useLiveQuery(() => db.goals.where('deletedAt').equals(0).toArray())
}

export function useInventory() {
  return useLiveQuery(() => db.inventory.where('deletedAt').equals(0).sortBy('name'))
}

export function useDocuments() {
  return useLiveQuery(() => db.documents.where('deletedAt').equals(0).sortBy('name'))
}

export function useShopping() {
  return useLiveQuery(() => db.shopping.where('deletedAt').equals(0).toArray())
}

export function useChores() {
  return useLiveQuery(() => db.chores.where('deletedAt').equals(0).toArray())
}

export function useContacts() {
  return useLiveQuery(() => db.contacts.where('deletedAt').equals(0).sortBy('name'))
}

export function useSubscriptions() {
  return useLiveQuery(() => db.subscriptions.where('deletedAt').equals(0).toArray())
}

export function useTransactionsBetween(from: DateKey, to: DateKey) {
  return useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(from, to, true, true)
        .filter((t) => t.deletedAt === 0)
        .toArray(),
    [from, to],
  )
}

export function useSavingsGoals() {
  return useLiveQuery(() => db.savingsGoals.where('deletedAt').equals(0).toArray())
}

export function useWishlist() {
  return useLiveQuery(() => db.wishlist.where('deletedAt').equals(0).toArray())
}

export function useDebts() {
  return useLiveQuery(() => db.debts.where('deletedAt').equals(0).toArray())
}

// Eventos del calendario más los que vienen de otras apps (clase y suscripciones). undefined mientras carga.
export function useCalendarEvents(): CalendarEvent[] | undefined {
  const { i18n } = useTranslation()
  const events = useActiveEvents()
  const subjects = useSubjects()
  const assessments = useAssessments()
  const subscriptions = useSubscriptions()
  const contacts = useContacts()
  const inventory = useInventory()
  const documents = useDocuments()
  const trips = useTrips()
  return useMemo(
    () =>
      events && subjects && assessments && subscriptions && contacts && inventory && documents && trips
        ? [...events, ...externalEvents({ subjects, assessments, subscriptions, contacts, inventory, documents, trips }, i18n.language)]
        : undefined,
    [events, subjects, assessments, subscriptions, contacts, inventory, documents, trips, i18n.language],
  )
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.where('deletedAt').equals(0).sortBy('name'))
}

export function useGymRoutines() {
  return useLiveQuery(() => db.gymRoutines.where('deletedAt').equals(0).sortBy('order'))
}

export function useWorkouts() {
  return useLiveQuery(() => db.workouts.where('deletedAt').equals(0).toArray())
}

export function useRoutines() {
  return useLiveQuery(() => db.routines.where('deletedAt').equals(0).sortBy('order'))
}

export function useRoutineLogsSince(from: DateKey) {
  return useLiveQuery(() => db.routineLogs.where('date').aboveOrEqual(from).toArray(), [from])
}
