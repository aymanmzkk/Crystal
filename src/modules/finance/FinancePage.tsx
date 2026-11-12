import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { btn, btnIcon, segment } from '../../components/ui'
import { useTransactionsBetween } from '../../db/hooks'
import { useNow } from '../../hooks/useNow'
import { addDays, addMonths, startOfMonth, toDateKey } from '../../lib/dates'
import { BudgetsTab, MovementsTab, SummaryTab } from './MoneyTabs'
import { DebtsTab, SavingsTab, SubscriptionsTab, WishlistTab } from './PlanTabs'

const TABS = ['summary', 'movements', 'budgets', 'subscriptions', 'savings', 'wishlist', 'debts'] as const
type Tab = (typeof TABS)[number]
// Pestañas que dependen del mes elegido
const MONTHLY: Tab[] = ['summary', 'movements', 'budgets']

export default function FinancePage() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const today = toDateKey(now)
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'summary'
  const [month, setMonth] = useState(() => startOfMonth(now))
  const from = toDateKey(month)
  const to = toDateKey(addDays(addMonths(month, 1), -1))
  const transactions = useTransactionsBetween(from, to) ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <div role="tablist" aria-label={t('apps.finance')} className="flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {TABS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setParams({ tab: v }, { replace: true })} className={segment(tab === v)}>
              {t(`finance.tabs.${v}`)}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {MONTHLY.includes(tab) && (
          <>
            <button type="button" onClick={() => setMonth(startOfMonth(new Date()))} className={btn}>
              {t('calendar.today')}
            </button>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={t('calendar.prev')} className={btnIcon}>
              <IconChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={t('calendar.next')} className={btnIcon}>
              <IconChevronRight size={20} aria-hidden />
            </button>
            <h1 className="ml-1 w-36 text-sm font-semibold first-letter:uppercase">{new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(month)}</h1>
          </>
        )}
      </div>
      <main className="w-full flex-1 p-4 md:p-6" role="tabpanel">
        {tab === 'summary' && <SummaryTab transactions={transactions} today={today} />}
        {tab === 'movements' && <MovementsTab key={from} transactions={transactions} today={today >= from && today <= to ? today : from} />}
        {tab === 'budgets' && <BudgetsTab transactions={transactions} />}
        {tab === 'subscriptions' && <SubscriptionsTab today={today} />}
        {tab === 'savings' && <SavingsTab today={today} />}
        {tab === 'wishlist' && <WishlistTab />}
        {tab === 'debts' && <DebtsTab today={today} />}
      </main>
    </div>
  )
}
