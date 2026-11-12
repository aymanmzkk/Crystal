import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconApps, IconArchive, IconBulb, IconCalendarTime, IconChartLine, IconFiles, IconSortDescending, IconTrash } from '@tabler/icons-react'
import { db } from '../../db/db'
import { useStorageSelection } from '../../store/storageSelection'
import { LineChart } from '../../components/LineChart'
import { ProgressRing } from '../../components/ProgressRing'
import { btn, btnPrimary, pill } from '../../components/ui'
import type { StorageUsage } from '../../hooks/useStorageUsage'
import { parseKey } from '../../lib/dates'
import { formatBytes } from '../../lib/files'
import { CATEGORIES, alertLevel, readOpened, recommend } from '../../lib/storage'
import { useStoragePrefs } from '../../store/storagePrefs'
import { CATEGORY_ICON, Card, FilePreview, LEVEL_TONE, SizeBar, useModuleLabel } from './shared'
import type { StorageTab } from './StoragePage'

const LEVEL_PILL = { 0: 'success', 70: 'accent', 85: 'warning', 95: 'danger' } as const

export function OverviewTab({ usage, goTo }: { usage: StorageUsage; goTo: (tab: StorageTab) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const bytes = (n: number) => formatBytes(n, lang)
  const moduleLabel = useModuleLabel()
  const { limit, history } = useStoragePrefs()
  const { summary, files, estimate, used } = usage
  const level = alertLevel(used, limit)
  const local = files.filter((f) => f.local)
  const largest = [...local].sort((a, b) => b.size - a.size).slice(0, 6)
  const oldest = [...local].sort((a, b) => (a.date ?? new Date(a.createdAt).toISOString()).localeCompare(b.date ?? new Date(b.createdAt).toISOString())).slice(0, 6)
  const maxCategory = Math.max(1, ...CATEGORIES.map((c) => summary.byCategory[c].bytes))
  const maxModule = Math.max(1, ...summary.byModule.map((m) => m.bytes))
  const short = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })
  const dateFormat = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const fileDate = (f: (typeof files)[number]) => dateFormat.format(f.date ? parseKey(f.date) : new Date(f.createdAt))
  const selectFiles = useStorageSelection((s) => s.set)
  const trips = useLiveQuery(() => db.trips.toArray())
  const tips = recommend(files, { now: Date.now(), tripEnds: new Map((trips ?? []).map((trip) => [trip.id, trip.end])), openedAt: readOpened() })

  return (
    <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Espacio usado frente al límite */}
      <section className="hero-glow card flex flex-col gap-5 p-5 sm:flex-row sm:items-center lg:col-span-7">
        <ProgressRing value={Math.min(1, used / limit)} size={128} stroke={10} label={t('storage.used')} tone={LEVEL_TONE[level]} />
        <div className="min-w-0 flex-1">
          <span className={pill(LEVEL_PILL[level])}>{t(`storage.levels.l${level}`)}</span>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {bytes(used)} <span className="text-base font-normal text-fg-3">/ {bytes(limit)}</span>
          </p>
          <p className="mt-1 text-sm text-fg-2">
            {t('storage.breakdown', { files: bytes(summary.localBytes), rest: bytes(Math.max(0, used - summary.localBytes)) })}
          </p>
          {estimate && estimate.quota > 0 && <p className="mt-1 text-xs text-fg-3">{t('storage.quota', { quota: bytes(estimate.quota) })}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => goTo('files')} className={btnPrimary}>
              <IconArchive size={17} aria-hidden />
              {t('storage.freeSpace')}
            </button>
            {summary.releasableBytes > 0 && (
              <button type="button" onClick={() => goTo('archived')} className={btn}>
                {t('storage.canFree', { size: bytes(summary.releasableBytes) })}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 lg:col-span-5">
        {[
          { label: t('storage.stats.files'), value: String(summary.localCount) },
          { label: t('storage.stats.archived'), value: String(summary.archivedVerified + summary.archivedPending) },
          { label: t('storage.stats.outside'), value: bytes(summary.releasedBytes), sub: t('storage.stats.outsideHint', { count: summary.released }) },
          { label: t('storage.stats.pending'), value: String(summary.archivedPending), tone: summary.archivedPending ? 'text-warning' : '' },
        ].map((tile) => (
          <div key={tile.label} className="card px-4 py-3">
            <div className="text-xs text-fg-3">{tile.label}</div>
            <div className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${tile.tone ?? ''}`}>{tile.value}</div>
            {tile.sub && <div className="text-xs text-fg-3">{tile.sub}</div>}
          </div>
        ))}
      </div>

      {/* Recomendaciones: solo proponen, nunca archivan ni borran nada solas */}
      <Card title={t('storage.tips.title')} icon={<IconBulb size={17} />} className="lg:col-span-12">
        {tips.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-3">{t('storage.tips.empty')}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {tips.map((tip) => (
              <li key={tip.rule} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{t(`storage.tips.rules.${tip.rule}`)}</span>
                  <span className="block text-xs text-fg-3">{t('storage.tips.count', { count: tip.ids.length, size: bytes(tip.bytes) })}</span>
                </span>
                {tip.rule === 'trash' ? (
                  <Link to="/trash" className={btn}>
                    <IconTrash size={16} aria-hidden />
                    {t('trash.title')}
                  </Link>
                ) : (
                  <button type="button" onClick={() => (selectFiles(tip.ids), goTo('files'))} className={btn}>
                    {t('storage.tips.select')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Por tipo */}
      <Card title={t('storage.byType')} icon={<IconFiles size={17} />} className="lg:col-span-6">
        <ul className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c]
            const v = summary.byCategory[c]
            return (
              <li key={c} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex justify-between gap-2 text-sm">
                    <span>
                      {t(`storage.categories.${c}`)} <span className="text-xs text-fg-3">· {v.count}</span>
                    </span>
                    <span className="font-medium tabular-nums">{bytes(v.bytes)}</span>
                  </span>
                  <SizeBar value={v.bytes} max={maxCategory} />
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Por app */}
      <Card title={t('storage.byModule')} icon={<IconApps size={17} />} className="lg:col-span-6">
        {summary.byModule.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-3">{t('storage.noFiles')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.byModule.map((m) => (
              <li key={m.module}>
                <span className="mb-1 flex justify-between gap-2 text-sm">
                  <span>
                    {moduleLabel(m.module)} <span className="text-xs text-fg-3">· {m.count}</span>
                  </span>
                  <span className="font-medium tabular-nums">{bytes(m.bytes)}</span>
                </span>
                <SizeBar value={m.bytes} max={maxModule} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Más pesados y más antiguos */}
      {[
        { key: 'largest', title: t('storage.largest'), icon: <IconSortDescending size={17} />, list: largest },
        { key: 'oldest', title: t('storage.oldest'), icon: <IconCalendarTime size={17} />, list: oldest },
      ].map(({ key, title, icon, list }) => (
        <Card
          key={key}
          title={title}
          icon={icon}
          className="lg:col-span-6"
          action={
            <button type="button" onClick={() => goTo('files')} className="text-xs text-fg-3 hover:text-fg">
              {t('common.seeAll')}
            </button>
          }
        >
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-3">{t('storage.noFiles')}</p>
          ) : (
            <ul className="-mx-1 flex flex-col">
              {list.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                  <FilePreview file={f} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{f.comment || f.name}</span>
                    <span className="block text-xs text-fg-3">
                      {moduleLabel(f.module)} · {fileDate(f)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{bytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      {/* Evolución */}
      <Card title={t('storage.evolution')} icon={<IconChartLine size={17} />} className="lg:col-span-12">
        {history.length > 1 ? (
          <LineChart
            title={t('storage.evolutionChart')}
            unit="MB"
            height={160}
            points={history.map((h) => ({
              key: h.date,
              label: short.format(parseKey(h.date)),
              fullLabel: short.format(parseKey(h.date)),
              value: Math.round((h.bytes / 1024 / 1024) * 10) / 10,
              valueLabel: bytes(h.bytes),
            }))}
          />
        ) : (
          <p className="py-6 text-center text-sm text-fg-3">{t('storage.evolutionEmpty')}</p>
        )}
      </Card>
    </div>
  )
}
