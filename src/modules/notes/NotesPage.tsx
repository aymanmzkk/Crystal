import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconChevronLeft, IconChevronRight, IconPin, IconPinnedOff, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { btn, btnIcon, btnPrimary, field, segment, textarea } from '../../components/ui'
import { useNotes } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord, upsertRecord } from '../../db/repo'
import type { DateKey, Note } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { addDaysKey, parseKey, toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'
import { AttachmentsToggle } from '../../components/Attachments'

type Tab = 'notes' | 'journal'

export default function NotesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('notes')
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 md:px-6">
        <div role="group" aria-label={t('calendar.viewLabel')} className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
          {(['notes', 'journal'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)} className={segment(tab === v)}>
              {t(`notes.tabs.${v}`)}
            </button>
          ))}
        </div>
      </div>
      {tab === 'notes' ? <NotesTab /> : <JournalTab />}
    </div>
  )
}

// Guarda el texto medio segundo después de dejar de escribir
function useAutosave(value: { title: string; body: string }, save: (v: { title: string; body: string }) => void) {
  const first = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(() => saveRef.current(value), 500)
    return () => clearTimeout(timer)
  }, [value])
}

function NotesTab() {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const notes = useNotes()
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const words = search.trim().toLowerCase()
  const list = (notes ?? [])
    .filter((n) => n.journalDate === null && (!words || `${n.title} ${n.body}`.toLowerCase().includes(words)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  const current = list.find((n) => n.id === selected) ?? (selected ? undefined : list[0])
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })

  async function create() {
    setSearch('')
    setSelected(await createRecord('notes', { title: '', body: '', pinned: false, journalDate: null }))
  }

  async function trash(note: Note) {
    await moveToTrash('notes', note.id)
    setSelected(null)
    showToast({ message: t('calendar.toast.trashed', { name: note.title || t('notes.untitled') }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('notes', note.id) } })
  }

  return (
    <main className="grid min-h-0 w-full flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-line bg-surface md:border-r md:border-b-0">
        <div className="flex gap-1.5 border-b border-line p-2">
          <div className="relative flex-1">
            <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-fg-3" aria-hidden />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('tasks.search')} aria-label={t('tasks.search')} className={`${field} w-full pl-7`} />
          </div>
          <button type="button" onClick={() => void create()} aria-label={t('notes.new')} title={t('notes.new')} className={btnIcon}>
            <IconPlus size={19} aria-hidden />
          </button>
        </div>
        <ul className="max-h-72 overflow-y-auto md:max-h-none md:flex-1">
          {list.length === 0 && <li className="px-3 py-6 text-center text-fg-3">{notes?.length ? t('palette.empty') : t('notes.empty')}</li>}
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setSelected(n.id)}
                aria-current={current?.id === n.id}
                className={`flex w-full flex-col gap-0.5 border-b border-line px-3 py-2 text-left ${current?.id === n.id ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  {n.pinned && <IconPin size={15} className="shrink-0 text-fg-3" aria-label={t('notes.pinned')} />}
                  <span className="truncate">{n.title || t('notes.untitled')}</span>
                </span>
                <span className="flex gap-2 text-xs text-fg-3">
                  <span className="shrink-0">{date.format(n.updatedAt)}</span>
                  <span className="truncate">{n.body.slice(0, 80)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex min-h-80 flex-col bg-surface">
        {current ? (
          <NoteEditor key={current.id} note={current} onTrash={() => void trash(current)} />
        ) : (
          <div className="m-auto text-center">
            <p className="text-fg-2">{t('notes.pick')}</p>
            <button type="button" onClick={() => void create()} className={`mt-3 ${btnPrimary}`}>
              <IconPlus size={18} aria-hidden />
              {t('notes.new')}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function NoteEditor({ note, onTrash }: { note: Note; onTrash: () => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ title: note.title, body: note.body })
  useAutosave(draft, (v) => void updateRecord('notes', note.id, v))
  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <input
          value={draft.title}
          autoFocus={!note.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={t('notes.titlePlaceholder')}
          aria-label={t('tasks.form.title')}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        <button type="button" onClick={() => void updateRecord('notes', note.id, { pinned: !note.pinned })} aria-pressed={note.pinned} className={btn}>
          {note.pinned ? <IconPinnedOff size={18} aria-hidden /> : <IconPin size={18} aria-hidden />}
          {note.pinned ? t('notes.unpin') : t('notes.pin')}
        </button>
        <button type="button" onClick={onTrash} aria-label={t('calendar.form.delete')} className={btnIcon}>
          <IconTrash size={18} aria-hidden />
        </button>
      </div>
      <textarea
        value={draft.body}
        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        placeholder={t('notes.bodyPlaceholder')}
        aria-label={t('notes.body')}
        className="min-h-72 flex-1 resize-none bg-transparent px-3 py-3 leading-relaxed outline-none"
      />
      <div className="border-t border-line px-3 py-2">
        <AttachmentsToggle ownerTable="notes" ownerId={note.id} />
      </div>
    </>
  )
}

function JournalTab() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const [day, setDay] = useState(today)
  const notes = useNotes()
  const entries = (notes ?? []).filter((n) => n.journalDate !== null)
  const entry = entries.find((n) => n.journalDate === day)
  const title = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseKey(day))
  const recent = [...entries].filter((n) => n.body.trim()).sort((a, b) => b.journalDate!.localeCompare(a.journalDate!)).slice(0, 12)
  const short = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <main className="grid w-full flex-1 grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      <section className="flex flex-col card">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <button type="button" onClick={() => setDay((d) => addDaysKey(d, -1))} aria-label={t('calendar.prev')} className={btnIcon}>
            <IconChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" onClick={() => setDay((d) => addDaysKey(d, 1))} disabled={day >= today} aria-label={t('calendar.next')} className={`${btnIcon} disabled:opacity-40`}>
            <IconChevronRight size={20} aria-hidden />
          </button>
          <h2 className="flex-1 font-semibold first-letter:uppercase">{title}</h2>
          {day !== today && (
            <button type="button" onClick={() => setDay(today)} className={btn}>
              {t('calendar.today')}
            </button>
          )}
        </div>
        {notes && <JournalEditor key={day} day={day} initial={entry?.body ?? ''} />}
      </section>
      <aside className="card">
        <h2 className="border-b border-line px-3 py-2 text-xs text-fg-3">{t('notes.recent')}</h2>
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-fg-3">{t('notes.noEntries')}</p>
        ) : (
          <ul>
            {recent.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => setDay(n.journalDate!)} className={`block w-full border-b border-line px-3 py-2 text-left hover:bg-surface-2 ${n.journalDate === day ? 'bg-surface-2' : ''}`}>
                  <span className="block text-xs text-fg-3 first-letter:uppercase">{short.format(parseKey(n.journalDate!))}</span>
                  <span className="block truncate">{n.body.slice(0, 60)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </main>
  )
}

// Una entrada por día con id fijo ("journal:<fecha>") para que no se duplique al sincronizar
function JournalEditor({ day, initial }: { day: DateKey; initial: string }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ title: '', body: initial })
  useAutosave(draft, (v) => void upsertRecord('notes', `journal:${day}`, { title: '', body: v.body, pinned: false, journalDate: day }))
  return (
    <textarea
      value={draft.body}
      onChange={(e) => setDraft({ title: '', body: e.target.value })}
      placeholder={t('notes.journalPlaceholder')}
      aria-label={t('notes.tabs.journal')}
      className={`${textarea} min-h-80 flex-1 resize-none rounded-none border-0 px-3 py-3 leading-relaxed`}
    />
  )
}
