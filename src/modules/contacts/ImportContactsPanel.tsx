import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconAddressBook, IconCake, IconFileImport, IconLoader2, IconLock } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnPrimary, fieldLabel, input, pill } from '../../components/ui'
import { createRecord, updateRecord } from '../../db/repo'
import type { Contact } from '../../db/types'
import { useToast } from '../../store/toast'
import { RELATIONS } from './ContactPanel'
import { canPickContacts, parseVCard, pickContacts, planImport, type ImportRow } from './importContacts'

const STATUS_TONE = { new: 'accent', update: 'success', same: 'neutral' } as const

// Traer contactos del móvil: con el selector de Android o con un archivo .vcf. Se revisa antes de guardar nada.
export function ImportContactsPanel({ existing, onClose }: { existing: Contact[]; onClose: () => void }) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [relation, setRelation] = useState<Contact['relation']>('friend')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const picker = canPickContacts()

  const load = (list: ReturnType<typeof parseVCard>) => {
    if (list.length === 0) return setError(t('contacts.import.none'))
    const plan = planImport(list, existing)
    setRows(plan)
    // Por defecto se marcan los nuevos y los que completan datos
    setSelected(new Set(plan.flatMap((r, i) => (r.status === 'same' ? [] : [i]))))
    setError('')
  }

  async function fromPhone() {
    try {
      load(await pickContacts())
    } catch {
      setError(t('contacts.import.pickerError'))
    }
  }

  async function fromFile(file: File | undefined) {
    if (!file) return
    load(parseVCard(await file.text()))
  }

  async function save() {
    if (!rows) return
    setBusy(true)
    let added = 0
    let updated = 0
    for (const i of selected) {
      const r = rows[i]
      if (r.status === 'new') {
        await createRecord('contacts', {
          name: r.contact.name, relation, phone: r.contact.phone, email: r.contact.email, birthday: r.contact.birthday, birthYear: r.contact.birthYear,
          lastContact: null, contactEveryDays: null, gifts: [], notes: '',
        })
        added++
      } else if (r.status === 'update' && r.existingId) {
        await updateRecord('contacts', r.existingId, r.changes)
        updated++
      }
    }
    setBusy(false)
    showToast({ message: t('contacts.import.done', { added, updated }) })
    onClose()
  }

  const toggle = (i: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const footer = rows ? (
    <>
      <button type="button" onClick={() => void save()} disabled={busy || selected.size === 0} className={`${btnPrimary} disabled:opacity-50`}>
        {busy && <IconLoader2 size={17} className="animate-spin" aria-hidden />}
        {t('contacts.import.save', { count: selected.size })}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
    </>
  ) : undefined

  return (
    <SidePanel title={t('contacts.import.title')} onClose={onClose} footer={footer}>
      {!rows && (
        <div className="flex flex-col gap-3">
          {picker && (
            <button type="button" onClick={() => void fromPhone()} className="flex items-start gap-3 rounded-xl border border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] p-3 text-left">
              <IconAddressBook size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-medium">{t('contacts.import.fromPhone')}</span>
                <span className="block text-xs text-fg-3">{t('contacts.import.fromPhoneHint')}</span>
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" hidden onChange={(e) => (void fromFile(e.target.files?.[0]), (e.target.value = ''))} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-start gap-3 rounded-xl border border-line p-3 text-left hover:border-line-strong">
            <IconFileImport size={22} className="mt-0.5 shrink-0 text-fg-3" aria-hidden />
            <span>
              <span className="block font-medium">{t('contacts.import.fromFile')}</span>
              <span className="block text-xs text-fg-3">{t('contacts.import.fromFileHint')}</span>
            </span>
          </button>
          {!picker && <p className="text-xs text-fg-3">{t('contacts.import.noPicker')}</p>}
          <p className="flex gap-2 text-xs text-fg-3">
            <IconLock size={15} className="shrink-0" aria-hidden />
            {t('contacts.import.privacy')}
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {rows && (
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="import-relation" className={fieldLabel}>
              {t('contacts.import.relationForNew')}
            </label>
            <select id="import-relation" value={relation} onChange={(e) => setRelation(e.target.value as Contact['relation'])} className={input}>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`contacts.relations.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
            {rows.map((r, i) => (
              <li key={i}>
                <label className={`flex items-center gap-3 px-3 py-2.5 ${r.status === 'same' ? 'opacity-60' : 'cursor-pointer hover:bg-surface-2/50'}`}>
                  <input type="checkbox" checked={selected.has(i)} disabled={r.status === 'same'} onChange={() => toggle(i)} aria-label={r.contact.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.contact.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-fg-3">
                      {[r.contact.phone, r.contact.email].filter(Boolean).join(' · ')}
                      {r.contact.birthday && (
                        <span className="inline-flex items-center gap-0.5">
                          <IconCake size={12} aria-hidden />
                          {r.contact.birthday.split('-').reverse().join('/')}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className={pill(STATUS_TONE[r.status])}>{t(`contacts.import.status.${r.status}`)}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-3">{t('contacts.import.reviewHint')}</p>
        </div>
      )}
    </SidePanel>
  )
}
