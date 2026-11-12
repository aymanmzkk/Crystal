import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArchive, IconFileTypePdf, IconFile, IconLoader2, IconPaperclip, IconUpload } from '@tabler/icons-react'
import { FileViewer } from './FileViewer'
import { useAttachments } from '../db/hooks'
import { moveToTrash, restoreFromTrash, updateRecord } from '../db/repo'
import type { Attachment, TableName } from '../db/types'
import { recoverWithToast } from '../lib/archiveUi'
import { addAttachments, formatBytes, isImage, isPdf } from '../lib/files'
import { useObjectUrl } from '../lib/images'
import { useToast } from '../store/toast'

interface AttachmentsProps {
  ownerTable: TableName
  // Sin id (registro nuevo sin guardar) se pide guardar primero
  ownerId: string | undefined
  slot?: string
  // Tipos que se aceptan, como en <input accept>: "image/*", "image/*,application/pdf"...
  accept?: string
  // Texto del botón de subir
  label?: string
  // grid: miniaturas cuadradas (fotos); list: filas con nombre y tamaño (billetes, PDFs)
  variant?: 'grid' | 'list'
  // Fecha que se pone a los archivos nuevos
  defaultDate?: string | null
  compact?: boolean
}

// Miniatura de un adjunto. Si está archivado fuera de Crystal se ve la miniatura guardada (o un icono) con una marca.
export function AttachmentThumb({ file, className = '' }: { file: Pick<Attachment, 'thumb' | 'blob' | 'type' | 'name' | 'comment'>; className?: string }) {
  const url = useObjectUrl(file.thumb ?? (isImage(file.type) ? file.blob : undefined))
  const Icon = isPdf(file.type) ? IconFileTypePdf : IconFile
  return (
    <span className={`relative flex items-center justify-center overflow-hidden bg-surface-2 ${className}`}>
      {url ? (
        <img src={url} alt={file.comment || file.name} loading="lazy" className={`size-full object-cover ${file.blob ? '' : 'opacity-70'}`} />
      ) : (
        <Icon size={22} stroke={1.5} className={isPdf(file.type) ? 'text-danger' : 'text-fg-3'} aria-hidden />
      )}
      {!file.blob && (
        <span className="absolute top-1 left-1 inline-flex size-5 items-center justify-center rounded-md bg-black/60 text-white">
          <IconArchive size={12} aria-hidden />
        </span>
      )}
    </span>
  )
}

const Thumb = AttachmentThumb

// Subir y ver archivos de cualquier registro: arrastrar y soltar, miniaturas, visor con fecha y comentario
export function Attachments({ ownerTable, ownerId, slot = '', accept = 'image/*,application/pdf', label, variant = 'grid', defaultDate = null, compact = false }: AttachmentsProps) {
  const { t, i18n } = useTranslation()
  const files = useAttachments(ownerTable, ownerId, slot)
  const showToast = useToast((s) => s.show)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })

  if (!ownerId) return <p className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-center text-xs text-fg-3">{t('files.saveFirst')}</p>

  async function upload(list: FileList | File[]) {
    if (!ownerId || list.length === 0) return
    setBusy(true)
    const failed = await addAttachments({ table: ownerTable, id: ownerId }, slot, Array.from(list), defaultDate)
    setBusy(false)
    if (failed) showToast({ message: t('files.failed', { count: failed }) })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void upload(e.dataTransfer.files)
  }

  async function remove(id: string) {
    const file = files?.find((f) => f.id === id)
    await moveToTrash('attachments', id)
    showToast({ message: t('files.trashed', { name: file?.name ?? '' }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('attachments', id) } })
  }

  const uploadButton = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      disabled={busy}
      className={`flex items-center justify-center gap-2 rounded-xl border border-dashed text-xs font-medium transition-[border-color,background-color,color] duration-150 ${
        over ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-fg' : 'border-line-strong text-fg-3 hover:border-accent hover:text-fg'
      } ${variant === 'grid' ? 'aspect-square flex-col' : compact ? 'h-9 px-3' : 'h-11 px-3'}`}
    >
      {busy ? <IconLoader2 size={18} className="animate-spin" aria-hidden /> : <IconUpload size={18} aria-hidden />}
      <span>{busy ? t('files.uploading') : (label ?? t('files.add'))}</span>
    </button>
  )

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} multiple hidden onChange={(e) => (void upload(e.target.files ?? []), (e.target.value = ''))} />

      {variant === 'grid' ? (
        <ul className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {(files ?? []).map((file, i) => (
            <li key={file.id} className="animate-[pop-in_0.25s_var(--ease-out-soft)]">
              <button type="button" onClick={() => setOpen(i)} className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface-2" title={file.comment || file.name}>
                <Thumb file={file} className="size-full transition-transform duration-300 group-hover:scale-105" />
                {!isImage(file.type) && <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[0.625rem] text-white">{file.name}</span>}
              </button>
            </li>
          ))}
          <li>{uploadButton}</li>
        </ul>
      ) : (
        <div className="flex flex-col gap-2">
          {(files ?? []).length > 0 && (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
              {(files ?? []).map((file, i) => (
                <li key={file.id} className="animate-[pop-in_0.25s_var(--ease-out-soft)]">
                  <button type="button" onClick={() => setOpen(i)} className="flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors hover:bg-surface-2">
                    <Thumb file={file} className="size-10 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{file.comment || file.name}</span>
                      <span className="block text-xs text-fg-3">
                        {[file.date && date.format(new Date(`${file.date}T00:00`)), formatBytes(file.size, i18n.language)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <IconPaperclip size={16} className="shrink-0 text-fg-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploadButton}
        </div>
      )}

      {open !== null && files && files.length > 0 && (
        <FileViewer
          items={files}
          index={open}
          onClose={() => setOpen(null)}
          onDelete={(id) => void remove(id)}
          onChangeMeta={(id, meta) => void updateRecord('attachments', id, meta)}
          onRecover={recoverWithToast}
        />
      )}
    </div>
  )
}

// Portada de un registro (la primera foto de un apartado), para tarjetas
export function AttachmentCover({ ownerTable, ownerId, slot, className = '' }: { ownerTable: TableName; ownerId: string; slot: string; className?: string }) {
  const files = useAttachments(ownerTable, ownerId, slot)
  const cover = files && [...files].reverse().find((f) => isImage(f.type))
  const url = useObjectUrl(cover?.blob ?? cover?.thumb)
  if (!url) return null
  return <img src={url} alt="" className={`object-cover ${className}`} />
}

// Botón "Archivos (N)" que despliega los adjuntos debajo: para tarjetas y filas donde no cabe un bloque fijo
export function AttachmentsToggle({ ownerTable, ownerId, slot = '', label, accept, defaultOpen = false }: { ownerTable: TableName; ownerId: string; slot?: string; label?: string; accept?: string; defaultOpen?: boolean }) {
  const { t } = useTranslation()
  const files = useAttachments(ownerTable, ownerId, slot)
  const [open, setOpen] = useState(defaultOpen)
  const count = files?.length ?? 0
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <IconPaperclip size={15} aria-hidden />
        {label ?? t('files.attachments')}
        {count > 0 && <span className="rounded-full bg-surface-3 px-1.5 text-[0.625rem] text-fg-2 tabular-nums">{count}</span>}
      </button>
      {open && (
        <div className="mt-2 animate-[pop-in_0.2s_var(--ease-out-soft)]">
          <Attachments ownerTable={ownerTable} ownerId={ownerId} slot={slot} variant="list" compact accept={accept} />
        </div>
      )}
    </div>
  )
}
