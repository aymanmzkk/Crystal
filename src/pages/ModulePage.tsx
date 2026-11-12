import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconArrowLeft } from '@tabler/icons-react'
import { TopBar } from '../components/TopBar'
import { MODULES, isModuleId, type ModuleId } from '../modules/registry'

// Módulos ya construidos. Se cargan por separado (lazy) para que la app abra rápido.
const MODULE_PAGES: Record<ModuleId, LazyExoticComponent<ComponentType>> = {
  calendar: lazy(() => import('../modules/calendar/CalendarPage')),
  achievements: lazy(() => import('../modules/achievements/AchievementsPage')),
  tasks: lazy(() => import('../modules/tasks/TasksPage')),
  habits: lazy(() => import('../modules/habits/HabitsPage')),
  pomodoro: lazy(() => import('../modules/pomodoro/PomodoroPage')),
  subjects: lazy(() => import('../modules/school/SubjectsPage')),
  exams: lazy(() => import('../modules/school/ExamsPage')),
  grades: lazy(() => import('../modules/school/GradesPage')),
  gym: lazy(() => import('../modules/gym/GymPage')),
  dashboard: lazy(() => import('../modules/dashboard/DashboardPage')),
  finance: lazy(() => import('../modules/finance/FinancePage')),
  contacts: lazy(() => import('../modules/contacts/ContactsPage')),
  household: lazy(() => import('../modules/household/HouseholdPage')),
  inventory: lazy(() => import('../modules/inventory/InventoryPage')),
  documents: lazy(() => import('../modules/inventory/DocumentsPage')),
  notes: lazy(() => import('../modules/notes/NotesPage')),
  goals: lazy(() => import('../modules/goals/GoalsPage')),
  travel: lazy(() => import('../modules/travel/TravelPage')),
  memories: lazy(() => import('../modules/memories/MemoriesPage')),
  library: lazy(() => import('../modules/library/LibraryPage')),
}

// Mientras se descarga el código de una app: bloques grises con la forma de la página
function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6" aria-busy="true">
      <div className="skeleton h-9 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  )
}

export function ModulePage() {
  const { t } = useTranslation()
  const moduleId = useParams().module

  if (!isModuleId(moduleId)) return <Navigate to="/" replace />

  const module = MODULES[moduleId]
  const Page = MODULE_PAGES[moduleId]

  if (Page) {
    return (
      <>
        <TopBar title={t(`apps.${module.id}`)} module={module} />
        <Suspense fallback={<PageSkeleton />}>
          <Page />
        </Suspense>
      </>
    )
  }

  const Icon = module.icon
  return (
    <>
      <TopBar title={t(`apps.${module.id}`)} module={module} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-app border border-line-strong bg-surface-2">
            <Icon size={28} stroke={1.5} aria-hidden />
          </span>
          <h1 className="text-base font-semibold">{t(`apps.${module.id}`)}</h1>
          <p className="mt-1 text-fg-2">
            {t('module.building')} · {module.phase === 1 ? t('module.phaseNow') : t('module.phase', { phase: module.phase })}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-app border border-line-strong px-3 transition-colors hover:bg-surface-2"
          >
            <IconArrowLeft size={18} aria-hidden />
            {t('module.back')}
          </Link>
        </div>
      </main>
    </>
  )
}
