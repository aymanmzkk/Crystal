import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconActivity, IconCalendarStats, IconChartLine, IconChevronDown, IconHistory, IconPlus, IconScale, IconTarget, IconX } from '@tabler/icons-react'
import { BarChart } from '../../components/BarChart'
import { LineChart } from '../../components/LineChart'
import { ProgressRing } from '../../components/ProgressRing'
import { btnPrimary, field } from '../../components/ui'
import { useMeasurements } from '../../db/hooks'
import { createRecord, moveToTrash } from '../../db/repo'
import type { MuscleGroup } from '../../db/types'
import { addDaysKey, parseKey, toDateKey } from '../../lib/dates'
import { formatNumber } from '../../lib/format'
import { parseAmount } from '../finance/money'
import { MUSCLES } from './ExercisePicker'
import type { GymData } from './GymPage'
import { Card, lastMondays } from './OverviewTab'
import { plannedPerWeek } from './plan'
import { bestSet, estimate1RM, formatSets, sessionsPerWeek, weekStreak, workoutVolume } from './stats'

export function ProgressTab({ data }: { data: GymData }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { finished, exercises, exerciseMap, schedule, today } = data
  const used = exercises.filter((e) => finished.some((w) => w.sets.some((s) => s.exerciseId === e.id)))
  const [picked, setPicked] = useState('')
  const exerciseId = used.some((e) => e.id === picked) ? picked : (used[0]?.id ?? '')
  const short = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })

  // Actividad: entrenamientos y volumen de las últimas 12 semanas
  const mondays = lastMondays(today, 12)
  const counts = sessionsPerWeek(finished, mondays)
  const planned = Math.max(1, plannedPerWeek(schedule))
  // Constancia: semanas completas (sin contar la actual) en las que se cumplió el plan
  const past = counts.slice(0, -1)
  const consistency = past.length ? past.filter((c) => c >= planned).length / past.length : 0
  const weekVolume = mondays.map((from, i) => finished.filter((w) => w.date >= from && (!mondays[i + 1] || w.date < mondays[i + 1])).reduce((s, w) => s + workoutVolume(w), 0))

  // Series por grupo muscular en los últimos 30 días
  const since = addDaysKey(today, -30)
  const muscleSets = new Map<MuscleGroup, number>()
  for (const w of finished.filter((x) => x.date >= since)) for (const s of w.sets) {
    const m = exerciseMap.get(s.exerciseId)?.muscle ?? 'other'
    muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1)
  }
  const maxMuscle = Math.max(1, ...muscleSets.values())

  // Progreso del ejercicio elegido: mejor serie de cada sesión (las últimas 16)
  const sessions = finished
    .map((w) => ({ w, sets: w.sets.filter((s) => s.exerciseId === exerciseId), best: bestSet(w.sets.filter((s) => s.exerciseId === exerciseId)) }))
    .filter((x) => x.best)
    .reverse()
    .slice(-16)
  const bodyweight = sessions.length > 0 && sessions.every((x) => x.best!.weight === 0)
  const values = sessions.map((x) => (bodyweight ? x.best!.reps : estimate1RM(x.best!.weight, x.best!.reps)))
  const unit = bodyweight ? t('gym.repsUnit') : 'kg'
  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0

  if (finished.length === 0)
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-2 px-6 py-12 text-center">
        <IconChartLine size={30} stroke={1.5} className="text-fg-3" aria-hidden />
        <p className="text-fg-2">{t('gym.noHistory')}</p>
        <BodySection />
      </div>
    )

  return (
    <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Card
        title={t('gym.exerciseProgress')}
        icon={<IconChartLine size={17} />}
        className="lg:col-span-8"
        action={
          <select value={exerciseId} onChange={(e) => setPicked(e.target.value)} aria-label={t('gym.exercise')} className={`${field} h-8 max-w-52 text-xs`}>
            {used.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: bodyweight ? t('gym.bestReps') : t('gym.best1rm'), value: `${formatNumber(Math.max(0, ...values), lang)} ${unit}` },
            { label: t('gym.lastSession'), value: `${formatNumber(last, lang)} ${unit}` },
            { label: t('gym.change'), value: first > 0 ? `${last >= first ? '+' : ''}${Math.round(((last - first) / first) * 100)} %` : '—', tone: last >= first ? 'text-success' : 'text-danger' },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl bg-surface-2/60 px-3 py-2">
              <div className="text-xs text-fg-3">{tile.label}</div>
              <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tile.tone ?? ''}`}>{tile.value}</div>
            </div>
          ))}
        </div>
        <LineChart
          title={bodyweight ? t('gym.progressChartReps') : t('gym.progressChart')}
          unit={unit}
          height={180}
          points={sessions.map((x, i) => ({
            key: x.w.id,
            label: short.format(parseKey(x.w.date)),
            fullLabel: bodyweight ? short.format(parseKey(x.w.date)) : `${short.format(parseKey(x.w.date))} · ${x.best!.weight} kg × ${x.best!.reps}`,
            value: values[i],
            valueLabel: `${formatNumber(values[i], lang)} ${unit}`,
          }))}
        />
        <p className="mt-2 text-xs text-fg-3">{t('gym.progressHint')}</p>
      </Card>

      <Card title={t('gym.consistency')} icon={<IconTarget size={17} />} className="lg:col-span-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={consistency} size={96} stroke={8} label={t('gym.consistency')} />
          <div className="text-sm">
            <p className="text-fg-2">{t('gym.consistencyHint', { planned })}</p>
            <p className="mt-2 font-semibold">{t('gym.streak', { count: weekStreak(counts) })}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1" aria-hidden>
          {counts.map((c, i) => (
            <span
              key={mondays[i]}
              title={`${short.format(parseKey(mondays[i]))}: ${c}`}
              className={`h-6 flex-1 rounded-[4px] ${c >= planned ? 'bg-success' : c > 0 ? 'bg-[color-mix(in_srgb,var(--success)_45%,var(--surface-3))]' : 'bg-surface-3'}`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-fg-3">{t('gym.last12Weeks')}</p>
      </Card>

      <Card title={t('gym.weeklyActivity')} icon={<IconCalendarStats size={17} />} className="lg:col-span-6">
        <BarChart
          title={t('gym.sessionsPerWeek')}
          height={110}
          bars={mondays.map((m, i) => ({
            key: m,
            label: i % 2 === 1 || i === mondays.length - 1 ? short.format(parseKey(m)) : '',
            fullLabel: t('gym.weekOf', { date: short.format(parseKey(m)) }),
            value: counts[i],
            valueLabel: String(counts[i]),
            highlight: i === mondays.length - 1,
          }))}
        />
      </Card>

      <Card title={t('gym.volumeChart')} icon={<IconActivity size={17} />} className="lg:col-span-6">
        <BarChart
          title={t('gym.volumePerWeek')}
          height={110}
          bars={mondays.map((m, i) => ({
            key: m,
            label: i % 2 === 1 || i === mondays.length - 1 ? short.format(parseKey(m)) : '',
            fullLabel: t('gym.weekOf', { date: short.format(parseKey(m)) }),
            value: weekVolume[i],
            valueLabel: `${Math.round(weekVolume[i])} kg`,
            highlight: i === mondays.length - 1,
          }))}
        />
      </Card>

      <Card title={t('gym.muscleSplit')} icon={<IconActivity size={17} />} className="lg:col-span-5">
        {muscleSets.size === 0 ? (
          <p className="py-4 text-center text-sm text-fg-3">{t('gym.noRecent')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {MUSCLES.filter((m) => muscleSets.has(m)).map((m) => (
              <li key={m}>
                <span className="mb-1 flex justify-between text-sm">
                  <span className="text-fg-2">{t(`gym.muscles.${m}`)}</span>
                  <span className="font-medium tabular-nums">{t('gym.setsCount', { count: muscleSets.get(m) })}</span>
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${((muscleSets.get(m) ?? 0) / maxMuscle) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-fg-3">{t('gym.last30Days')}</p>
      </Card>

      <Card title={t('gym.exerciseHistory')} icon={<IconHistory size={17} />} className="lg:col-span-7">
        <ul className="-mx-1 flex max-h-72 flex-col overflow-y-auto">
          {[...sessions].reverse().map((x) => (
            <li key={x.w.id} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm odd:bg-surface-2/40">
              <span className="shrink-0 text-fg-3">{short.format(parseKey(x.w.date))}</span>
              <span className="min-w-0 truncate text-right text-fg-2">{formatSets(x.sets.filter((s) => s.done))}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-fg-3">{exerciseMap.get(exerciseId)?.name}</p>
      </Card>

      <div className="lg:col-span-12">
        <BodySection />
      </div>
    </div>
  )
}

// Peso y cintura: opcional y plegado por defecto, para que no sea lo principal
function BodySection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const measurements = useMeasurements()
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const list = [...(measurements ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const withWeight = list.filter((m) => m.weight !== null).slice(-20)
  const short = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })
  const latest = withWeight[withWeight.length - 1]

  async function add(e: FormEvent) {
    e.preventDefault()
    const w = parseAmount(weight)
    const c = parseAmount(waist)
    if (w === null && c === null) return
    await createRecord('measurements', { date: toDateKey(new Date()), weight: w, waist: c, notes: '' })
    setWeight('')
    setWaist('')
  }

  return (
    <section className="card w-full text-left">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3">
        <IconScale size={17} className="text-fg-3" aria-hidden />
        <span className="text-sm font-semibold">{t('gym.body')}</span>
        <span className="text-xs text-fg-3">{t('gym.optional')}</span>
        {latest && <span className="ml-auto text-sm font-medium tabular-nums">{formatNumber(latest.weight!, lang)} kg</span>}
        <IconChevronDown size={17} className={`text-fg-3 transition-transform ${open ? 'rotate-180' : ''} ${latest ? '' : 'ml-auto'}`} aria-hidden />
      </button>
      {open && (
        <div className="grid animate-[pop-in_0.2s_var(--ease-out-soft)] grid-cols-1 gap-4 border-t border-line p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            {withWeight.length > 1 ? (
              <LineChart
                title={t('gym.weightChart')}
                unit="kg"
                height={140}
                color="var(--accent-2)"
                points={withWeight.map((m) => ({ key: m.id, label: short.format(parseKey(m.date)), fullLabel: short.format(parseKey(m.date)), value: m.weight!, valueLabel: `${formatNumber(m.weight!, lang)} kg` }))}
              />
            ) : (
              <p className="py-6 text-center text-sm text-fg-3">{t('gym.bodyEmpty')}</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <form onSubmit={(e) => void add(e)} className="flex flex-wrap gap-2">
              <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder={t('gym.weightKg')} aria-label={t('gym.weightKg')} className={`${field} w-24 flex-1`} />
              <input value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal" placeholder={t('gym.waistCm')} aria-label={t('gym.waistCm')} className={`${field} w-24 flex-1`} />
              <button type="submit" className={btnPrimary} aria-label={t('gym.addMeasurement')}>
                <IconPlus size={17} aria-hidden />
              </button>
            </form>
            <ul className="flex max-h-40 flex-col overflow-y-auto text-sm">
              {[...list].reverse().slice(0, 10).map((m) => (
                <li key={m.id} className="group flex items-center gap-2 border-b border-line py-1.5 last:border-0">
                  <span className="text-fg-3">{short.format(parseKey(m.date))}</span>
                  <span className="ml-auto tabular-nums">{[m.weight !== null && `${formatNumber(m.weight, lang)} kg`, m.waist !== null && `${formatNumber(m.waist, lang)} cm`].filter(Boolean).join(' · ')}</span>
                  <button type="button" onClick={() => void moveToTrash('measurements', m.id)} aria-label={t('calendar.form.delete')} className="text-fg-3 hover:text-danger md:opacity-0 md:group-hover:opacity-100 focus:opacity-100">
                    <IconX size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
