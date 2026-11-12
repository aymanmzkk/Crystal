import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconCheck, IconShoppingCart, IconBucket, IconTrash, IconX } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary, field } from '../../components/ui'
import { useChores, useShopping } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Aisle, Chore, ShoppingItem } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'
import { AISLES, choreDaysLeft, guessAisle, parseItem } from './home'

export default function HouseholdPage() {
  return (
    <main className="grid w-full flex-1 grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-2">
      <ShoppingList />
      <Chores />
    </main>
  )
}

function ShoppingList() {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const items = useShopping()
  const [text, setText] = useState('')
  const [aisle, setAisle] = useState<Aisle | 'auto'>('auto')
  const pending = (items ?? []).filter((i) => !i.checked)
  const inCart = (items ?? []).filter((i) => i.checked)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const { name, quantity } = parseItem(text)
    // Si ya está en la lista y sin comprar, no se duplica
    if (pending.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      showToast({ message: t('household.already', { name }) })
    } else {
      await createRecord('shopping', { name, quantity, aisle: aisle === 'auto' ? guessAisle(name) : aisle, checked: false })
    }
    setText('')
  }

  async function clearCart() {
    const ids = inCart.map((i) => i.id)
    for (const id of ids) await moveToTrash('shopping', id)
    showToast({
      message: t('household.cleared', { count: ids.length }),
      action: { label: t('calendar.toast.undo'), run: () => ids.forEach((id) => void restoreFromTrash('shopping', id)) },
    })
  }

  const row = (item: ShoppingItem) => (
    <li key={item.id} className="flex items-center gap-2 px-3 py-1.5">
      <input type="checkbox" checked={item.checked} onChange={() => void updateRecord('shopping', item.id, { checked: !item.checked })} aria-label={item.name} />
      <span className={`min-w-0 flex-1 truncate ${item.checked ? 'text-fg-3 line-through' : ''}`}>
        {item.name}
        {item.quantity && <span className="ml-1.5 text-fg-3">× {item.quantity}</span>}
      </span>
      <button type="button" onClick={() => void moveToTrash('shopping', item.id)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
        <IconX size={16} aria-hidden />
      </button>
    </li>
  )

  return (
    <section aria-label={t('household.shopping')} className="flex flex-col card">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <IconShoppingCart size={20} aria-hidden />
        <h2 className="flex-1 font-semibold">{t('household.shopping')}</h2>
        <span className="text-xs text-fg-3">{t('household.pending', { count: pending.length })}</span>
      </header>
      <form onSubmit={(e) => void add(e)} className="flex gap-2 border-b border-line p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('household.addPlaceholder')} aria-label={t('household.addPlaceholder')} className={`${field} min-w-0 flex-1`} />
        <select value={aisle} onChange={(e) => setAisle(e.target.value as Aisle | 'auto')} aria-label={t('household.aisle')} className={`${field} w-36`}>
          <option value="auto">{t('household.autoAisle')}</option>
          {AISLES.map((a) => (
            <option key={a} value={a}>
              {t(`household.aisles.${a}`)}
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          {t('finance.add')}
        </button>
      </form>
      {pending.length === 0 && inCart.length === 0 && <p className="px-3 py-8 text-center text-fg-3">{t('household.emptyList')}</p>}
      {AISLES.map((a) => {
        const group = pending.filter((i) => i.aisle === a).sort((x, y) => x.name.localeCompare(y.name))
        if (!group.length) return null
        return (
          <div key={a}>
            <h3 className="bg-surface-2 px-3 py-1 text-xs text-fg-3">{t(`household.aisles.${a}`)}</h3>
            <ul>{group.map(row)}</ul>
          </div>
        )
      })}
      {inCart.length > 0 && (
        <div>
          <div className="flex items-center justify-between bg-surface-2 px-3 py-1">
            <h3 className="text-xs text-fg-3">{t('household.inCart', { count: inCart.length })}</h3>
            <button type="button" onClick={() => void clearCart()} className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
              <IconTrash size={15} aria-hidden />
              {t('household.clearCart')}
            </button>
          </div>
          <ul>{inCart.map(row)}</ul>
        </div>
      )}
    </section>
  )
}

const EVERY = [1, 2, 3, 7, 14, 30]

function Chores() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const chores = useChores()
  const [name, setName] = useState('')
  const [every, setEvery] = useState(7)
  const [assignee, setAssignee] = useState('')
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  const sorted = [...(chores ?? [])].sort((a, b) => choreDaysLeft(a, today) - choreDaysLeft(b, today) || a.name.localeCompare(b.name))
  const late = sorted.filter((c) => choreDaysLeft(c, today) < 0).length

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createRecord('chores', { name: name.trim(), everyDays: every, lastDone: null, assignee: assignee.trim() })
    setName('')
    setAssignee('')
  }

  const done = (c: Chore) => {
    const previous = c.lastDone
    void updateRecord('chores', c.id, { lastDone: today })
    useToast.getState().show({ message: t('household.choreDone', { name: c.name }), action: { label: t('calendar.toast.undo'), run: () => void updateRecord('chores', c.id, { lastDone: previous }) } })
  }

  return (
    <section aria-label={t('household.chores')} className="flex flex-col card">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <IconBucket size={20} aria-hidden />
        <h2 className="flex-1 font-semibold">{t('household.chores')}</h2>
        {late > 0 && <span className="text-xs text-danger">{t('household.late', { count: late })}</span>}
      </header>
      <form onSubmit={(e) => void add(e)} className="flex flex-wrap gap-2 border-b border-line p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('household.chorePlaceholder')} aria-label={t('habits.name')} className={`${field} min-w-40 flex-1`} />
        <select value={every} onChange={(e) => setEvery(Number(e.target.value))} aria-label={t('household.every')} className={`${field} w-36`}>
          {EVERY.map((d) => (
            <option key={d} value={d}>
              {t('household.everyDays', { count: d })}
            </option>
          ))}
        </select>
        <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder={t('household.who')} aria-label={t('household.who')} className={`${field} w-28`} />
        <button type="submit" className={btnPrimary}>
          {t('finance.add')}
        </button>
      </form>
      {sorted.length === 0 ? (
        <p className="px-3 py-8 text-center text-fg-3">{t('household.noChores')}</p>
      ) : (
        <ul>
          {sorted.map((c) => {
            const left = choreDaysLeft(c, today)
            return (
              <li key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.name}</span>
                  <span className="text-xs text-fg-3">
                    {t('household.everyDays', { count: c.everyDays })}
                    {c.assignee && ` · ${c.assignee}`}
                    {c.lastDone && ` · ${t('household.lastDone', { when: rtf.format(-(c.everyDays - left), 'day') })}`}
                  </span>
                </span>
                <span className={`text-xs whitespace-nowrap ${left < 0 ? 'text-danger' : left === 0 ? 'font-semibold' : 'text-fg-3'}`}>
                  {left === 0 ? t('household.today') : left < 0 ? t('household.lateBy', { count: -left }) : rtf.format(left, 'day')}
                </span>
                <button type="button" onClick={() => done(c)} disabled={c.lastDone === today} className={`${btn} h-7 disabled:opacity-40`}>
                  <IconCheck size={16} aria-hidden />
                  {t('household.done')}
                </button>
                <button type="button" onClick={() => void moveToTrash('chores', c.id)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                  <IconTrash size={16} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
