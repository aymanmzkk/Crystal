import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconCake, IconDeviceMobileDown, IconMessageCircle, IconPlus, IconSearch } from '@tabler/icons-react'
import { btn, btnPrimary, field } from '../../components/ui'
import { useContacts } from '../../db/hooks'
import { updateRecord } from '../../db/repo'
import type { Contact } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { diffDays, parseKey, toDateKey } from '../../lib/dates'
import { ContactPanel, RELATIONS } from './ContactPanel'
import { ImportContactsPanel } from './ImportContactsPanel'
import { ageOn, contactOverdue, nextBirthday } from './people'

type Panel = { id: string } | { new: true } | null

export default function ContactsPage() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const [params, setParams] = useSearchParams()
  const contacts = useContacts()
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [relation, setRelation] = useState('')
  const [importing, setImporting] = useState(false)

  // ?open=<id> abre una ficha (desde un cumpleaños del calendario)
  useEffect(() => {
    const open = params.get('open')
    if (open) {
      setPanel({ id: open })
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })
  const all = contacts ?? []
  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase()
    return all.filter((c) => (!relation || c.relation === relation) && (!words || `${c.name} ${c.notes} ${c.email}`.toLowerCase().includes(words)))
  }, [all, search, relation])

  const pendingTalks = all
    .map((c) => ({ c, late: contactOverdue(c, today) }))
    .filter((x) => x.late !== null)
    .sort((a, b) => b.late! - a.late!)
  const birthdays = all
    .filter((c) => c.birthday)
    .map((c) => ({ c, on: nextBirthday(c.birthday!, today) }))
    .filter((x) => diffDays(today, x.on) <= 30)
    .sort((a, b) => a.on.localeCompare(b.on))

  const talked = (c: Contact) => void updateRecord('contacts', c.id, { lastContact: today })
  const panelContact = panel && 'id' in panel ? all.find((c) => c.id === panel.id) : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <div className="relative">
          <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-fg-3" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('tasks.search')} aria-label={t('tasks.search')} className={`${field} w-48 pl-7`} />
        </div>
        <select value={relation} onChange={(e) => setRelation(e.target.value)} aria-label={t('contacts.relation')} className={`${field} max-w-44`}>
          <option value="">{t('contacts.allRelations')}</option>
          {RELATIONS.map((r) => (
            <option key={r} value={r}>
              {t(`contacts.relations.${r}`)}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <button type="button" onClick={() => setImporting(true)} className={btn}>
          <IconDeviceMobileDown size={18} aria-hidden />
          {t('contacts.import.button')}
        </button>
        <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('contacts.new')}
        </button>
      </div>

      <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
        {(pendingTalks.length > 0 || birthdays.length > 0) && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <section className="card">
              <h2 className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-xs text-fg-3">
                <IconMessageCircle size={16} aria-hidden />
                {t('contacts.toTalk')}
              </h2>
              {pendingTalks.length === 0 ? (
                <p className="px-3 py-4 text-center text-fg-3">{t('contacts.allGood')}</p>
              ) : (
                <ul>
                  {pendingTalks.slice(0, 5).map(({ c, late }) => (
                    <li key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
                      <button type="button" onClick={() => setPanel({ id: c.id })} className="min-w-0 flex-1 truncate text-left hover:underline">
                        {c.name}
                      </button>
                      <span className="text-xs text-danger">{late === 0 ? t('contacts.dueToday') : t('contacts.late', { count: late! })}</span>
                      <button type="button" onClick={() => talked(c)} className={`${btn} h-7`}>
                        {t('contacts.talkedToday')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card">
              <h2 className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-xs text-fg-3">
                <IconCake size={16} aria-hidden />
                {t('contacts.nextBirthdays')}
              </h2>
              {birthdays.length === 0 ? (
                <p className="px-3 py-4 text-center text-fg-3">{t('contacts.noBirthdays')}</p>
              ) : (
                <ul>
                  {birthdays.map(({ c, on }) => {
                    const age = ageOn(c.birthYear, on)
                    const pendingGifts = c.gifts.filter((g) => !g.done).length
                    return (
                      <li key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
                        <button type="button" onClick={() => setPanel({ id: c.id })} className="min-w-0 flex-1 truncate text-left hover:underline">
                          {c.name}
                          {age !== null && <span className="text-fg-3"> · {t('contacts.turns', { age })}</span>}
                        </button>
                        {pendingGifts > 0 && <span className="text-xs text-fg-3">{t('contacts.giftIdeas', { count: pendingGifts })}</span>}
                        <span className="text-xs font-semibold">{diffDays(today, on) === 0 ? t('home.today') : rtf.format(diffDays(today, on), 'day')}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        <div className="overflow-x-auto card">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
              <tr>
                <th className="px-3 py-2 font-normal">{t('habits.name')}</th>
                <th className="w-28 px-3 py-2 font-normal">{t('contacts.relation')}</th>
                <th className="w-28 px-3 py-2 font-normal">{t('contacts.birthday')}</th>
                <th className="w-36 px-3 py-2 font-normal">{t('contacts.lastContact')}</th>
                <th className="w-32 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-fg-3">
                    {all.length === 0 ? t('contacts.empty') : t('palette.empty')}
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const late = contactOverdue(c, today)
                return (
                  <tr key={c.id} onClick={() => setPanel({ id: c.id })} className="cursor-pointer border-t border-line hover:bg-surface-2">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold" aria-hidden>
                          {c.name
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="truncate">{c.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-fg-2">{t(`contacts.relations.${c.relation}`)}</td>
                    <td className="px-3 py-2 text-fg-2">{c.birthday ? date.format(parseKey(`2000-${c.birthday}`)) : '—'}</td>
                    <td className={`px-3 py-2 ${late !== null ? 'text-danger' : 'text-fg-2'}`}>
                      {c.lastContact ? rtf.format(-diffDays(c.lastContact, today), 'day') : '—'}
                    </td>
                    <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => talked(c)} className={`${btn} h-7 disabled:opacity-40`} disabled={c.lastContact === today}>
                        {t('contacts.talkedToday')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {panel && <ContactPanel key={'id' in panel ? panel.id : 'new'} contact={panelContact} onClose={() => setPanel(null)} />}
      {importing && contacts && <ImportContactsPanel existing={contacts} onClose={() => setImporting(false)} />}
    </div>
  )
}
