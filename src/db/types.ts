// Fecha local sin hora, en formato 'YYYY-MM-DD'
export type DateKey = string

export type ColorKey = 'blue' | 'teal' | 'green' | 'amber' | 'coral' | 'red' | 'pink' | 'purple' | 'gray'

// Campos que tienen todos los registros. Preparados para sincronizar con la nube más adelante.
export interface BaseRecord {
  id: string
  createdAt: number
  updatedAt: number
  // 0 = activo; si no, fecha (ms) en que se movió a la papelera
  deletedAt: number
  // 1 = tiene cambios que todavía no se han subido a la nube
  dirty: 0 | 1
}

// Un "calendario" del módulo Calendario: Clase, Trabajo, Gimnasio...
export interface Category extends BaseRecord {
  name: string
  icon: string
  color: ColorKey
  order: number
}

export type RepeatFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Recurrence {
  freq: RepeatFreq
  // Cada cuántos días/semanas/meses/años (1 = todos)
  interval: number
  // Solo para 'weekly': días de la semana (0 = domingo ... 6 = sábado)
  weekdays: number[]
  // Último día en que se puede repetir; null = sin fin
  until: DateKey | null
}

export interface CalendarEvent extends BaseRecord {
  title: string
  categoryId: string
  // Primer día del evento (o de la serie, si se repite)
  date: DateKey
  // Último día si el evento dura varios días; null si es de un solo día
  endDate: DateKey | null
  // 'HH:mm'; null = todo el día
  time: string | null
  durationMin: number
  // null = usa el color de su calendario
  color: ColorKey | null
  important: boolean
  countdown: boolean
  // Minutos antes del evento en los que avisar
  reminders: number[]
  notes: string
  recurrence: Recurrence | null
  // Días de la serie que se han quitado ("borrar solo este día")
  exdates: DateKey[]
  // Días en que se ha marcado como hecho (en un evento sin repetición, su propia fecha)
  doneDates: DateKey[]
}

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task extends BaseRecord {
  title: string
  status: TaskStatus
  categoryId: string | null
  due: DateKey | null
  dueTime: string | null
  // Para la matriz de prioridades
  urgent: boolean
  important: boolean
  reminders: number[]
  notes: string
  // Posición dentro de su columna del Kanban (se ordena de menor a mayor)
  order: number
  // Cuándo se terminó (ms); null si no está terminada
  completedAt: number | null
}

export interface Habit extends BaseRecord {
  name: string
  icon: string
  color: ColorKey
  // 'check' = hecho / no hecho; 'count' = hay que llegar a `goal` (vasos de agua, páginas...)
  kind: 'check' | 'count'
  goal: number
  // Días de la semana en que toca (0 = domingo ... 6 = sábado). Los 7 = todos los días.
  weekdays: number[]
  order: number
}

// Lo hecho en un hábito un día concreto. id = `${habitId}:${date}` para que no haya duplicados.
export interface HabitLog extends BaseRecord {
  habitId: string
  date: DateKey
  value: number
}

export interface RoutineItem {
  id: string
  text: string
}

export interface Routine extends BaseRecord {
  name: string
  icon: string
  moment: 'morning' | 'evening' | 'any'
  items: RoutineItem[]
  order: number
}

// Pasos de una rutina marcados un día concreto. id = `${routineId}:${date}`.
export interface RoutineLog extends BaseRecord {
  routineId: string
  date: DateKey
  doneItems: string[]
}

// Una sesión de concentración del Pomodoro ya terminada
export interface FocusSession extends BaseRecord {
  // Cuándo empezó (ms) y cuántos minutos duró de verdad
  startedAt: number
  minutes: number
  date: DateKey
  label: string
  taskId: string | null
}

// Un turno de trabajo. end = null mientras el turno está en marcha (fichado y sin salir).
export interface WorkShift extends BaseRecord {
  date: DateKey
  start: string
  end: string | null
  breakMin: number
  // Horas extra: se pagan con la tarifa de extras
  extra: boolean
  notes: string
}

// Una clase fija del horario semanal
export interface ScheduleSlot {
  // 0 = domingo ... 6 = sábado
  weekday: number
  start: string
  end: string
  room: string
}

export interface Subject extends BaseRecord {
  name: string
  // Siglas cortas para el calendario (AD, DI...)
  code: string
  color: ColorKey
  teacher: string
  schedule: ScheduleSlot[]
  notes: string
  order: number
}

// Examen, entrega o cualquier cosa que cuente para la nota de una asignatura
export interface Assessment extends BaseRecord {
  subjectId: string
  title: string
  kind: 'exam' | 'assignment' | 'other'
  date: DateKey | null
  time: string | null
  // Porcentaje de la nota final (0 = todas las evaluaciones pesan lo mismo)
  weight: number
  // Nota sobre 10; null = todavía sin nota
  grade: number | null
  // Entregado / hecho
  done: boolean
  notes: string
}

export interface Deck extends BaseRecord {
  name: string
  subjectId: string | null
}

// Tarjeta de estudio con los datos del repaso espaciado (algoritmo tipo SM-2)
export interface Flashcard extends BaseRecord {
  deckId: string
  front: string
  back: string
  // Día en que toca repasarla
  due: DateKey
  // Días hasta el siguiente repaso, facilidad (1,3 a 2,5+), repasos seguidos bien y fallos
  interval: number
  ease: number
  reps: number
  lapses: number
}

export type MuscleGroup = 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'other'

export interface Exercise extends BaseRecord {
  name: string
  muscle: MuscleGroup
}

// Tipo de día en el plan semanal del gimnasio
export type GymSplit = 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'full' | 'cardio' | 'rest'

// Objetivo de un ejercicio dentro de una plantilla
export interface ExerciseTarget {
  sets: number
  // Texto libre: "8-12", "5", "al fallo"...
  reps: string
  // Descanso entre series, en segundos
  restSec: number
}

// Plantilla de entrenamiento ("Pierna A"): qué ejercicios se hacen y en qué orden
export interface GymRoutine extends BaseRecord {
  name: string
  exerciseIds: string[]
  order: number
  // Opcionales (las plantillas antiguas no los tienen)
  split?: GymSplit
  targets?: Record<string, ExerciseTarget>
  notes?: string
}

export interface WorkoutSet {
  id: string
  exerciseId: string
  // kg; 0 = peso corporal
  weight: number
  reps: number
  done: boolean
}

// Una sesión de gimnasio. finishedAt = null mientras está en marcha.
export interface Workout extends BaseRecord {
  name: string
  date: DateKey
  routineId: string | null
  startedAt: number
  finishedAt: number | null
  // Ejercicios de la sesión en orden (pueden no tener series todavía)
  exerciseIds: string[]
  sets: WorkoutSet[]
  notes: string
}

// Categorías fijas de gastos e ingresos (el nombre sale de las traducciones: finance.categories.<clave>)
export type FinanceCategory =
  | 'food'
  | 'transport'
  | 'home'
  | 'leisure'
  | 'health'
  | 'education'
  | 'clothes'
  | 'subscriptions'
  | 'gifts'
  | 'other'
  | 'salary'
  | 'grant'
  | 'extra'

// Un gasto o un ingreso. amount siempre en positivo; type dice el signo.
export interface Transaction extends BaseRecord {
  title: string
  type: 'expense' | 'income'
  amount: number
  category: FinanceCategory
  date: DateKey
  // Si viene del cobro de una suscripción
  subscriptionId: string | null
}

export interface Subscription extends BaseRecord {
  name: string
  amount: number
  cycle: 'monthly' | 'yearly'
  // Próximo cobro; al registrarlo avanza un mes o un año
  nextDate: DateKey
  active: boolean
}

export interface SavingsGoal extends BaseRecord {
  name: string
  target: number
  saved: number
  deadline: DateKey | null
  color: ColorKey
}

export interface WishItem extends BaseRecord {
  name: string
  price: number
  url: string
  priority: 1 | 2 | 3
  bought: boolean
}

// Dinero prestado entre personas
export interface Debt extends BaseRecord {
  title: string
  person: string
  amount: number
  // 'owedToMe' = me deben; 'iOwe' = debo yo
  direction: 'owedToMe' | 'iOwe'
  date: DateKey
  settled: boolean
}

export interface GiftIdea {
  id: string
  text: string
  done: boolean
}

export interface Contact extends BaseRecord {
  name: string
  relation: 'family' | 'friend' | 'work' | 'school' | 'other'
  phone: string
  email: string
  // Cumpleaños 'MM-DD' y año de nacimiento si se sabe (para calcular la edad)
  birthday: string | null
  birthYear: number | null
  // Última vez que hablaste con esta persona, y cada cuántos días quieres hacerlo (null = sin aviso)
  lastContact: DateKey | null
  contactEveryDays: number | null
  gifts: GiftIdea[]
  notes: string
}

export type Aisle = 'fruit' | 'dairy' | 'meat' | 'bakery' | 'pantry' | 'frozen' | 'drinks' | 'cleaning' | 'hygiene' | 'other'

export interface ShoppingItem extends BaseRecord {
  name: string
  quantity: string
  aisle: Aisle
  // Ya está en el carro
  checked: boolean
}

// Tarea de casa que se repite cada X días (fregar, regar las plantas...)
export interface Chore extends BaseRecord {
  name: string
  everyDays: number
  lastDone: DateKey | null
  assignee: string
}

// Algo que tienes en casa: dónde está, cuánto costó y hasta cuándo tiene garantía
export interface InventoryItem extends BaseRecord {
  name: string
  location: string
  purchaseDate: DateKey | null
  price: number | null
  warrantyUntil: DateKey | null
  notes: string
}

// Documento con fecha de caducidad (DNI, pasaporte, carné, seguro...)
export interface DocumentRecord extends BaseRecord {
  name: string
  kind: 'id' | 'passport' | 'license' | 'insurance' | 'card' | 'other'
  expires: DateKey | null
  notes: string
}

// Medida corporal de un día
export interface Measurement extends BaseRecord {
  date: DateKey
  weight: number | null
  waist: number | null
  notes: string
}

export interface Medication extends BaseRecord {
  name: string
  dose: string
  // Horas a las que avisar ('HH:mm')
  times: string[]
  active: boolean
  // Hasta qué día hay que tomarla (null = sin fin)
  until: DateKey | null
}

// Nota libre o entrada de diario (journalDate = día del diario; null = nota normal)
export interface Note extends BaseRecord {
  title: string
  body: string
  pinned: boolean
  journalDate: DateKey | null
}

export interface Milestone {
  id: string
  text: string
  done: boolean
}

export interface Goal extends BaseRecord {
  title: string
  why: string
  deadline: DateKey | null
  milestones: Milestone[]
  // Algo que hacer "alguna vez en la vida", sin fecha
  bucket: boolean
  achievedAt: number | null
}

export interface CheckItem {
  id: string
  text: string
  done: boolean
}

// Billete o reserva de un viaje: vuelos, trenes, alojamiento...
export type TripBookingKind = 'flight' | 'train' | 'bus' | 'car' | 'hotel' | 'apartment' | 'other'

export interface TripBooking {
  id: string
  kind: TripBookingKind
  title: string
  date: DateKey | null
  time: string | null
  // Último día (alojamiento: día de salida)
  endDate: DateKey | null
  // Localizador o número de reserva
  code: string
  place: string
  price: number | null
  paid: boolean
  notes: string
}

// Algo que hacer o donde comer: actividades, entradas, restaurantes...
export type TripPlanKind = 'activity' | 'ticket' | 'restaurant' | 'food'

export interface TripPlan {
  id: string
  kind: TripPlanKind
  title: string
  date: DateKey | null
  time: string | null
  price: number | null
  // Entrada comprada o mesa reservada
  booked: boolean
  // Ya hecho / visitado
  done: boolean
  url: string
  notes: string
}

export type TripExpenseCategory = 'transport' | 'stay' | 'food' | 'activities' | 'shopping' | 'other'

export interface TripExpense {
  id: string
  title: string
  amount: number
  category: TripExpenseCategory
  date: DateKey | null
}

export interface Trip extends BaseRecord {
  name: string
  destination: string
  country: string
  start: DateKey
  end: DateKey
  // Presupuesto estimado
  budget: number | null
  // Dinero disponible para el viaje (ahorrado o apartado)
  available: number | null
  // Checklist de la maleta
  packing: CheckItem[]
  // Cosas que hacer antes de viajar (pasaporte, seguro, avisar al banco...)
  todo: CheckItem[]
  // Cosas que comprar para el viaje
  shopping: CheckItem[]
  // Vuelos, transporte y alojamiento
  bookings: TripBooking[]
  // Actividades, entradas, restaurantes y comida
  plans: TripPlan[]
  // Gastos reales durante el viaje
  expenses: TripExpense[]
  // Plan de cada día: fecha -> texto
  days: Record<DateKey, string>
  // Notas generales del viaje (antes "Plan del viaje", en texto libre)
  itinerary: string
}

// Foto de un recuerdo en el formato antiguo (dentro del propio recuerdo).
// Desde la versión 15 de la base de datos las fotos de los recuerdos son adjuntos (tabla attachments, apartado 'photos').
// Se mantiene el tipo para poder migrar recuerdos antiguos y copias de seguridad antiguas.
export interface Photo {
  id: string
  // Imagen reducida (JPEG) guardada en el dispositivo
  blob: Blob
  width: number
  height: number
  // Fecha y comentario propios de la foto (opcionales: las fotos antiguas no los tienen)
  date?: DateKey | null
  comment?: string
}

// Dónde se ha archivado la copia externa de un archivo
export type ArchiveKind = 'folder' | 'download'

export interface ArchiveRef {
  // 'folder': una carpeta elegida en el dispositivo (o en un disco externo). 'download': un archivo descargado.
  kind: ArchiveKind
  // Carpeta elegida (id de la tabla local archiveTargets) y su nombre, para enseñarlo aunque no esté conectada
  targetId: string | null
  targetName: string
  // Ruta del archivo dentro de la carpeta, o nombre del archivo descargado
  path: string
  // Huella SHA-256 del archivo: así se comprueba que la copia es idéntica al original
  sha256: string
  archivedAt: number
  // Cuándo se comprobó que la copia es idéntica (null = todavía sin comprobar: no se puede liberar el original)
  verifiedAt: number | null
}

// Archivo adjunto a cualquier registro: fotos, billetes, PDFs... Se guarda en el dispositivo.
export interface Attachment extends BaseRecord {
  // Registro al que pertenece: tabla e id (p. ej. 'trips' + id del viaje)
  ownerTable: TableName
  ownerId: string
  // Apartado dentro del registro (en viajes: 'cover', 'tickets'...); '' = general
  slot: string
  name: string
  // Tipo MIME: image/jpeg, application/pdf...
  type: string
  // Tamaño del archivo original (también cuando ya no está en el dispositivo)
  size: number
  // El archivo. null = se ha liberado de este dispositivo porque tiene una copia archivada y verificada (ver archive)
  blob: Blob | null
  // Miniatura pequeña para las listas (solo imágenes). Se queda aunque el archivo esté archivado.
  thumb: Blob | null
  width: number
  height: number
  date: DateKey | null
  comment: string
  // Copia externa (archivado). null = solo está en Crystal.
  archive: ArchiveRef | null
}

// Carpeta elegida para archivar. Solo existe en este dispositivo: no va en las copias de seguridad ni se sincroniza.
export interface ArchiveTarget {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
  createdAt: number
}

export interface Memory extends BaseRecord {
  title: string
  date: DateKey
  place: string
  tripId: string | null
  notes: string
  // Formato antiguo: las fotos ahora son adjuntos (ownerTable 'memories', slot 'photos'). Vacío o ausente tras la migración.
  photos?: Photo[]
}

export interface LibraryItem extends BaseRecord {
  title: string
  kind: 'book' | 'series' | 'movie'
  author: string
  status: 'want' | 'doing' | 'done'
  // 0 = sin puntuar, 1 a 5 estrellas
  rating: number
  finishedAt: DateKey | null
  notes: string
}

export interface Project extends BaseRecord {
  name: string
  description: string
  status: 'idea' | 'active' | 'paused' | 'done'
  color: ColorKey
  url: string
  todo: CheckItem[]
}

export interface Course extends BaseRecord {
  name: string
  kind: 'course' | 'language'
  platform: string
  // Nivel actual y objetivo (idiomas: A1...C2)
  level: string
  goalLevel: string
  progress: number
  status: 'active' | 'done' | 'paused'
  certificateUrl: string
  notes: string
}

// Ajustes guardados en la base de datos (se sincronizan). id = nombre del ajuste.
export interface SettingRecord extends BaseRecord {
  value: unknown
}

// Lo que queda de un registro borrado para siempre, para poder avisar a la nube al sincronizar
export interface Tombstone {
  id: string
  table: TableName
  deletedAt: number
}

export interface Tables {
  categories: Category
  events: CalendarEvent
  tasks: Task
  habits: Habit
  habitLogs: HabitLog
  routines: Routine
  routineLogs: RoutineLog
  focusSessions: FocusSession
  workShifts: WorkShift
  settings: SettingRecord
  subjects: Subject
  assessments: Assessment
  decks: Deck
  cards: Flashcard
  exercises: Exercise
  gymRoutines: GymRoutine
  workouts: Workout
  transactions: Transaction
  subscriptions: Subscription
  savingsGoals: SavingsGoal
  wishlist: WishItem
  debts: Debt
  contacts: Contact
  shopping: ShoppingItem
  chores: Chore
  inventory: InventoryItem
  documents: DocumentRecord
  measurements: Measurement
  medications: Medication
  notes: Note
  goals: Goal
  trips: Trip
  memories: Memory
  library: LibraryItem
  projects: Project
  courses: Course
  attachments: Attachment
}

export type TableName = keyof Tables

// Tablas cuyos registros se pueden mover a la papelera (los registros diarios no)
export type TrashableTable =
  | 'events'
  | 'tasks'
  | 'categories'
  | 'habits'
  | 'routines'
  | 'workShifts'
  | 'subjects'
  | 'assessments'
  | 'decks'
  | 'cards'
  | 'exercises'
  | 'gymRoutines'
  | 'workouts'
  | 'transactions'
  | 'subscriptions'
  | 'savingsGoals'
  | 'wishlist'
  | 'debts'
  | 'contacts'
  | 'shopping'
  | 'chores'
  | 'inventory'
  | 'documents'
  | 'measurements'
  | 'medications'
  | 'notes'
  | 'goals'
  | 'trips'
  | 'memories'
  | 'library'
  | 'projects'
  | 'courses'
  | 'attachments'

// Datos que se pasan al crear un registro: todo menos los campos que pone la base de datos
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>
