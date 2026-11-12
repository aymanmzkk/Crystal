import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArchive, IconSearch, IconX } from '@tabler/icons-react'
import { btnGhost, btnPrimary, field, pill, segment, segmentGroup } from '../../components/ui'
import type { StorageUsage } from '../../hooks/useStorageUsage'
import { parseKey } from '../../lib/dates'
import { formatBytes } from '../../lib/files'
import { CATEGORIES, type FileCategory, type FileInfo } from '../../lib/storage'
import { useStorageSelection } from '../../store/storageSelection'
import { ArchiveWizard } from './ArchiveWizard'
import { FilePreview, useModuleLabel } from './shared'
import { useOwnerNames } from './useOwnerNames'

type Sort = 'size' | 'date' | 'type'
type Show = 'local' | 'all'

const dayOf = (f: FileInfo) => f.date ?? new Date(f.createdAt).toISOString().slice(0, 10)

// Lista de archivos: filtrar por app y tipo, ordenar, seleccionar y archivar
export function FilesTab({ usage }: { usage: StorageUsage }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const bytes = (n: number) => formatBytes(n, lang)
  const moduleLabel = useModuleLabel()
  const { ids: selected, toggle, set, clear } = useStorageSelection()
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('')
  const [category, setCategory] = useState<FileCategory | ''>('')
  const [sort, setSort] = useState<Sort>('size')
  const [show, setShow] = useState<Show>('local')
  const [wizard, setWizard] = useState(false)
  const owners = useOwnerNames(usage.files)
  const dateFormat = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  const modules = [...new Set(usage.files.map((f) => f.module))]
  const words = query.trim().toLowerCase()
  const list = useMemo(() => {
    const filtered = usage.files.filter(
      (f) =>
        (show === 'all' || f.local) &&
        (!module || f.module === module) &&
        (!category || f.category === category) &&
        (!words || `${f.name} ${f.comment} ${owners.get(f.ownerId) ?? ''}`.toLowerCase().includes(words)),
    )
    return filtered.sort((a, b) =>
      sort === 'size' ? b.size - a.size : sort === 'date' ? dayOf(a).localeCompare(dayOf(b)) : a.category.localeCompare(b.category) || b.size - a.size,
    )
  }, [usage.files, show, module, category, words, owners, sort])

  // Solo se pueden archivar los archivos que siguen en Crystal
  const selectable = list.filter((f) => f.local)
  const chosen = usage.files.filter((f) => selected.has(f.id) && f.local)
  const chosenBytes = chosen.reduce((s, f) => s + f.size, 0)

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 sm:max-w-xs">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-3" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('storage.files.search')} aria-label={t('storage.files.search')} className={`${field} w-full pl-8`} />
        </label>
        <select value={module} onChange={(e) => setModule(e.target.value)} aria-label={t('storage.byModule')} className={`${field} max-w-48`}>
          <option value="">{t('storage.files.allModules')}</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {moduleLabel(m)}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value as FileCategory | '')} aria-label={t('storage.byType')} className={`${field} max-w-48`}>
          <option value="">{t('storage.files.allTypes')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`storage.categories.${c}`)}
            </option>
          ))}
        </select>
        <div role="group" aria-label={t('storage.files.sort.size')} className={segmentGroup}>
          {(['size', 'date', 'type'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={segment(sort === s)}>
              {t(`storage.files.sort.${s}`)}
            </button>
          ))}
        </div>
        <div role="group" className={segmentGroup}>
          {(['local', 'all'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)} className={segment(show === s)}>
              {t(`storage.files.show.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="card py-12 text-center text-sm text-fg-3">{t('storage.files.empty')}</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-4 py-2 text-xs text-fg-3">
            <input
              type="checkbox"
              checked={selectable.length > 0 && selectable.every((f) => selected.has(f.id))}
              onChange={(e) => (e.target.checked ? set([...selected, ...selectable.map((f) => f.id)]) : clear())}
              aria-label={t('storage.files.selectAll')}
            />
            <span>{t('storage.files.selectAll')}</span>
            <span className="ml-auto tabular-nums">{list.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map((f) => {
              const owner = owners.get(f.ownerId)
              return (
                <li key={f.id}>
                  <label className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${f.local ? 'cursor-pointer hover:bg-surface-2/50' : 'opacity-70'}`}>
                    <input type="checkbox" checked={selected.has(f.id)} disabled={!f.local} onChange={() => toggle(f.id)} aria-label={f.comment || f.name} />
                    <FilePreview file={f} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{f.comment || f.name}</span>
                      <span className="block truncate text-xs text-fg-3">
                        {moduleLabel(f.module)}
                        {owner && ` · ${t('storage.files.of', { owner })}`} · {dateFormat.format(parseKey(dayOf(f)))}
                      </span>
                    </span>
                    {f.inTrash && <span className={pill('neutral')}>{t('storage.files.inTrash')}</span>}
                    {f.archive && <span className={pill(f.archive.verifiedAt ? 'success' : 'warning')}>{t('storage.files.archivedBadge')}</span>}
                    <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums">{bytes(f.size)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Barra de selección */}
      {chosen.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6 md:pl-64">
          <div className="pointer-events-auto flex animate-[sheet-in_0.25s_var(--ease-out-soft)] items-center gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-2 shadow-2xl">
            <span className="px-1 text-sm font-medium tabular-nums">{t('storage.files.selected', { count: chosen.length, size: bytes(chosenBytes) })}</span>
            <button type="button" onClick={clear} aria-label={t('storage.files.clear')} title={t('storage.files.clear')} className={btnGhost}>
              <IconX size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => setWizard(true)} className={btnPrimary}>
              <IconArchive size={17} aria-hidden />
              {t('storage.files.archive')}
            </button>
          </div>
        </div>
      )}

      {wizard && <ArchiveWizard files={chosen} onClose={() => setWizard(false)} onDone={clear} />}
    </div>
  )
}
