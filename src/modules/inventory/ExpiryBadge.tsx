import { useTranslation } from 'react-i18next'
import type { DateKey } from '../../db/types'
import { diffDays, parseKey } from '../../lib/dates'

// Avisa con tiempo: menos de un mes en rojo
export const SOON_DAYS = 30

export function ExpiryBadge({ date, today }: { date: DateKey | null; today: DateKey }) {
  const { t, i18n } = useTranslation()
  if (!date) return <span className="text-fg-3">—</span>
  const days = diffDays(today, date)
  const formatted = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(parseKey(date))
  const relative = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(days, 'day')
  if (days < 0) return <span className="text-fg-3 line-through" title={relative}>{formatted}</span>
  return (
    <span className={days <= SOON_DAYS ? 'text-danger' : ''}>
      {formatted}
      {days <= SOON_DAYS && <span className="ml-1.5 text-xs">· {days === 0 ? t('home.today') : relative}</span>}
    </span>
  )
}
