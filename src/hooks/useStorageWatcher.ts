import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../lib/files'
import { nextAlert } from '../lib/storage'
import { toDateKey } from '../lib/dates'
import { useStoragePrefs } from '../store/storagePrefs'
import { useToast } from '../store/toast'
import { useStorageUsage } from './useStorageUsage'

// Vigila el espacio: apunta la medida del día y avisa al pasar del 70, 85 y 95 % del límite (una sola vez por nivel)
export function useStorageWatcher() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const usage = useStorageUsage()
  const showToast = useToast((s) => s.show)
  const { limit, alerts, lastAlert, setLastAlert, record } = useStoragePrefs()

  useEffect(() => {
    if (!usage || !usage.estimate) return
    record({ date: toDateKey(new Date()), bytes: usage.used, files: usage.summary.localCount })
    const { notify, last } = nextAlert(usage.used, limit, lastAlert)
    if (last !== lastAlert) setLastAlert(last)
    if (notify && alerts) {
      showToast({
        message: t(`storage.alerts.level${notify}`, { used: formatBytes(usage.used, i18n.language), limit: formatBytes(limit, i18n.language) }),
        action: { label: t('storage.alerts.review'), run: () => navigate('/storage') },
      })
    }
    // Solo cuando cambia lo medido o el límite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage?.used, usage?.estimate, limit, alerts])
}
