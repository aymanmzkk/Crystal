import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlayerPlay } from '@tabler/icons-react'
import { segment } from '../../components/ui'
import { useExercises, useGymRoutines, useSetting, useWorkouts } from '../../db/hooks'
import type { Exercise, GymRoutine, Workout } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'
import { ActiveWorkout } from './ActiveWorkout'
import { GymRoutinePanel } from './GymRoutinePanel'
import { LibraryTab } from './LibraryTab'
import { OverviewTab } from './OverviewTab'
import { ProgressTab } from './ProgressTab'
import { RecordsTab } from './RecordsTab'
import { ScheduleTab } from './ScheduleTab'
import { WorkoutsTab } from './WorkoutsTab'
import { startWorkout } from './actions'
import { DEFAULT_SCHEDULE, GYM_SCHEDULE_KEY, type GymSchedule } from './plan'

export const GYM_TABS = ['overview', 'schedule', 'workouts', 'progress', 'records', 'library'] as const
export type GymTab = (typeof GYM_TABS)[number]

// Lo que comparten todas las pestañas del gimnasio
export interface GymData {
  today: string
  exercises: Exercise[]
  exerciseMap: Map<string, Exercise>
  routines: GymRoutine[]
  // Todos los entrenamientos (también el que está en marcha) y solo los terminados, del más reciente al más antiguo
  workouts: Workout[]
  finished: Workout[]
  schedule: GymSchedule
  start: (routine: GymRoutine | null) => void
  editRoutine: (routineId: string | null) => void
  goTo: (tab: GymTab) => void
}

type Panel = { routineId: string } | { new: true } | null

export default function GymPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<GymTab>('overview')
  const [panel, setPanel] = useState<Panel>(null)
  const exercises = useExercises()
  const routines = useGymRoutines()
  const workouts = useWorkouts()
  const savedSchedule = useSetting<GymSchedule>(GYM_SCHEDULE_KEY)
  const today = toDateKey(useNow())

  const active = workouts?.find((w) => w.finishedAt === null)
  const finished = useMemo(() => (workouts ?? []).filter((w) => w.finishedAt !== null).sort((a, b) => b.startedAt - a.startedAt), [workouts])
  const exerciseMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
  const ready = exercises && routines && workouts && savedSchedule !== undefined

  const data: GymData = {
    today,
    exercises: exercises ?? [],
    exerciseMap,
    routines: routines ?? [],
    workouts: workouts ?? [],
    finished,
    schedule: savedSchedule ?? DEFAULT_SCHEDULE,
    start: (routine) => {
      void startWorkout(routine, workouts ?? [], today, t('gym.freeWorkout'))
      setTab('workouts')
    },
    editRoutine: (routineId) => setPanel(routineId ? { routineId } : { new: true }),
    goTo: setTab,
  }

  const panelRoutine = panel && 'routineId' in panel ? routines?.find((r) => r.id === panel.routineId) : undefined
  const nextOrder = Math.max(0, ...(routines ?? []).map((r) => r.order)) + 1

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-bg/80 px-4 py-2.5 backdrop-blur-xl md:px-6">
        <div role="tablist" aria-label={t('apps.gym')} className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5">
          {GYM_TABS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`${segment(tab === v)} whitespace-nowrap`}>
              {t(`gym.tabs.${v}`)}
            </button>
          ))}
        </div>
        {active && tab !== 'workouts' && (
          <button
            type="button"
            onClick={() => setTab('workouts')}
            className="ml-auto inline-flex h-8 animate-[pop-in_0.3s_var(--ease-out-soft)] items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)] px-3 text-xs font-semibold text-success ring-1 ring-[color-mix(in_srgb,var(--success)_35%,transparent)] ring-inset"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <IconPlayerPlay size={14} aria-hidden />
            {t('gym.continueWorkout', { name: active.name })}
          </button>
        )}
      </div>

      <main key={tab} className="page-in w-full flex-1 p-4 md:p-6" role="tabpanel">
        {!ready && <div className="skeleton h-64" />}
        {ready && tab === 'overview' && <OverviewTab data={data} />}
        {ready && tab === 'schedule' && <ScheduleTab data={data} />}
        {ready && tab === 'workouts' &&
          (active ? <ActiveWorkout key={active.id} workout={active} history={workouts!} exercises={exercises!} routine={routines!.find((r) => r.id === active.routineId)} /> : <WorkoutsTab data={data} />)}
        {ready && tab === 'progress' && <ProgressTab data={data} />}
        {ready && tab === 'records' && <RecordsTab data={data} />}
        {ready && tab === 'library' && <LibraryTab data={data} />}
      </main>

      {panel && exercises && (
        <GymRoutinePanel key={'routineId' in panel ? panel.routineId : 'new'} routine={panelRoutine} exercises={exercises} nextOrder={nextOrder} onClose={() => setPanel(null)} />
      )}
    </div>
  )
}
