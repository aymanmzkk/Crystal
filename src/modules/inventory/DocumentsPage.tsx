import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary, field, fieldError } from '../../components/ui'
import { useDocuments } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { DocumentRecord } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { diffDays, toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'
import { ExpiryBadge, SOON_DAYS } from './ExpiryBadge'
import { Attachments } from '../../components/Attachments'

const KINDS: DocumentRecord['kind'][] = ['id', 'passport', 'license', 'insurance', 'card', 'other']

export default function DocumentsPage() {
  const { t } = useTranslation()
  const today = toDateKey(useNow())
  const showToast = useToast((s) => s.show)
  const documents = useDocuments()
  const [editing, setEditing] = useState<DocumentRecord | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DocumentRecord['kind']>('id')
  const [expires, setExpires] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(false)

  // Primero lo que caduca antes; lo que no caduca, al final
  const list = [...(documents ?? [])].sort((a, b) => (a.expires ?? '9999').localeCompare(b.expires ?? '9999'))
  const urgent = list.filter((d) => d.expires && diffDays(today, d.expires) <= SOON_DAYS)

  const reset = () => {
    setEditing(null)
    setName('')
    setExpires('')
    setNotes('')
    setError(false)
  }

  function edit(doc: DocumentRecord) {
    setEditing(doc)
    setName(doc.name)
    setKind(doc.kind)
    setExpires(doc.expires ?? '')
    setNotes(doc.notes)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(true)
      return
    }
    const data = { name: name.trim(), kind, expires: expires || null, notes: notes.trim() }
    if (editing) await updateRecord('documents', editing.id, data)
    else await createRecord('documents', data)
    reset()
  }

  async function trash(doc: DocumentRecord) {
    await moveToTrash('documents', doc.id)
    showToast({ message: t('calendar.toast.trashed', { name: doc.name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('documents', doc.id) } })
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      {urgent.length > 0 && (
        <p className="rounded-app border border-danger px-3 py-2 text-danger" role="status">
          {t('documents.urgent', { count: urgent.length, names: urgent.map((d) => d.name).join(', ') })}
        </p>
      )}

      <form onSubmit={(e) => void save(e)} noValidate className="flex flex-wrap items-center gap-2 card p-3">
        <select value={kind} onChange={(e) => setKind(e.target.value as DocumentRecord['kind'])} aria-label={t('habits.kind')} className={`${field} w-40`}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`documents.kinds.${k}`)}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(false)
          }}
          placeholder={t('documents.namePlaceholder')}
          aria-label={t('habits.name')}
          aria-invalid={error}
          className={`${field} min-w-40 flex-1`}
        />
        <label className="flex items-center gap-1.5 text-fg-2">
          {t('documents.expires')}
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${field} w-36`} />
        </label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('documents.notesPlaceholder')} aria-label={t('calendar.form.notes')} className={`${field} min-w-40 flex-1`} />
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
            {t('files.scans')} · {editing.name}
          </p>
          <Attachments key={editing.id} ownerTable="documents" ownerId={editing.id} variant="list" compact />
        </section>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
            <tr>
              <th className="px-3 py-2 font-normal">{t('habits.name')}</th>
              <th className="w-40 px-3 py-2 font-normal">{t('habits.kind')}</th>
              <th className="w-52 px-3 py-2 font-normal">{t('documents.expires')}</th>
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-fg-3">
                  {t('documents.empty')}
                </td>
              </tr>
            )}
            {list.map((doc) => (
              <tr key={doc.id} onClick={() => edit(doc)} className={`cursor-pointer border-t border-line hover:bg-surface-2 ${editing?.id === doc.id ? 'bg-surface-2' : ''}`}>
                <td className="px-3 py-2">
                  <span className="block truncate">{doc.name}</span>
                  {doc.notes && <span className="block truncate text-xs text-fg-3">{doc.notes}</span>}
                </td>
                <td className="px-3 py-2 text-fg-2">{t(`documents.kinds.${doc.kind}`)}</td>
                <td className="px-3 py-2">
                  <ExpiryBadge date={doc.expires} today={today} />
                </td>
                <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => void trash(doc)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-7`}>
                    <IconTrash size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-3">{t('documents.hint')}</p>
    </main>
  )
}
