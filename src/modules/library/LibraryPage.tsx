import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBook, IconDeviceTv, IconMovie, IconStar, IconTrash } from '@tabler/icons-react'
import { StatTile } from '../../components/StatTile'
import { btnIcon, btnPrimary, field, segment } from '../../components/ui'
import { useLibrary } from '../../db/hooks'
import { createRecord, moveToTrash, updateRecord } from '../../db/repo'
import type { LibraryItem } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { toDateKey } from '../../lib/dates'

const KINDS: LibraryItem['kind'][] = ['book', 'series', 'movie']
const STATUSES: LibraryItem['status'][] = ['doing', 'want', 'done']
const KIND_ICON = { book: IconBook, series: IconDeviceTv, movie: IconMovie }

export default function LibraryPage() {
  const { t } = useTranslation()
  const today = toDateKey(useNow())
  const items = useLibrary()
  const [kind, setKind] = useState<LibraryItem['kind'] | 'all'>('all')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [newKind, setNewKind] = useState<LibraryItem['kind']>('book')
  const all = items ?? []
  const shown = all.filter((i) => kind === 'all' || i.kind === kind)
  const year = today.slice(0, 4)
  const doneThisYear = all.filter((i) => i.status === 'done' && i.finishedAt?.startsWith(year))

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createRecord('library', { title: title.trim(), author: author.trim(), kind: newKind, status: 'want', rating: 0, finishedAt: null, notes: '' })
    setTitle('')
    setAuthor('')
  }

  const setStatus = (item: LibraryItem, status: LibraryItem['status']) =>
    void updateRecord('library', item.id, { status, finishedAt: status === 'done' ? (item.finishedAt ?? today) : null })

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <StatTile key={k} label={t(`library.doneThisYear.${k}`, { year })} value={String(doneThisYear.filter((i) => i.kind === k).length)} />
        ))}
      </div>
      <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-center gap-2 card p-3">
        <select value={newKind} onChange={(e) => setNewKind(e.target.value as LibraryItem['kind'])} aria-label={t('habits.kind')} className={`${field} w-28`}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`library.kinds.${k}`)}
            </option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('library.titlePlaceholder')} aria-label={t('tasks.form.title')} className={`${field} min-w-48 flex-1`} />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('library.author')} aria-label={t('library.author')} className={`${field} w-44`} />
        <button type="submit" className={btnPrimary}>
          {t('finance.add')}
        </button>
      </form>
      <div role="group" aria-label={t('school.filter')} className="flex w-fit gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
        {(['all', ...KINDS] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={segment(kind === k)}>
            {k === 'all' ? t('library.all') : t(`library.kindsPlural.${k}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {STATUSES.map((status) => {
          const list = shown.filter((i) => i.status === status).sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '') || a.title.localeCompare(b.title))
          return (
            <section key={status} className="card">
              <h2 className="flex justify-between border-b border-line px-3 py-2 text-xs text-fg-3">
                <span>{t(`library.statuses.${status}`)}</span>
                <span>{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-fg-3">{t('library.emptyColumn')}</p>
              ) : (
                <ul>
                  {list.map((item) => {
                    const Icon = KIND_ICON[item.kind]
                    return (
                      <li key={item.id} className="group flex flex-col gap-1 border-b border-line px-3 py-2 last:border-b-0">
                        <span className="flex items-center gap-2">
                          <Icon size={18} className="shrink-0 text-fg-3" aria-label={t(`library.kinds.${item.kind}`)} />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          <button type="button" onClick={() => void moveToTrash('library', item.id)} aria-label={t('calendar.form.delete')} className={`${btnIcon} size-6 md:opacity-0 md:group-hover:opacity-100`}>
                            <IconTrash size={15} aria-hidden />
                          </button>
                        </span>
                        {item.author && <span className="pl-6 text-xs text-fg-3">{item.author}</span>}
                        <span className="flex items-center gap-2 pl-6">
                          <select value={item.status} onChange={(e) => setStatus(item, e.target.value as LibraryItem['status'])} aria-label={t('tasks.form.status')} className={`${field} h-7 text-xs`}>
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {t(`library.statuses.${s}`)}
                              </option>
                            ))}
                          </select>
                          {item.status === 'done' && (
                            <span className="flex" role="group" aria-label={t('library.rating')}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => void updateRecord('library', item.id, { rating: item.rating === n ? 0 : n })}
                                  aria-label={t('library.stars', { count: n })}
                                  aria-pressed={item.rating >= n}
                                  className={item.rating >= n ? 'text-fg' : 'text-fg-3 hover:text-fg-2'}
                                >
                                  <IconStar size={18} fill={item.rating >= n ? 'currentColor' : 'none'} aria-hidden />
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </main>
  )
}
