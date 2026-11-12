import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBarbell,
  IconCalendarWeek,
  IconCheck,
  IconFlame,
  IconHistory,
  IconMoonStars,
  IconPlayerPlay,
  IconPlus,
  IconTrophy,
  IconZzz,
} from '@tabler/icons-react'
import { ProgressRing } from '../../components/ProgressRing'
import { btn, btnPrimary, pill } from '../../components/ui'
import { addDays, addDaysKey, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import { formatMinutes, formatNumber } from '../../lib/format'
import type { GymData } from './GymPage'
import { planFor, plannedPerWeek, targetOf } from './plan'
import { previousSession, sessionsPerWeek, weekStreak, workoutVolume } from './stats'

export function Card({ title, icon, action, children, className = '' }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex min-w-0 flex-col p-4 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-fg-3" aria-hidden>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </header>
      {children}
    </section>
  )
}

// Últimos lunes (de más antiguo a la semana actual)
export function lastMondays(today: string, weeks: number): string[] {
  const monday = startOfWeek(parseKey(today))
  return Array.from({ length: weeks }, (_, i) => toDateKey(addDays(monday, (i - weeks + 1) * 7)))
}

export function OverviewTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { today, schedule, routines, finished, exerciseMap } = data
  const plan = planFor(schedule, today)
  const routine = routines.find((r) => r.id === plan.routineId)
  const doneToday = finished.find((w) => w.date === today)
  const monday = toDateKey(startOfWeek(parseKey(today)))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i))
  const thisWeek = finished.filter((w) => w.date >= monday)
  const planned = plannedPerWeek(schedule)
  const counts = sessionsPerWeek(finished, lastMondays(today, 26))
  const streak = weekStreak(counts)
  const weekVolume = thisWeek.reduce((s, w) => s + workoutVolume(w), 0)
  const dayName = new Intl.DateTimeFormat(lang, { weekday: 'short' })
  const longDay = new Intl.DateTimeFormat(lang, { weekday: 'long' })
  const date = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' })

  // Duración aproximada: unos 45 s por serie más el descanso
  const estimate = routine ? routine.exerciseIds.reduce((s, id) => s + targetOf(routine, id).sets * (45 + targetOf(routine, id).restSec), 0) / 60 : 0

  return (
    <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
      {/* Entrenamiento de hoy */}
      <section className="hero-glow card relative overflow-hidden p-5 md:col-span-6 lg:col-span-8">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase first-letter:uppercase">
          {longDay.format(parseKey(today))} · {t('gym.today')}
        </p>
        {doneToday ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-success text-white">
              <IconCheck size={24} stroke={2.5} aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t('gym.doneToday', { name: doneToday.name })}</h2>
              <p className="text-sm text-fg-2">
                {formatMinutes((doneToday.finishedAt! - doneToday.startedAt) / 60_000)} · {t('gym.setsDone', { count: doneToday.sets.length })} · {Math.round(workoutVolume(doneToday))} kg
              </p>
            </div>
          </div>
        ) : plan.split === 'rest' ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-fg-2">
              <IconZzz size={22} aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t('gym.restDay')}</h2>
              <p className="text-sm text-fg-2">{t('gym.restHint')}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {routine?.name ?? t(`gym.splits.${plan.split}`)}
              {routine && <span className={`ml-2 align-middle ${pill('accent')}`}>{t(`gym.splits.${plan.split}`)}</span>}
            </h2>
            {routine ? (
              <>
                <p className="mt-1 text-sm text-fg-2">
                  {t('gym.exercisesCount', { count: routine.exerciseIds.length })} · ~{formatMinutes(estimate)}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {routine.exerciseIds.slice(0, 8).map((id) => (
                    <li key={id} className="rounded-full border border-line bg-surface/70 px-2.5 py-0.5 text-xs">
                      {exerciseMap.get(id)?.name ?? '—'} <span className="text-fg-3">{targetOf(routine, id).sets}×{targetOf(routine, id).reps}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-fg-2">{t('gym.noRoutineForDay')}</p>
            )}
          </>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {!doneToday && plan.split !== 'rest' && (
            <button type="button" onClick={() => data.start(routine ?? null)} className={`${btnPrimary} h-10 px-5`}>
              <IconPlayerPlay size={18} aria-hidden />
              {routine ? t('gym.startToday') : t('gym.startFree')}
            </button>
          )}
          {(doneToday || plan.split === 'rest' || routine) && (
            <button type="button" onClick={() => data.start(null)} className={`${btn} h-10`}>
              <IconBarbell size={18} aria-hidden />
              {t('gym.startFree')}
            </button>
          )}
          {!routine && plan.split !== 'rest' && (
            <button type="button" onClick={() => data.goTo('schedule')} className={`${btn} h-10`}>
              <IconCalendarWeek size={18} aria-hidden />
              {t('gym.assignRoutine')}
            </button>
          )}
        </div>
      </section>

      {/* Semana: anillo de sesiones hechas / planificadas */}
      <section className="card flex items-center gap-5 p-5 md:col-span-6 lg:col-span-4 lg:flex-col lg:justify-center lg:text-center">
        <ProgressRing value={planned ? Math.min(1, thisWeek.length / planned) : 0} size={108} label={t('gym.thisWeek')} />
        <div>
          <h2 className="text-sm font-semibold">{t('gym.thisWeek')}</h2>
          <p className="mt-0.5 text-sm text-fg-2">{t('gym.weekGoal', { done: thisWeek.length, planned })}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning">
            <IconFlame size={15} aria-hidden />
            {t('gym.streak', { count: streak })}
          </p>
        </div>
      </section>

      {/* Plan de la semana */}
      <Card
        title={t('gym.weekPlan')}
        icon={<IconCalendarWeek size={17} />}
        className="md:col-span-6 lg:col-span-12"
        action={
          <button type="button" onClick={() => data.goTo('schedule')} className="text-xs text-fg-3 hover:text-fg">
            {t('gym.editPlan')}
          </button>
        }
      >
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((d) => {
            const p = planFor(schedule, d)
            const r = routines.find((x) => x.id === p.routineId)
            const done = finished.some((w) => w.date === d)
            const isToday = d === today
            const missed = !done && d < today && p.split !== 'rest'
            return (
              <li
                key={d}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition-colors ${
                  isToday ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]' : 'border-line bg-surface-2/40'
                }`}
              >
                <span className={`text-[0.6875rem] font-semibold uppercase ${isToday ? 'text-accent' : 'text-fg-3'}`}>{dayName.format(parseKey(d))}</span>
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    done ? 'bg-success text-white' : p.split === 'rest' ? 'bg-surface-3 text-fg-3' : missed ? 'border-2 border-dashed border-line-strong text-fg-3' : 'border-2 border-accent text-accent'
                  }`}
                  aria-hidden
                >
                  {done ? <IconCheck size={16} stroke={3} /> : p.split === 'rest' ? <IconMoonStars size={15} /> : <IconBarbell size={15} />}
                </span>
                <span className="w-full truncate text-[0.6875rem] font-medium">{t(`gym.splits.${p.split}`)}</span>
                <span className="hidden w-full truncate text-[0.625rem] text-fg-3 sm:block">{r?.name ?? ''}</span>
                <span className="sr-only">{done ? t('gym.done') : missed ? t('gym.missed') : ''}</span>
              </li>
            )
          })}
        </ol>
      </Card>

      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 md:col-span-6 lg:col-span-4">
        {[
          { label: t('gym.weekVolume'), value: `${formatNumber(weekVolume / 1000, lang)} t` },
          { label: t('gym.total'), value: String(finished.length) },
          { label: t('gym.avgDuration'), value: finished.length ? formatMinutes(finished.slice(0, 10).reduce((s, w) => s + (w.finishedAt! - w.startedAt), 0) / Math.min(10, finished.length) / 60_000) : '—' },
          { label: t('gym.lastWorkout'), value: finished[0] ? date.format(parseKey(finished[0].date)) : '—' },
        ].map((tile) => (
          <div key={tile.label} className="card px-3.5 py-3">
            <div className="text-xs text-fg-3">{tile.label}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums first-letter:uppercase">{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Actividad reciente, comparada con la sesión anterior */}
      <Card
        title={t('gym.recent')}
        icon={<IconHistory size={17} />}
        className="md:col-span-6 lg:col-span-5"
        action={
          <button type="button" onClick={() => data.goTo('workouts')} className="text-xs text-fg-3 hover:text-fg">
            {t('common.seeAll')}
          </button>
        }
      >
        {finished.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-3">{t('gym.noHistory')}</p>
        ) : (
          <ul className="-mx-1 flex flex-col">
            {finished.slice(0, 4).map((w) => {
              const prev = previousSession(finished, w)
              const vol = workoutVolume(w)
              const delta = prev && workoutVolume(prev) > 0 ? (vol - workoutVolume(prev)) / workoutVolume(prev) : null
              return (
                <li key={w.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg-2">
                    <IconBarbell size={17} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{w.name}</span>
                    <span className="block text-xs text-fg-3 first-letter:uppercase">
                      {date.format(parseKey(w.date))} · {formatMinutes((w.finishedAt! - w.startedAt) / 60_000)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums">{Math.round(vol)} kg</span>
                    {delta !== null && (
                      <span className={`inline-flex items-center text-xs font-medium tabular-nums ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
                        {delta >= 0 ? <IconArrowUpRight size={13} aria-hidden /> : <IconArrowDownRight size={13} aria-hidden />}
                        {Math.abs(Math.round(delta * 100))} %
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Acciones rápidas */}
      <Card title={t('home.quickActions')} icon={<IconPlus size={17} />} className="md:col-span-6 lg:col-span-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: IconBarbell, label: t('gym.quick.free'), run: () => data.start(null) },
            { icon: IconPlus, label: t('gym.quick.template'), run: () => data.editRoutine(null) },
            { icon: IconTrophy, label: t('gym.quick.records'), run: () => data.goTo('records') },
            { icon: IconCalendarWeek, label: t('gym.quick.plan'), run: () => data.goTo('schedule') },
          ].map(({ icon: Icon, label, run }) => (
            <button
              key={label}
              type="button"
              onClick={run}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2/50 px-1 py-3 text-xs font-medium text-fg-2 transition-[border-color,background-color,transform,color] duration-150 hover:border-line-strong hover:bg-surface-2 hover:text-fg active:scale-95"
            >
              <Icon size={20} stroke={1.75} className="text-fg-3 transition-colors group-hover:text-accent" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
