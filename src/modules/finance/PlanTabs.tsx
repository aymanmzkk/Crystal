import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconExternalLink, IconReceipt2, IconTrash } from '@tabler/icons-react'
import { StatTile } from '../../components/StatTile'
import { btn, btnIcon, btnPrimary, field, fieldError } from '../../components/ui'
import { useDebts, useSavingsGoals, useSubscriptions, useWishlist } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { DateKey, TrashableTable } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { parseKey } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { useToast } from '../../store/toast'
import { advanceDate, monthlyEquivalent, monthlyNeeded, parseAmount } from './money'

// Mueve un registro a la papelera con el aviso de "Deshacer"
function useTrash() {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  return async (table: TrashableTable, id: string, name: string) => {
    await moveToTrash(table, id)
    showToast({ message: t('calendar.toast.trashed', { name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash(table, id) } })
  }
}

// Fila de formulario para añadir, con el mensaje de error debajo
function AddForm({ onSubmit, error, children }: { onSubmit: () => void; error?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
      className="flex flex-wrap items-center gap-2 card p-3"
    >
      {children}
      <button type="submit" className={btnPrimary}>
        {t('finance.add')}
      </button>
      {error && <p className={`w-full ${fieldError}`}>{error}</p>}
    </form>
  )
}

export function SubscriptionsTab({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const trash = useTrash()
  const showToast = useToast((s) => s.show)
  const subscriptions = useSubscriptions()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [nextDate, setNextDate] = useState(today)
  const [error, setError] = useState('')
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  const list = [...(subscriptions ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate))
  const monthly = list.filter((s) => s.active).reduce((sum, s) => sum + monthlyEquivalent(s), 0)

  async function add() {
    const value = parseAmount(amount)
    if (!name.trim() || value === null || !nextDate) {
      setError(t('finance.errors.form'))
      return
    }
    await createRecord('subscriptions', { name: name.trim(), amount: value, cycle, nextDate, active: true })
    setName('')
    setAmount('')
    setError('')
  }

  // Apunta el cobro como gasto y pasa la fecha al siguiente
  async function charge(id: string) {
    const sub = list.find((s) => s.id === id)
    if (!sub) return
    await createRecord('transactions', { title: sub.name, type: 'expense', amount: sub.amount, category: 'subscriptions', date: sub.nextDate, subscriptionId: sub.id })
    await updateRecord('subscriptions', sub.id, { nextDate: advanceDate(sub.nextDate, sub.cycle) })
    showToast({ message: t('finance.charged', { name: sub.name }) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatTile label={t('finance.perMonth')} value={formatMoney(monthly, lang)} />
        <StatTile label={t('finance.perYear')} value={formatMoney(monthly * 12, lang)} />
        <StatTile label={t('finance.activeSubs')} value={String(list.filter((s) => s.active).length)} />
      </div>
      <AddForm onSubmit={() => void add()} error={error}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" aria-label={t('habits.name')} className={`${field} min-w-40 flex-1`} />
        <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} placeholder="0,00 €" aria-label={t('finance.amount')} className={`${field} w-28`} />
        <select value={cycle} onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')} aria-label={t('finance.cycle')} className={`${field} w-32`}>
          <option value="monthly">{t('finance.cycles.monthly')}</option>
          <option value="yearly">{t('finance.cycles.yearly')}</option>
        </select>
        <label className="flex items-center gap-1.5 text-fg-2">
          {t('finance.nextCharge')}
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={`${field} w-36`} />
        </label>
      </AddForm>
      <div className="overflow-x-auto card">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
            <tr>
              <th className="px-3 py-2 font-normal">{t('habits.name')}</th>
              <th className="w-28 px-3 py-2 text-right font-normal">{t('finance.amount')}</th>
              <th className="w-36 px-3 py-2 font-normal">{t('finance.nextCharge')}</th>
              <th className="w-24 px-3 py-2 text-right font-normal">{t('finance.perMonth')}</th>
              <th className="w-56 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-fg-3">
                  {t('finance.noSubs')}
                </td>
              </tr>
            )}
            {list.map((s) => (
              <tr key={s.id} className={`border-t border-line ${s.active ? '' : 'text-fg-3'}`}>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(s.amount, lang)} <span className="text-fg-3">/ {t(`finance.cycleShort.${s.cycle}`)}</span>
                </td>
                <td className={`px-3 py-2 ${s.active && s.nextDate < today ? 'text-danger' : ''}`}>{date.format(parseKey(s.nextDate))}</td>
                <td className="px-3 py-2 text-right">{formatMoney(monthlyEquivalent(s), lang)}</td>
                <td className="px-3 py-1">
                  <span className="flex justify-end gap-1.5">
                    {s.active && (
                      <button type="button" onClick={() => void charge(s.id)} className={`${btn} h-7`} title={t('finance.chargeHint')}>
                        <IconReceipt2 size={16} aria-hidden />
                        {t('finance.charge')}
                      </button>
                    )}
                    <button type="button" onClick={() => void updateRecord('subscriptions', s.id, { active: !s.active })} className={`${btn} h-7`}>
                      {s.active ? t('finance.pause') : t('finance.resume')}
                    </button>
                    <button type="button" onClick={() => void trash('subscriptions', s.id, s.name)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                      <IconTrash size={16} aria-hidden />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-3">{t('finance.subsHint')}</p>
    </div>
  )
}

export function SavingsTab({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const trash = useTrash()
  const goals = useSavingsGoals()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')
  const [deposit, setDeposit] = useState<Record<string, string>>({})
  const date = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' })
  const colors = ['teal', 'blue', 'purple', 'amber', 'pink', 'green'] as const

  async function add() {
    const value = parseAmount(target)
    if (!name.trim() || value === null) {
      setError(t('finance.errors.form'))
      return
    }
    await createRecord('savingsGoals', { name: name.trim(), target: value, saved: 0, deadline: deadline || null, color: colors[(goals?.length ?? 0) % colors.length] })
    setName('')
    setTarget('')
    setDeadline('')
    setError('')
  }

  async function addMoney(id: string, saved: number, sign: 1 | -1) {
    const value = parseAmount(deposit[id] ?? '')
    if (value === null) return
    await updateRecord('savingsGoals', id, { saved: Math.max(0, Math.round((saved + sign * value) * 100) / 100) })
    setDeposit((d) => ({ ...d, [id]: '' }))
  }

  return (
    <div className="flex flex-col gap-3">
      <AddForm onSubmit={() => void add()} error={error}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('finance.goalPlaceholder')} aria-label={t('habits.name')} className={`${field} min-w-40 flex-1`} />
        <input value={target} inputMode="decimal" onChange={(e) => setTarget(e.target.value)} placeholder={t('finance.target')} aria-label={t('finance.target')} className={`${field} w-32`} />
        <label className="flex items-center gap-1.5 text-fg-2">
          {t('finance.deadline')}
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} w-36`} />
        </label>
      </AddForm>
      {goals && goals.length === 0 && <p className="py-8 text-center text-fg-3">{t('finance.noGoals')}</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(goals ?? []).map((g) => {
          const ratio = Math.min(1, g.saved / g.target)
          const needed = monthlyNeeded(g, today)
          return (
            <li key={g.id} className="flex flex-col gap-2 card p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{g.name}</h3>
                  <p className="text-xs text-fg-3">
                    {g.deadline ? t('finance.until', { date: date.format(parseKey(g.deadline)) }) : t('finance.noDeadline')}
                    {needed !== null && ` · ${t('finance.perMonthNeeded', { amount: formatMoney(needed, lang) })}`}
                  </p>
                </div>
                <button type="button" onClick={() => void trash('savingsGoals', g.id, g.name)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                  <IconTrash size={16} aria-hidden />
                </button>
              </div>
              <p>
                <span className="text-lg font-semibold">{formatMoney(g.saved, lang)}</span>
                <span className="text-fg-3"> / {formatMoney(g.target, lang)}</span>
                {ratio >= 1 && <span className="ml-2 text-success">{t('finance.reached')}</span>}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ratio * 100}%`, backgroundColor: COLORS[g.color].base }} />
              </div>
              <div className="flex gap-1.5">
                <input
                  value={deposit[g.id] ?? ''}
                  inputMode="decimal"
                  onChange={(e) => setDeposit((d) => ({ ...d, [g.id]: e.target.value }))}
                  placeholder="0,00 €"
                  aria-label={t('finance.depositAmount')}
                  className={`${field} w-24`}
                />
                <button type="button" onClick={() => void addMoney(g.id, g.saved, 1)} className={`${btn} h-8`}>
                  {t('finance.deposit')}
                </button>
                <button type="button" onClick={() => void addMoney(g.id, g.saved, -1)} className={`${btn} h-8`}>
                  {t('finance.withdraw')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function WishlistTab() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const trash = useTrash()
  const items = useWishlist()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3>(2)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const list = [...(items ?? [])].sort((a, b) => Number(a.bought) - Number(b.bought) || a.priority - b.priority || a.price - b.price)
  const pending = list.filter((i) => !i.bought).reduce((sum, i) => sum + i.price, 0)

  async function add() {
    const value = parseAmount(price)
    if (!name.trim() || value === null) {
      setError(t('finance.errors.form'))
      return
    }
    const link = url.trim()
    await createRecord('wishlist', { name: name.trim(), price: value, priority, url: link && !/^https?:\/\//.test(link) ? `https://${link}` : link, bought: false })
    setName('')
    setPrice('')
    setUrl('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label={t('finance.wishTotal')} value={formatMoney(pending, lang)} />
        <StatTile label={t('finance.wishCount')} value={String(list.filter((i) => !i.bought).length)} />
      </div>
      <AddForm onSubmit={() => void add()} error={error}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('finance.wishPlaceholder')} aria-label={t('habits.name')} className={`${field} min-w-40 flex-1`} />
        <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder="0,00 €" aria-label={t('finance.price')} className={`${field} w-28`} />
        <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)} aria-label={t('finance.priority')} className={`${field} w-32`}>
          {[1, 2, 3].map((p) => (
            <option key={p} value={p}>
              {t(`finance.priorities.${p}`)}
            </option>
          ))}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('finance.link')} aria-label={t('finance.link')} className={`${field} w-48`} />
      </AddForm>
      {list.length === 0 ? (
        <p className="py-8 text-center text-fg-3">{t('finance.noWishes')}</p>
      ) : (
        <ul className="card">
          {list.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
              <input type="checkbox" checked={item.bought} onChange={() => void updateRecord('wishlist', item.id, { bought: !item.bought })} aria-label={`${t('finance.bought')}: ${item.name}`} />
              <span className={`min-w-0 flex-1 truncate ${item.bought ? 'text-fg-3 line-through' : ''}`}>{item.name}</span>
              <span className="text-xs text-fg-3">{t(`finance.priorities.${item.priority}`)}</span>
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer" aria-label={t('finance.openLink')} className="text-fg-3 hover:text-fg">
                  <IconExternalLink size={18} aria-hidden />
                </a>
              )}
              <span className="w-24 text-right font-semibold">{formatMoney(item.price, lang)}</span>
              <button type="button" onClick={() => void trash('wishlist', item.id, item.name)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                <IconTrash size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DebtsTab({ today }: { today: DateKey }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const trash = useTrash()
  const debts = useDebts()
  const [title, setTitle] = useState('')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'owedToMe' | 'iOwe'>('owedToMe')
  const [error, setError] = useState('')
  const [showSettled, setShowSettled] = useState(false)
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' })
  const open = (debts ?? []).filter((d) => !d.settled)
  const sumOf = (dir: 'owedToMe' | 'iOwe') => open.filter((d) => d.direction === dir).reduce((s, d) => s + d.amount, 0)

  async function add() {
    const value = parseAmount(amount)
    if (!person.trim() || value === null) {
      setError(t('finance.errors.debt'))
      return
    }
    await createRecord('debts', { title: title.trim() || person.trim(), person: person.trim(), amount: value, direction, date: today, settled: false })
    setTitle('')
    setPerson('')
    setAmount('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t('finance.owedToMe')} value={formatMoney(sumOf('owedToMe'), lang)} tone="success" />
        <StatTile label={t('finance.iOwe')} value={formatMoney(sumOf('iOwe'), lang)} tone={sumOf('iOwe') > 0 ? 'danger' : undefined} />
        <StatTile label={t('finance.balance')} value={formatMoney(sumOf('owedToMe') - sumOf('iOwe'), lang)} />
      </div>
      <AddForm onSubmit={() => void add()} error={error}>
        <select value={direction} onChange={(e) => setDirection(e.target.value as 'owedToMe' | 'iOwe')} aria-label={t('habits.kind')} className={`${field} w-36`}>
          <option value="owedToMe">{t('finance.owedToMe')}</option>
          <option value="iOwe">{t('finance.iOwe')}</option>
        </select>
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder={t('finance.person')} aria-label={t('finance.person')} className={`${field} w-36`} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('finance.debtPlaceholder')} aria-label={t('finance.concept')} className={`${field} min-w-40 flex-1`} />
        <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} placeholder="0,00 €" aria-label={t('finance.amount')} className={`${field} w-28`} />
      </AddForm>
      <label className="flex items-center gap-1.5 text-fg-2">
        <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} />
        {t('finance.showSettled')}
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['owedToMe', 'iOwe'] as const).map((dir) => {
          const list = (debts ?? []).filter((d) => d.direction === dir && (showSettled || !d.settled)).sort((a, b) => Number(a.settled) - Number(b.settled) || b.date.localeCompare(a.date))
          return (
            <section key={dir} className="card">
              <h2 className="border-b border-line px-3 py-2 text-xs text-fg-3">{t(`finance.${dir}`)}</h2>
              {list.length === 0 ? (
                <p className="px-3 py-6 text-center text-fg-3">{t('finance.noDebts')}</p>
              ) : (
                <ul>
                  {list.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
                      <input type="checkbox" checked={d.settled} onChange={() => void updateRecord('debts', d.id, { settled: !d.settled })} aria-label={`${t('finance.settled')}: ${d.title}`} />
                      <span className={`min-w-0 flex-1 ${d.settled ? 'text-fg-3 line-through' : ''}`}>
                        <span className="font-semibold">{d.person}</span>
                        {d.title !== d.person && <span className="text-fg-2"> · {d.title}</span>}
                        <span className="ml-2 text-xs text-fg-3">{date.format(parseKey(d.date))}</span>
                      </span>
                      <span className="font-semibold">{formatMoney(d.amount, lang)}</span>
                      <button type="button" onClick={() => void trash('debts', d.id, d.title)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                        <IconTrash size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
