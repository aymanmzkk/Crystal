import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconSearch, IconTrash } from '@tabler/icons-react'
import { StatTile } from '../../components/StatTile'
import { btn, btnIcon, btnPrimary, field, fieldError } from '../../components/ui'
import { useInventory } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { InventoryItem } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { diffDays, toDateKey } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { useToast } from '../../store/toast'
import { parseAmount } from '../finance/money'
import { ExpiryBadge, SOON_DAYS } from './ExpiryBadge'
import { Attachments } from '../../components/Attachments'

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const today = toDateKey(useNow())
  const showToast = useToast((s) => s.show)
  const items = useInventory()
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [price, setPrice] = useState('')
  const [warranty, setWarranty] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  const all = items ?? []
  const words = search.trim().toLowerCase()
  const list = all.filter((i) => !words || `${i.name} ${i.location} ${i.notes}`.toLowerCase().includes(words))
  const total = all.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const soon = all.filter((i) => i.warrantyUntil && diffDays(today, i.warrantyUntil) >= 0 && diffDays(today, i.warrantyUntil) <= SOON_DAYS).length
  const locations = [...new Set(all.map((i) => i.location).filter(Boolean))]

  const reset = () => {
    setEditing(null)
    setName('')
    setLocation('')
    setPurchaseDate('')
    setPrice('')
    setWarranty('')
    setNotes('')
    setError(false)
  }

  function edit(item: InventoryItem) {
    setEditing(item)
    setName(item.name)
    setLocation(item.location)
    setPurchaseDate(item.purchaseDate ?? '')
    setPrice(item.price ? String(item.price).replace('.', ',') : '')
    setWarranty(item.warrantyUntil ?? '')
    setNotes(item.notes)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(true)
      return
    }
    const data = { name: name.trim(), location: location.trim(), purchaseDate: purchaseDate || null, price: parseAmount(price), warrantyUntil: warranty || null, notes: notes.trim() }
    if (editing) await updateRecord('inventory', editing.id, data)
    else await createRecord('inventory', data)
    reset()
  }

  async function trash(item: InventoryItem) {
    await moveToTrash('inventory', item.id)
    showToast({ message: t('calendar.toast.trashed', { name: item.name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('inventory', item.id) } })
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t('inventory.items')} value={String(all.length)} />
        <StatTile label={t('inventory.value')} value={formatMoney(total, lang)} />
        <StatTile label={t('inventory.warrantySoon')} value={String(soon)} tone={soon > 0 ? 'danger' : undefined} />
      </div>

      <form onSubmit={(e) => void save(e)} noValidate className="flex flex-wrap items-center gap-2 card p-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(false)
          }}
          placeholder={t('inventory.namePlaceholder')}
          aria-label={t('habits.name')}
          aria-invalid={error}
          className={`${field} min-w-40 flex-1`}
        />
        <input value={location} onChange={(e) => setLocation(e.target.value)} list="inventory-locations" placeholder={t('inventory.location')} aria-label={t('inventory.location')} className={`${field} w-36`} />
        <datalist id="inventory-locations">
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder={t('finance.price')} aria-label={t('finance.price')} className={`${field} w-24`} />
        <label className="flex items-center gap-1.5 text-fg-2">
          {t('inventory.bought')}
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={`${field} w-36`} />
        </label>
        <label className="flex items-center gap-1.5 text-fg-2">
          {t('inventory.warranty')}
          <input type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} className={`${field} w-36`} />
        </label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('inventory.notesPlaceholder')} aria-label={t('calendar.form.notes')} className={`${field} min-w-40 flex-1`} />
        <button type="submit" className={btnPrimary}>
          {editing ? t('calendar.form.save') : t('finance.add')}
        </button>
        {editing && (
          <button type="button" onClick={reset} className={btn}>
            {t('calendar.form.cancel')}
          </button>
        )}
        {error && <p className={`w-full ${fieldError}`}>{t('calendar.category.errors.name')}</p>}
      </form>

      {editing && (
        <section className="card p-3">
          <p className="mb-2 text-xs font-medium text-fg-2">
            {t('files.receipt')} · {editing.name}
          </p>
          <Attachments key={editing.id} ownerTable="inventory" ownerId={editing.id} variant="list" compact />
        </section>
      )}

      <div className="relative max-w-xs">
        <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-fg-3" aria-hidden />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory.search')} aria-label={t('inventory.search')} className={`${field} w-full pl-7`} />
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
            <tr>
              <th className="px-3 py-2 font-normal">{t('habits.name')}</th>
              <th className="w-32 px-3 py-2 font-normal">{t('inventory.location')}</th>
              <th className="w-24 px-3 py-2 text-right font-normal">{t('finance.price')}</th>
              <th className="w-44 px-3 py-2 font-normal">{t('inventory.warranty')}</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-fg-3">
                  {all.length === 0 ? t('inventory.empty') : t('palette.empty')}
                </td>
              </tr>
            )}
            {list.map((item) => (
              <tr key={item.id} onClick={() => edit(item)} className={`cursor-pointer border-t border-line hover:bg-surface-2 ${editing?.id === item.id ? 'bg-surface-2' : ''}`}>
                <td className="px-3 py-2">
                  <span className="block truncate">{item.name}</span>
                  {item.notes && <span className="block truncate text-xs text-fg-3">{item.notes}</span>}
                </td>
                <td className="px-3 py-2 text-fg-2">{item.location || '—'}</td>
                <td className="px-3 py-2 text-right">{item.price ? formatMoney(item.price, lang) : '—'}</td>
                <td className="px-3 py-2">
                  <ExpiryBadge date={item.warrantyUntil} today={today} />
                </td>
                <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => void trash(item)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                    <IconTrash size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-3">{t('inventory.hint')}</p>
    </main>
  )
}
