import { useTranslation } from 'react-i18next'
import {
  IconBarbell,
  IconCheck,
  IconClock,
  IconFlame,
  IconLock,
  IconNotebook,
  IconPhoto,
  IconPlane,
  IconSchool,
  IconSparkles,
  IconStar,
  IconTarget,
  IconTrophy,
  IconWorld,
} from '@tabler/icons-react'
import { BarChart } from '../../components/BarChart'
import { ProgressRing } from '../../components/ProgressRing'
import { addDaysKey, parseKey } from '../../lib/dates'
import { XP_RULES, XP_SOURCES, type Achievement } from './xp'
import { useXp } from './useXp'

const ICONS: Record<Achievement['icon'], typeof IconCheck> = {
  check: IconCheck,
  flame: IconFlame,
  barbell: IconBarbell,
  clock: IconClock,
  school: IconSchool,
  plane: IconPlane,
  photo: IconPhoto,
  target: IconTarget,
  trophy: IconTrophy,
  notebook: IconNotebook,
  star: IconStar,
  world: IconWorld,
}

export default function AchievementsPage() {
  const { t, i18n } = useTranslation()
  const xp = useXp()
  if (!xp) return <div className="skeleton m-4 h-64 md:m-6" />

  const { total, level, entries, today } = xp
  const unlocked = xp.achievements.filter((a) => a.value >= a.goal)
  const short = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
  const long = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric' })
  const days = Array.from({ length: 14 }, (_, i) => addDaysKey(today, i - 13))
  const perDay = days.map((d) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.amount, 0))
  const bySource = XP_SOURCES.map((s) => ({ s, xp: entries.filter((e) => e.source === s).reduce((sum, e) => sum + e.amount, 0) })).filter((x) => x.xp > 0)
  const maxSource = Math.max(1, ...bySource.map((x) => x.xp))
  const week = perDay.slice(-7).reduce((a, b) => a + b, 0)
  // Los que están más cerca de conseguirse, primero
  const locked = xp.achievements.filter((a) => a.value < a.goal).sort((a, b) => b.value / b.goal - a.value / a.goal)

  return (
    <main className="stagger grid w-full flex-1 grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-12">
      {/* Nivel */}
      <section className="hero-glow card flex items-center gap-5 p-5 lg:col-span-5">
        <div className="relative">
          <ProgressRing value={level.into / level.needed} size={120} label={t('achievements.level', { level: level.level })} />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{t('achievements.yourLevel')}</p>
          <h2 className="text-3xl font-semibold tracking-tight">{t('achievements.level', { level: level.level })}</h2>
          <p className="mt-1 text-sm text-fg-2 tabular-nums">{t('achievements.toNext', { xp: level.needed - level.into, level: level.level + 1 })}</p>
          <p className="mt-2 text-xs text-fg-3 tabular-nums">{t('achievements.total', { xp: total })}</p>
        </div>
      </section>

      <section className="card p-5 lg:col-span-4">
        <h2 className="mb-1 text-sm font-semibold">{t('achievements.last14')}</h2>
        <p className="mb-3 text-xs text-fg-3">{t('achievements.thisWeek', { xp: week })}</p>
        <BarChart
          title={t('achievements.xpPerDay')}
          height={96}
          bars={days.map((d, i) => ({ key: d, label: short.format(parseKey(d)), fullLabel: long.format(parseKey(d)), value: perDay[i], valueLabel: `${perDay[i]} XP`, highlight: d === today }))}
        />
      </section>

      <section className="card p-5 lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold">{t('achievements.bySource')}</h2>
        {bySource.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-3">{t('achievements.noXp')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {bySource.map(({ s, xp: amount }) => (
              <li key={s}>
                <span className="mb-1 flex justify-between text-sm">
                  <span className="text-fg-2">{t(`achievements.sources.${s}`)}</span>
                  <span className="font-medium tabular-nums">{amount}</span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(amount / maxSource) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Logros */}
      <section className="lg:col-span-12">
        <h2 className="eyebrow mb-3">
          {t('achievements.title')} · {unlocked.length}/{xp.achievements.length}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...unlocked, ...locked].map((a) => {
            const done = a.value >= a.goal
            const Icon = ICONS[a.icon]
            return (
              <li key={a.id} className={`card flex items-start gap-3 p-4 transition-opacity ${done ? '' : 'opacity-75'}`}>
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    done ? 'bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-warning ring-1 ring-[color-mix(in_srgb,var(--warning)_35%,transparent)]' : 'bg-surface-3 text-fg-3'
                  }`}
                >
                  {done ? <Icon size={22} aria-hidden /> : <IconLock size={20} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{t(`achievements.list.${a.id}.name`)}</h3>
                  <p className="text-xs text-fg-3">{t(`achievements.list.${a.id}.desc`)}</p>
                  {!done && (
                    <span className="mt-2 flex items-center gap-2 text-xs text-fg-3 tabular-nums">
                      <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (a.value / a.goal) * 100)}%` }} />
                      </span>
                      {Math.min(a.value, a.goal)}/{a.goal}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Cómo se ganan los puntos */}
      <section className="card p-5 lg:col-span-12">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <IconSparkles size={17} className="text-fg-3" aria-hidden />
          {t('achievements.howTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(XP_RULES) as (keyof typeof XP_RULES)[]).map((k) => (
            <li key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
              <span className="text-fg-2">{t(`achievements.rules.${k}`)}</span>
              <span className="font-semibold text-accent tabular-nums">+{XP_RULES[k]}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
