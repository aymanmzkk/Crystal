import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconChartDonut } from '@tabler/icons-react'
import { TopBar } from '../../components/TopBar'
import { segment } from '../../components/ui'
import { useStorageUsage } from '../../hooks/useStorageUsage'
import { ArchivedTab } from './ArchivedTab'
import { FilesTab } from './FilesTab'
import { OverviewTab } from './OverviewTab'
import { SettingsTab } from './SettingsTab'

export const STORAGE_TABS = ['overview', 'files', 'archived', 'settings'] as const
export type StorageTab = (typeof STORAGE_TABS)[number]

// Gestor de almacenamiento: cuánto ocupa Crystal, avisos, archivar fuera y recuperar
export default function StoragePage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const usage = useStorageUsage()
  const raw = params.get('tab') as StorageTab | null
  const tab: StorageTab = raw && STORAGE_TABS.includes(raw) ? raw : 'overview'
  const go = (next: StorageTab) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true })

  return (
    <>
      <TopBar title={t('storage.title')} icon={<IconChartDonut size={18} stroke={1.8} />} />
      <div className="sticky top-14 z-20 border-b border-line bg-bg/80 px-4 py-2.5 backdrop-blur-xl md:px-6">
        <div role="tablist" aria-label={t('storage.title')} className="flex w-max max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5">
          {STORAGE_TABS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => go(v)} className={`${segment(tab === v)} whitespace-nowrap`}>
              {t(`storage.tabs.${v}`)}
            </button>
          ))}
        </div>
      </div>
      <main key={tab} className="page-in mx-auto w-full max-w-7xl flex-1 p-4 md:p-6" role="tabpanel">
        {!usage && <div className="skeleton h-64" />}
        {usage && tab === 'overview' && <OverviewTab usage={usage} goTo={go} />}
        {usage && tab === 'files' && <FilesTab usage={usage} />}
        {usage && tab === 'archived' && <ArchivedTab usage={usage} />}
        {usage && tab === 'settings' && <SettingsTab usage={usage} />}
      </main>
    </>
  )
}
