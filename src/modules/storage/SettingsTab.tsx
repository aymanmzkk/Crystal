import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBell, IconGauge, IconShieldCheck, IconShieldExclamation } from '@tabler/icons-react'
import { field, toggleChip } from '../../components/ui'
import type { StorageUsage } from '../../hooks/useStorageUsage'
import { formatBytes } from '../../lib/files'
import { ALERT_LEVELS, LIMIT_PRESETS, MB } from '../../lib/storage'
import { useStoragePrefs } from '../../store/storagePrefs'
import { Card } from './shared'
import { DestinationsCard } from './DestinationsCard'

export function SettingsTab({ usage }: { usage: StorageUsage }) {
  const { t, i18n } = useTranslation()
  const { limit, setLimit, alerts, setAlerts } = useStoragePrefs()
  const custom = !LIMIT_PRESETS.includes(limit)
  const [customMb, setCustomMb] = useState(custom ? String(Math.round(limit / MB)) : '')
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const applyCustom = (value: string) => {
    setCustomMb(value)
    const mb = Number(value.replace(',', '.'))
    if (Number.isFinite(mb) && mb >= 50) setLimit(Math.round(mb * MB))
  }

  return (
    <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title={t('storage.settings.limit')} icon={<IconGauge size={17} />}>
        <p className="mb-3 text-sm text-fg-2">{t('storage.settings.limitHint')}</p>
        <div className="flex flex-wrap gap-1.5">
          {LIMIT_PRESETS.map((p) => (
            <button key={p} type="button" aria-pressed={limit === p} onClick={() => (setLimit(p), setCustomMb(''))} className={toggleChip(limit === p)}>
              {formatBytes(p, i18n.language)}
            </button>
          ))}
          <label className={`${toggleChip(custom)} flex items-center gap-1.5`}>
            {t('storage.settings.custom')}
            <input
              inputMode="numeric"
              value={customMb}
              onChange={(e) => applyCustom(e.target.value)}
              placeholder="1500"
              aria-label={t('storage.settings.customMb')}
              className={`${field} h-6 w-20 px-1.5 text-xs`}
            />
            MB
          </label>
        </div>
        <p className="mt-3 text-xs text-fg-3">
          {t('storage.settings.current', { used: formatBytes(usage.used, i18n.language), limit: formatBytes(limit, i18n.language), pct: Math.round((usage.used / limit) * 100) })}
        </p>
      </Card>

      <Card title={t('storage.settings.alerts')} icon={<IconBell size={17} />}>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">{t('storage.settings.alertsToggle')}</span>
            <span className="block text-xs text-fg-3">{t('storage.settings.alertsHint')}</span>
          </span>
        </label>
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {ALERT_LEVELS.map((l) => (
            <li key={l} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2/60 px-3 py-2">
              <span className="text-fg-2">{t(`storage.levels.l${l}`)}</span>
              <span className="font-medium tabular-nums">
                {l} % · {formatBytes((limit * l) / 100, i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <DestinationsCard />

      <Card title={t('storage.settings.protection')} icon={persisted ? <IconShieldCheck size={17} /> : <IconShieldExclamation size={17} />}>
        <p className={`text-sm ${persisted === false ? 'text-warning' : 'text-fg-2'}`}>
          {persisted === null ? '…' : persisted ? t('storage.settings.persisted') : t('storage.settings.notPersisted')}
        </p>
        <p className="mt-2 text-xs text-fg-3">{t('storage.settings.protectionHint')}</p>
      </Card>
    </div>
  )
}
