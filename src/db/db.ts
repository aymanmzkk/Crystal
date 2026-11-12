import Dexie, { type EntityTable } from 'dexie'
import { moveMemoryPhotos } from './migrations'
import type {
  Assessment,
  CalendarEvent,
  Category,
  Course,
  Chore,
  ColorKey,
  Contact,
  Debt,
  Deck,
  DocumentRecord,
  Exercise,
  Flashcard,
  FocusSession,
  Goal,
  GymRoutine,
  Habit,
  HabitLog,
  InventoryItem,
  LibraryItem,
  Measurement,
  Medication,
  Memory,
  Note,
  Project,
  Routine,
  RoutineLog,
  SavingsGoal,
  SettingRecord,
  ShoppingItem,
  Subject,
  Subscription,
  Task,
  Tombstone,
  Transaction,
  Trip,
  WishItem,
  Workout,
  WorkShift,
  Attachment,
  ArchiveTarget,
} from './types'

const DEFAULT_CATEGORIES: { key: string; es: string; en: string; icon: string; color: ColorKey }[] = [
  { key: 'clase', es: 'Clase', en: 'School', icon: 'school', color: 'blue' },
  { key: 'trabajo', es: 'Trabajo', en: 'Work', icon: 'briefcase', color: 'gray' },
  { key: 'gimnasio', es: 'Gimnasio', en: 'Gym', icon: 'barbell', color: 'green' },
  { key: 'cumpleanos', es: 'Cumpleaños', en: 'Birthdays', icon: 'cake', color: 'pink' },
  { key: 'finanzas', es: 'Finanzas', en: 'Finance', icon: 'wallet', color: 'amber' },
  { key: 'salud', es: 'Salud y documentos', en: 'Health and documents', icon: 'stethoscope', color: 'red' },
  { key: 'viajes', es: 'Viajes', en: 'Travel', icon: 'plane', color: 'teal' },
  { key: 'personal', es: 'Personal', en: 'Personal', icon: 'checklist', color: 'purple' },
]

function defaultCategories(): Category[] {
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'es'
  const now = Date.now()
  // Ids fijos para que los calendarios por defecto no se dupliquen al sincronizar varios dispositivos
  return DEFAULT_CATEGORIES.map((c, i) => ({
    id: `cat-${c.key}`,
    name: c[lang],
    icon: c.icon,
    color: c.color,
    order: i,
    createdAt: now,
    updatedAt: now,
    deletedAt: 0,
    dirty: 1,
  }))
}

export class VidaDB extends Dexie {
  declare categories: EntityTable<Category, 'id'>
  declare events: EntityTable<CalendarEvent, 'id'>
  declare tasks: EntityTable<Task, 'id'>
  declare tombstones: EntityTable<Tombstone, 'id'>
  declare habits: EntityTable<Habit, 'id'>
  declare habitLogs: EntityTable<HabitLog, 'id'>
  declare routines: EntityTable<Routine, 'id'>
  declare routineLogs: EntityTable<RoutineLog, 'id'>
  declare focusSessions: EntityTable<FocusSession, 'id'>
  declare workShifts: EntityTable<WorkShift, 'id'>
  declare settings: EntityTable<SettingRecord, 'id'>
  declare subjects: EntityTable<Subject, 'id'>
  declare assessments: EntityTable<Assessment, 'id'>
  declare decks: EntityTable<Deck, 'id'>
  declare cards: EntityTable<Flashcard, 'id'>
  declare exercises: EntityTable<Exercise, 'id'>
  declare gymRoutines: EntityTable<GymRoutine, 'id'>
  declare workouts: EntityTable<Workout, 'id'>
  declare transactions: EntityTable<Transaction, 'id'>
  declare subscriptions: EntityTable<Subscription, 'id'>
  declare savingsGoals: EntityTable<SavingsGoal, 'id'>
  declare wishlist: EntityTable<WishItem, 'id'>
  declare debts: EntityTable<Debt, 'id'>
  declare contacts: EntityTable<Contact, 'id'>
  declare shopping: EntityTable<ShoppingItem, 'id'>
  declare chores: EntityTable<Chore, 'id'>
  declare inventory: EntityTable<InventoryItem, 'id'>
  declare documents: EntityTable<DocumentRecord, 'id'>
  declare measurements: EntityTable<Measurement, 'id'>
  declare medications: EntityTable<Medication, 'id'>
  declare notes: EntityTable<Note, 'id'>
  declare goals: EntityTable<Goal, 'id'>
  declare trips: EntityTable<Trip, 'id'>
  declare memories: EntityTable<Memory, 'id'>
  declare library: EntityTable<LibraryItem, 'id'>
  declare projects: EntityTable<Project, 'id'>
  declare courses: EntityTable<Course, 'id'>
  declare attachments: EntityTable<Attachment, 'id'>
  // Solo en este dispositivo: carpetas elegidas para archivar (no va en copias ni se sincroniza)
  declare archiveTargets: EntityTable<ArchiveTarget, 'id'>

  // 'vida' es la base de datos de siempre (sin cuentas). Con cuentas, cada persona tiene la suya: 'vida-<id>'.
  constructor(name = LEGACY_DB) {
    super(name)
    // Solo se listan los campos con índice; el resto de campos se guardan igual.
    // Cada versión nueva solo declara las tablas que añade o cambia: Dexie conserva las anteriores.
    this.version(1).stores({
      categories: 'id, order, deletedAt, dirty',
      events: 'id, date, categoryId, deletedAt, dirty',
      tasks: 'id, status, due, categoryId, deletedAt, dirty',
      tombstones: 'id, table',
    })
    // v2: los eventos pueden repetirse y se marcan como hechos por día
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('events')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            e.recurrence ??= null
            e.exdates ??= []
            e.doneDates ??= e.done ? [e.date] : []
            delete e.done
          }),
      )
    // v3: las tareas guardan cuándo se terminaron
    this.version(3)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('tasks')
          .toCollection()
          .modify((task: Record<string, unknown>) => {
            task.completedAt ??= task.status === 'done' ? task.updatedAt : null
          }),
      )
    // v4: hábitos y rutinas, con su registro diario
    this.version(4).stores({
      habits: 'id, order, deletedAt, dirty',
      habitLogs: 'id, habitId, date, deletedAt, dirty',
      routines: 'id, order, deletedAt, dirty',
      routineLogs: 'id, routineId, date, deletedAt, dirty',
    })
    // v5: Pomodoro, turnos de trabajo y ajustes que se sincronizan
    this.version(5).stores({
      focusSessions: 'id, date, taskId, deletedAt, dirty',
      workShifts: 'id, date, deletedAt, dirty',
      settings: 'id, dirty',
    })
    // v6: clase (asignaturas, exámenes y notas) y flashcards
    this.version(6).stores({
      subjects: 'id, order, deletedAt, dirty',
      assessments: 'id, subjectId, date, deletedAt, dirty',
      decks: 'id, subjectId, deletedAt, dirty',
      cards: 'id, deckId, due, deletedAt, dirty',
    })
    // v7: gimnasio (ejercicios, rutinas y entrenamientos)
    this.version(7).stores({
      exercises: 'id, name, deletedAt, dirty',
      gymRoutines: 'id, order, deletedAt, dirty',
      workouts: 'id, date, routineId, deletedAt, dirty',
    })
    // v8: finanzas
    this.version(8).stores({
      transactions: 'id, date, type, category, subscriptionId, deletedAt, dirty',
      subscriptions: 'id, nextDate, deletedAt, dirty',
      savingsGoals: 'id, deletedAt, dirty',
      wishlist: 'id, deletedAt, dirty',
      debts: 'id, date, deletedAt, dirty',
    })
    // v9: contactos
    this.version(9).stores({
      contacts: 'id, name, deletedAt, dirty',
    })
    // v10: casa (lista de la compra y tareas del hogar)
    this.version(10).stores({
      shopping: 'id, aisle, deletedAt, dirty',
      chores: 'id, deletedAt, dirty',
    })
    // v11: inventario y documentos
    this.version(11).stores({
      inventory: 'id, warrantyUntil, deletedAt, dirty',
      documents: 'id, expires, deletedAt, dirty',
    })
    // v12: salud, notas y objetivos
    this.version(12).stores({
      measurements: 'id, date, deletedAt, dirty',
      medications: 'id, deletedAt, dirty',
      notes: 'id, journalDate, updatedAt, deletedAt, dirty',
      goals: 'id, deadline, deletedAt, dirty',
    })
    // v13: viajes, recuerdos, biblioteca, proyectos y cursos
    this.version(13).stores({
      trips: 'id, start, deletedAt, dirty',
      memories: 'id, date, tripId, deletedAt, dirty',
      library: 'id, status, deletedAt, dirty',
      projects: 'id, status, deletedAt, dirty',
      courses: 'id, status, deletedAt, dirty',
    })
    // v14: archivos adjuntos (fotos, billetes, PDFs) y viajes con apartados (reservas, planes, gastos, días...)
    this.version(14)
      .stores({
        attachments: 'id, [ownerTable+ownerId], ownerId, deletedAt, dirty',
      })
      .upgrade((tx) =>
        tx
          .table('trips')
          .toCollection()
          .modify((trip: Record<string, unknown>) => {
            trip.available ??= null
            trip.todo ??= []
            trip.shopping ??= []
            trip.bookings ??= []
            trip.plans ??= []
            trip.expenses ??= []
            trip.days ??= {}
          }),
      )
    // v15: archivado de archivos. Cada adjunto puede tener una copia externa (archive) y liberar su archivo (blob = null).
    // Las fotos de los recuerdos pasan a ser adjuntos. Carpetas para archivar en una tabla local.
    this.version(15)
      .stores({
        archiveTargets: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('attachments')
          .toCollection()
          .modify((a: Record<string, unknown>) => {
            a.archive ??= null
          })
        await moveMemoryPhotos(tx.table<Memory, string>('memories'), tx.table<Attachment, string>('attachments'))
      })
    // Se ejecuta una sola vez, cuando se crea la base de datos en el dispositivo
    this.on('populate', (tx) => {
      void tx.table('categories').bulkAdd(defaultCategories())
    })
  }
}

// Nombre de la base de datos de antes de las cuentas (el nombre interno sigue siendo 'vida' para no perder datos)
export const LEGACY_DB = 'vida'

// Base de datos en uso. Es "let" para poder cambiarla al iniciar sesión: los imports ven siempre la actual.
export let db = new VidaDB()

// Cambia a la base de datos de una cuenta (se llama una sola vez al arrancar, antes de pintar la app)
export function switchToUserDatabase(userId: string) {
  db.close()
  db = new VidaDB(`${LEGACY_DB}-${userId}`)
}
