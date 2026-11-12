import type { ComponentType } from 'react'
import type { ColorKey } from '../db/types'
import {
  IconAddressBook,
  IconBarbell,
  IconBooks,
  IconCalendar,
  IconCalendarDue,
  IconCheckbox,
  IconClockPlay,
  IconHome,
  IconId,
  IconLayoutDashboard,
  IconNotebook,
  IconPackages,
  IconPhoto,
  IconPlane,
  IconRepeat,
  IconReportAnalytics,
  IconSchool,
  IconTargetArrow,
  IconTrophy,
  IconWallet,
} from '@tabler/icons-react'

export type AppIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>

export type ModuleId =
  | 'achievements'
  | 'dashboard'
  | 'calendar'
  | 'tasks'
  | 'habits'
  | 'goals'
  | 'notes'
  | 'finance'
  | 'gym'
  | 'contacts'
  | 'household'
  | 'inventory'
  | 'documents'
  | 'travel'
  | 'memories'
  | 'library'
  | 'pomodoro'
  | 'subjects'
  | 'exams'
  | 'grades'

export interface ModuleDef {
  id: ModuleId
  icon: AppIcon
  // Fase del plan en la que se construye el módulo
  phase: 1 | 2 | 3 | 4
  // Color del icono en la cuadrícula de inicio
  color: ColorKey
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  achievements: { id: 'achievements', icon: IconTrophy, phase: 4, color: 'amber' },
  dashboard: { id: 'dashboard', icon: IconLayoutDashboard, phase: 2, color: 'purple' },
  calendar: { id: 'calendar', icon: IconCalendar, phase: 1, color: 'blue' },
  tasks: { id: 'tasks', icon: IconCheckbox, phase: 1, color: 'teal' },
  habits: { id: 'habits', icon: IconRepeat, phase: 2, color: 'green' },
  goals: { id: 'goals', icon: IconTargetArrow, phase: 3, color: 'pink' },
  notes: { id: 'notes', icon: IconNotebook, phase: 3, color: 'amber' },
  finance: { id: 'finance', icon: IconWallet, phase: 3, color: 'green' },
  gym: { id: 'gym', icon: IconBarbell, phase: 2, color: 'coral' },
  contacts: { id: 'contacts', icon: IconAddressBook, phase: 3, color: 'blue' },
  household: { id: 'household', icon: IconHome, phase: 3, color: 'amber' },
  inventory: { id: 'inventory', icon: IconPackages, phase: 3, color: 'gray' },
  documents: { id: 'documents', icon: IconId, phase: 3, color: 'purple' },
  travel: { id: 'travel', icon: IconPlane, phase: 4, color: 'teal' },
  memories: { id: 'memories', icon: IconPhoto, phase: 4, color: 'pink' },
  library: { id: 'library', icon: IconBooks, phase: 4, color: 'coral' },
  pomodoro: { id: 'pomodoro', icon: IconClockPlay, phase: 2, color: 'coral' },
  subjects: { id: 'subjects', icon: IconSchool, phase: 2, color: 'blue' },
  exams: { id: 'exams', icon: IconCalendarDue, phase: 2, color: 'red' },
  grades: { id: 'grades', icon: IconReportAnalytics, phase: 2, color: 'purple' },
}

// Orden de las apps en la cuadrícula de inicio: día a día, clase, trabajo y resto de la vida
export const APP_ORDER: ModuleId[] = [
  'dashboard',
  'calendar',
  'tasks',
  'pomodoro',
  'habits',
  'goals',
  'notes',
  'achievements',
  'subjects',
  'exams',
  'grades',
  'finance',
  'gym',
  'contacts',
  'household',
  'inventory',
  'documents',
  'travel',
  'memories',
  'library',
]

export function isModuleId(id: string | undefined): id is ModuleId {
  return id !== undefined && id in MODULES
}

// Grupos de la barra lateral: cada app en el sitio donde la buscarías
export type AppGroupId = 'today' | 'growth' | 'study' | 'home' | 'leisure'

export const APP_GROUPS: { id: AppGroupId; apps: ModuleId[] }[] = [
  { id: 'today', apps: ['dashboard', 'calendar', 'tasks', 'pomodoro'] },
  { id: 'growth', apps: ['habits', 'goals', 'gym', 'notes', 'achievements'] },
  { id: 'study', apps: ['subjects', 'exams', 'grades'] },
  { id: 'home', apps: ['finance', 'household', 'inventory', 'documents', 'contacts'] },
  { id: 'leisure', apps: ['travel', 'memories', 'library'] },
]
