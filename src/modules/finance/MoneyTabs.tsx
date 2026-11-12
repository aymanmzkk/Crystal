import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { StatTile } from '../../components/StatTile'
import { btn, btnIcon, btnPrimary, field, fieldError, segment } from '../../components/ui'
import { useSetting, useSubscriptions } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord, upsertRecord } from '../../db/repo'
import type { DateKey, FinanceCategory, Transaction } from '../../db/types'
import { addDaysKey, parseKey } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { useToast } from '../../store/toast'
import { CATEGORY_ICON, EXPENSE_CATEGORIES, INCOME_CATEGORIES, parseAmount, totals } from './money'
import { Attachments } from '../../components/Attachments'

export const BUDGETS_KEY = 'budgets'
export type Budgets = Partial<Record<FinanceCategory, number>>

interface MonthProps {
  transactions: Transaction[]
  today: DateKey
}

export function SummaryTab({ transactions, today }: MonthProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const sum = totals(transactions)
  const budgets = useSetting<Budgets>(BUDGETS_KEY) ?? {}
  const subscriptions = useSubscriptions()
  const upcoming = (subscriptions ?? [])
    .filter((s) => s.active && s.nextDate >= today && s.nextDate <= addDaysKey(today, 30))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
  const max = Math.max(1, ...sum.byCategory.map(([, v]) => v))
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })
  const savingRate = sum.income > 0 ? Math.round((sum.balance / sum.income) * 100) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={t('finance.income')} value={formatMoney(sum.income, lang)} />
        <StatTile label={t('finance.expenses')} value={formatMoney(sum.expense, lang)} />
        <StatTile label={t('finance.balance')} value={formatMoney(sum.balance, lang)} tone={sum.balance < 0 ? 'danger' : undefined} />
        <StatTile label={t('finance.savingRate')} value={savingRate === null ? '—' : `${savingRate} %`} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="card p-3">
          <h2 className="mb-2 text-xs text-fg-3">{t('finance.byCategory')}</h2>
          {sum.byCategory.length === 0 ? (
            <p className="py-4 text-center text-fg-3">{t('finance.noExpenses')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sum.byCategory.map(([cat, value]) => {
                const Icon = CATEGORY_ICON[cat]
                const limit = budgets[cat]
                const over = limit !== undefined && limit > 0 && value > limit
                return (
                  <li key={cat}>
                    <div className="flex items-center gap-2 text-xs">
                      <Icon size={18} className="text-fg-2" aria-hidden />
                      <span className="flex-1">{t(`finance.categories.${cat}`)}</span>
                      <span className={over ? 'text-danger' : ''}>
                        {formatMoney(value, lang)}
                        {limit ? <span className="text-fg-3"> / {formatMoney(limit, lang)}</span> : null}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="card p-3">
          <h2 className="mb-2 text-xs text-fg-3">{t('finance.upcomingCharges')}</h2>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-fg-3">{t('finance.noUpcoming')}</p>
          ) : (
            <ul>
              {upcoming.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-line py-1.5 last:border-b-0">
                  <span>
                    <span className="mr-2 text-fg-3">{date.format(parseKey(s.nextDate))}</span>
                    {s.name}
                  </span>
                  <span>{formatMoney(s.amount, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export function MovementsTab({ transactions, today }: MonthProps) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const lang = i18n.language
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [type, setType] = useState<Transaction['type']>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<FinanceCategory>('food')
  const [date, setDate] = useState(today)
  const [error, setError] = useState(false)
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const dayFormat = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric' })

  const reset = () => {
    setEditing(null)
    setTitle('')
    setAmount('')
    setError(false)
  }

  function edit(tx: Transaction) {
    setEditing(tx)
    setType(tx.type)
    setTitle(tx.title)
    setAmount(String(tx.amount).replace('.', ','))
    setCategory(tx.category)
    setDate(tx.date)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null || !date) {
      setError(true)
      return
    }
    const data = { type, title: title.trim() || t(`finance.categories.${category}`), amount: value, category: categories.includes(category) ? category : 'other', date }
    if (editing) await updateRecord('transactions', editing.id, data)
    else await createRecord('transactions', { ...data, subscriptionId: null })
    reset()
  }

  async function trash(tx: Transaction) {
    await moveToTrash('transactions', tx.id)
    showToast({ message: t('calendar.toast.trashed', { name: tx.title }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('transactions', tx.id) } })
  }

  const sorted = [...transactions].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => void save(e)} noValidate className="flex flex-wrap items-center gap-2 card p-3">
        <div role="group" aria-label={t('habits.kind')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {(['expense', 'income'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={type === k}
              onClick={() => {
                setType(k)
                setCategory(k === 'expense' ? 'food' : 'salary')
              }}
              className={segment(type === k)}
            >
              {t(`finance.types.${k}`)}
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('finance.concept')} aria-label={t('finance.concept')} className={`${field} min-w-40 flex-1`} />
        <input
          value={amount}
          inputMode="decimal"
          onChange={(e) => {
            setAmount(e.target.value)
            setError(false)
          }}
          placeholder="0,00 €"
          aria-label={t('finance.amount')}
          aria-invalid={error}
          className={`${field} w-28`}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as FinanceCategory)} aria-label={t('tasks.form.category')} className={`${field} max-w-44`}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {t(`finance.categories.${c}`)}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('calendar.form.date')} className={`${field} w-36`} />
        <button type="submit" className={btnPrimary}>
          {editing ? t('calendar.form.save') : t('finance.add')}
        </button>
        {editing && (
          <button type="button" onClick={reset} className={btn}>
            {t('calendar.form.cancel')}
          </button>
        )}
        {error && <p className={`w-full ${fieldError}`}>{t('finance.errors.amount')}</p>}
      </form>

      {editing && (
        <section className="card p-3">
          <p className="mb-2 text-xs font-medium text-fg-2">
            {t('files.receipt')} · {editing.title}
          </p>
          <Attachments key={editing.id} ownerTable="transactions" ownerId={editing.id} variant="list" compact />
        </section>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
            <tr>
              <th className="w-24 px-3 py-2 font-normal">{t('calendar.form.date')}</th>
              <th className="px-3 py-2 font-normal">{t('finance.concept')}</th>
              <th className="w-40 px-3 py-2 font-normal">{t('tasks.form.category')}</th>
              <th className="w-28 px-3 py-2 text-right font-normal">{t('finance.amount')}</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-fg-3">
                  {t('finance.noMovements')}
                </td>
              </tr>
            )}
            {sorted.map((tx) => {
              const Icon = CATEGORY_ICON[tx.category]
              return (
                <tr key={tx.id} onClick={() => edit(tx)} className={`cursor-pointer border-t border-line hover:bg-surface-2 ${editing?.id === tx.id ? 'bg-surface-2' : ''}`}>
                  <td className="px-3 py-2 text-fg-2 first-letter:uppercase">{dayFormat.format(parseKey(tx.date))}</td>
                  <td className="truncate px-3 py-2">{tx.title}</td>
                  <td className="px-3 py-2 text-fg-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={16} aria-hidden />
                      {t(`finance.categories.${tx.category}`)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${tx.type === 'income' ? 'text-success' : ''}`}>
                    {tx.type === 'income' ? '+' : '−'}
                    {formatMoney(tx.amount, lang)}
                  </td>
                  <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => void trash(tx)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                      <IconTrash size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BudgetsTab({ transactions }: { transactions: Transaction[] }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const saved = useSetting<Budgets>(BUDGETS_KEY)
  const budgets = saved ?? {}
  const spent = new Map(totals(transactions).byCategory)

  const setLimit = (cat: FinanceCategory, text: string) => {
    const value = parseAmount(text)
    const next = { ...budgets }
    if (value === null) delete next[cat]
    else next[cat] = value
    void upsertRecord('settings', BUDGETS_KEY, { value: next })
  }

  if (saved === undefined) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-3">{t('finance.budgetsHint')}</p>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {EXPENSE_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICON[cat]
          const limit = budgets[cat]
          const value = spent.get(cat) ?? 0
          const ratio = limit ? value / limit : 0
          return (
            <li key={cat} className="card p-3">
              <div className="flex items-center gap-2">
                <Icon size={19} className="text-fg-2" aria-hidden />
                <span className="flex-1">{t(`finance.categories.${cat}`)}</span>
                <span className={`text-xs ${ratio > 1 ? 'text-danger' : 'text-fg-2'}`}>{formatMoney(value, lang)}</span>
                <span className="text-fg-3">/</span>
                <input
                  defaultValue={limit ? String(limit).replace('.', ',') : ''}
                  inputMode="decimal"
                  onBlur={(e) => setLimit(cat, e.target.value)}
                  placeholder={t('finance.noLimit')}
                  aria-label={`${t('finance.limit')}: ${t(`finance.categories.${cat}`)}`}
                  className={`${field} w-24 text-right`}
                />
              </div>
              {limit ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <div className={`h-full rounded-full ${ratio > 1 ? 'bg-danger' : ratio > 0.8 ? 'bg-accent' : 'bg-accent'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
