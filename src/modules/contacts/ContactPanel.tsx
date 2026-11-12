import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnIcon, btnPrimary, fieldError, fieldLabel, input, textarea } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Contact, GiftIdea } from '../../db/types'
import { useToast } from '../../store/toast'

export const RELATIONS: Contact['relation'][] = ['family', 'friend', 'work', 'school', 'other']
const EVERY_OPTIONS = [0, 7, 14, 30, 60, 90]

export function ContactPanel({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [name, setName] = useState(contact?.name ?? '')
  const [relation, setRelation] = useState<Contact['relation']>(contact?.relation ?? 'friend')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  // El input de fecha necesita un año: se usa el de nacimiento o 2000 si no se sabe
  const [birthday, setBirthday] = useState(contact?.birthday ? `${contact.birthYear ?? 2000}-${contact.birthday}` : '')
  const [knowsYear, setKnowsYear] = useState(Boolean(contact?.birthYear))
  const [every, setEvery] = useState(contact?.contactEveryDays ?? 0)
  const [gifts, setGifts] = useState<GiftIdea[]>(contact?.gifts ?? [])
  const [newGift, setNewGift] = useState('')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [nameError, setNameError] = useState(false)

  const addGift = () => {
    if (!newGift.trim()) return
    setGifts((g) => [...g, { id: crypto.randomUUID(), text: newGift.trim(), done: false }])
    setNewGift('')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(true)
      return
    }
    const data = {
      name: name.trim(),
      relation,
      phone: phone.trim(),
      email: email.trim(),
      birthday: birthday ? birthday.slice(5) : null,
      birthYear: birthday && knowsYear ? Number(birthday.slice(0, 4)) : null,
      contactEveryDays: every || null,
      gifts,
      notes: notes.trim(),
    }
    if (contact) await updateRecord('contacts', contact.id, data)
    else await createRecord('contacts', { ...data, lastContact: null })
    onClose()
  }

  async function trash() {
    if (!contact) return
    await moveToTrash('contacts', contact.id)
    showToast({ message: t('calendar.toast.trashed', { name: contact.name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('contacts', contact.id) } })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {contact && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={contact ? t('contacts.editTitle') : t('contacts.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <div>
            <label htmlFor={`${id}-name`} className={fieldLabel}>
              {t('habits.name')}
            </label>
            <input
              id={`${id}-name`}
              autoFocus={!contact}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(false)
              }}
              aria-invalid={nameError}
              className={input}
            />
            {nameError && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-rel`} className={fieldLabel}>
              {t('contacts.relation')}
            </label>
            <select id={`${id}-rel`} value={relation} onChange={(e) => setRelation(e.target.value as Contact['relation'])} className={input}>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`contacts.relations.${r}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={fieldLabel}>
              {t('contacts.phone')}
            </label>
            <input id={`${id}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={fieldLabel}>
              Email
            </label>
            <input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-bday`} className={fieldLabel}>
              {t('contacts.birthday')}
            </label>
            <input id={`${id}-bday`} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={input} />
          </div>
          <label className="flex items-center gap-2 self-end pb-1.5">
            <input type="checkbox" checked={knowsYear} disabled={!birthday} onChange={(e) => setKnowsYear(e.target.checked)} />
            {t('contacts.knowYear')}
          </label>
        </div>

        <div>
          <label htmlFor={`${id}-every`} className={fieldLabel}>
            {t('contacts.every')}
          </label>
          <select id={`${id}-every`} value={every} onChange={(e) => setEvery(Number(e.target.value))} className={input}>
            {EVERY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? t('contacts.noReminder') : t('contacts.everyDays', { count: d })}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={fieldLabel}>{t('contacts.gifts')}</legend>
          <ul className="mb-2 flex flex-col gap-1">
            {gifts.map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={g.done}
                  onChange={() => setGifts((list) => list.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
                  aria-label={`${t('contacts.given')}: ${g.text}`}
                />
                <span className={`flex-1 ${g.done ? 'text-fg-3 line-through' : ''}`}>{g.text}</span>
                <button type="button" onClick={() => setGifts((list) => list.filter((x) => x.id !== g.id))} aria-label={t('contacts.removeGift')} className={`${btnIcon} size-7`}>
                  <IconX size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <input
              value={newGift}
              onChange={(e) => setNewGift(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addGift()
                }
              }}
              placeholder={t('contacts.giftPlaceholder')}
              aria-label={t('contacts.gifts')}
              className={input}
            />
            <button type="button" onClick={addGift} aria-label={t('contacts.addGift')} className={btnIcon}>
              <IconPlus size={18} aria-hidden />
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('contacts.notesPlaceholder')} className={textarea} />
        </div>
      </form>
    </SidePanel>
  )
}
