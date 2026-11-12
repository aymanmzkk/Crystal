import { createPortal } from 'react-dom'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArchive, IconChevronLeft, IconChevronRight, IconDownload, IconFile, IconLoader2, IconRestore, IconTrash, IconX } from '@tabler/icons-react'
import { fieldLabel, input, textarea } from './ui'
import type { ArchiveRef, DateKey } from '../db/types'
import { isImage, isPdf } from '../lib/files'
import { markOpened } from '../lib/storage'
import { useObjectUrl } from '../lib/images'

// Lo que necesita el visor de cada archivo: sirve para adjuntos y para las fotos de los recuerdos
export interface ViewerItem {
  id: string
  // null = el archivo está archivado fuera de Crystal (se enseña la miniatura y cómo recuperarlo)
  blob: Blob | null
  thumb?: Blob | null
  archive?: ArchiveRef | null
  type: string
  name: string
  date: DateKey | null
  comment: string
}

interface FileViewerProps {
  items: ViewerItem[]
  index: number
  onClose: () => void
  // Si se pasa, se pueden editar la fecha y el comentario
  onChangeMeta?: (id: string, meta: { date: DateKey | null; comment: string }) => void
  onDelete?: (id: string) => void
  // Recuperar un archivo archivado (lo vuelve a traer a Crystal)
  onRecover?: (id: string) => Promise<void>
}

// Visor a pantalla completa: fotos y PDFs, con flechas, fecha y comentario de cada archivo
export function FileViewer({ items, index, onClose, onChangeMeta, onDelete, onRecover }: FileViewerProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(index)
  const item = items[Math.min(current, items.length - 1)]
  const url = useObjectUrl(item?.blob)
  const thumbUrl = useObjectUrl(item && !item.blob ? item.thumb : null)
  const [recovering, setRecovering] = useState(false)
  const id = useId()

  const go = (step: number) => setCurrent((c) => (c + step + items.length) % items.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Que no se cierre también el panel que hay debajo
        e.stopImmediatePropagation()
        onClose()
        return
      }
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  // Se apunta cuándo se abre cada archivo (para recomendar archivar lo que no se usa)
  const itemId = item?.id
  useEffect(() => {
    if (itemId) markOpened(itemId)
  }, [itemId])

  // Si se borra el último archivo, se cierra
  useEffect(() => {
    if (items.length === 0) onClose()
  }, [items.length, onClose])

  if (!item) return null

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={item.name} className="fixed inset-0 z-50 flex animate-[fade-in_0.2s_ease-out] flex-col bg-black/90 text-white backdrop-blur-sm">
      <header className="flex items-center gap-2 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
        {items.length > 1 && (
          <span className="text-xs text-white/60 tabular-nums">
            {current + 1} / {items.length}
          </span>
        )}
        {url && (
          <a href={url} download={item.name} className="inline-flex size-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label={t('files.download')} title={t('files.download')}>
            <IconDownload size={19} aria-hidden />
          </a>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(item.id)} className="inline-flex size-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-red-300" aria-label={t('files.delete')} title={t('files.delete')}>
            <IconTrash size={19} aria-hidden />
          </button>
        )}
        <button type="button" onClick={onClose} autoFocus className="inline-flex size-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label={t('common.close')}>
          <IconX size={20} aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2">
          {url && isImage(item.type) && <img key={item.id} src={url} alt={item.comment || item.name} className="max-h-full max-w-full animate-[pop-in_0.25s_var(--ease-out-soft)] rounded-lg object-contain shadow-2xl" />}
          {url && isPdf(item.type) && <iframe key={item.id} src={url} title={item.name} className="h-full w-full max-w-4xl rounded-lg bg-white" />}
          {!item.blob && (
            // Archivado: la miniatura (si la hay) y dónde está la copia
            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
              {thumbUrl && <img src={thumbUrl} alt={item.comment || item.name} className="max-h-[40vh] rounded-lg object-contain opacity-60" />}
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-5">
                <IconArchive size={30} stroke={1.5} className="text-white/70" aria-hidden />
                <p className="font-medium">{t('storage.viewer.archived')}</p>
                {item.archive && (
                  <p className="text-sm text-white/70">
                    {item.archive.kind === 'folder' ? t('storage.viewer.inFolder', { name: item.archive.targetName }) : t('storage.viewer.inDownloads')}
                    <span className="block font-mono text-xs break-all text-white/50">{item.archive.path}</span>
                  </p>
                )}
                {onRecover && (
                  <button
                    type="button"
                    disabled={recovering}
                    onClick={() => {
                      setRecovering(true)
                      void onRecover(item.id).finally(() => setRecovering(false))
                    }}
                    className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-60"
                  >
                    {recovering ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconRestore size={17} aria-hidden />}
                    {t('storage.recover')}
                  </button>
                )}
              </div>
            </div>
          )}
          {url && !isImage(item.type) && !isPdf(item.type) && (
            <a href={url} download={item.name} className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 px-10 py-8 text-white/80 hover:bg-white/5">
              <IconFile size={40} stroke={1.4} aria-hidden />
              {t('files.download')}
            </a>
          )}
          {items.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={t('files.prev')} className="absolute top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/15 transition hover:bg-black/70 active:scale-95">
                <IconChevronLeft size={22} aria-hidden />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t('files.next')} className="absolute top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/15 transition hover:bg-black/70 active:scale-95">
                <IconChevronRight size={22} aria-hidden />
              </button>
            </>
          )}
        </div>

        {onChangeMeta && (
          // Fecha y comentario: se guardan solos al escribir. Siempre en tema oscuro, como el visor.
          <aside key={item.id} className="theme-dark flex shrink-0 flex-col gap-3 border-t border-line bg-surface p-4 text-fg lg:w-80 lg:border-t-0 lg:border-l">
            <div>
              <label htmlFor={`${id}-date`} className={fieldLabel}>
                {t('files.date')}
              </label>
              <input
                id={`${id}-date`}
                type="date"
                defaultValue={item.date ?? ''}
                onChange={(e) => onChangeMeta(item.id, { date: e.target.value || null, comment: item.comment })}
                className={input}
              />
            </div>
            <div>
              <label htmlFor={`${id}-comment`} className={fieldLabel}>
                {t('files.comment')}
              </label>
              <textarea
                id={`${id}-comment`}
                rows={4}
                defaultValue={item.comment}
                onChange={(e) => onChangeMeta(item.id, { date: item.date, comment: e.target.value })}
                placeholder={t('files.commentPlaceholder')}
                className={textarea}
              />
            </div>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  )
}
