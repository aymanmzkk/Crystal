import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconMapPin, IconPhoto, IconPhotoPlus, IconPlane, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { AttachmentThumb } from '../../components/Attachments'
import { FileViewer, type ViewerItem } from '../../components/FileViewer'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, field, fieldError, fieldLabel, input, segment, segmentGroup, textarea, toolbar } from '../../components/ui'
import { useAttachmentsByOwner, useMemories, useTrips } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { ArchiveRef, Attachment, DateKey, Memory } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { recoverWithToast } from '../../lib/archiveUi'
import { resizeImage } from '../../lib/images'
import { parseKey, toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'

type Panel = { id: string } | { new: true } | null
type View = 'memories' | 'photos'

// Las fotos de los recuerdos son adjuntos de la tabla attachments (ownerTable 'memories', apartado 'photos')
const SLOT = 'photos'

// Foto de un recuerdo para el visor: si no tiene fecha propia, la del recuerdo
const toViewerItem = (memory: Memory, photo: Attachment, i: number): ViewerItem => ({
  id: photo.id,
  blob: photo.blob,
  thumb: photo.thumb,
  archive: photo.archive,
  type: photo.type,
  name: `${memory.title} · ${i + 1}`,
  date: photo.date ?? memory.date,
  comment: photo.comment,
})

export default function MemoriesPage() {
  const { t, i18n } = useTranslation()
  const memories = useMemories()
  const photosByMemory = useAttachmentsByOwner('memories', SLOT)
  const trips = useTrips()
  const [panel, setPanel] = useState<Panel>(null)
  const [view, setView] = useState<View>('memories')
  const [tripFilter, setTripFilter] = useState('')
  const [viewer, setViewer] = useState<number | null>(null)
  const list = [...(memories ?? [])].reverse().filter((m) => !tripFilter || m.tripId === tripFilter)
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' })
  const panelMemory = panel && 'id' in panel ? memories?.find((m) => m.id === panel.id) : undefined
  const tripMap = new Map((trips ?? []).map((trip) => [trip.id, trip]))
  const photosOf = (memoryId: string) => photosByMemory?.get(memoryId) ?? []

  // Recuerdos agrupados por mes
  const groups: { key: string; label: string; items: Memory[] }[] = []
  for (const m of list) {
    const key = m.date.slice(0, 7)
    if (groups.at(-1)?.key !== key) groups.push({ key, label: monthFormat.format(parseKey(m.date)), items: [] })
    groups.at(-1)!.items.push(m)
  }

  // Todas las fotos, la más reciente primero
  const photos = list
    .flatMap((m) => photosOf(m.id).map((p, i) => ({ memory: m, photo: p, item: toViewerItem(m, p, i) })))
    .sort((a, b) => (b.item.date ?? '').localeCompare(a.item.date ?? ''))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`${toolbar} border-b border-line`}>
        <div role="group" aria-label={t('apps.memories')} className={segmentGroup}>
          {(['memories', 'photos'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={segment(view === v)}>
              {v === 'memories' ? t('memories.count', { count: list.length }) : t('memories.photos', { count: photos.length })}
            </button>
          ))}
        </div>
        {(trips ?? []).length > 0 && (
          <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)} aria-label={t('memories.trip')} className={`${field} max-w-52`}>
            <option value="">{t('memories.allTrips')}</option>
            {(trips ?? []).map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.name}
              </option>
            ))}
          </select>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
          <IconPlus size={18} aria-hidden />
          {t('memories.new')}
        </button>
      </div>
      <main className="w-full flex-1 p-4 md:p-6">
        {memories && list.length === 0 && (
          <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-3">
              <IconPhoto size={28} stroke={1.5} aria-hidden />
            </span>
            <p className="text-fg-2">{t('memories.empty')}</p>
            <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
              <IconPhotoPlus size={18} aria-hidden />
              {t('memories.newTitle')}
            </button>
          </div>
        )}

        {view === 'memories' &&
          groups.map((g) => (
            <section key={g.key} className="mb-8">
              <h2 className="eyebrow mb-3">{g.label}</h2>
              <ul className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {g.items.map((m) => {
                  const trip = m.tripId ? tripMap.get(m.tripId) : undefined
                  const own = photosOf(m.id)
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => setPanel({ id: m.id })} className="card card-hover group flex w-full flex-col overflow-hidden text-left">
                        <span className="relative block overflow-hidden">
                          {own[0] ? (
                            <AttachmentThumb file={own[0]} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <span className="flex aspect-[4/3] w-full items-center justify-center bg-surface-2 text-fg-3">
                              <IconPhoto size={28} stroke={1.4} aria-hidden />
                            </span>
                          )}
                          {own.length > 1 && (
                            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md">
                              <IconPhoto size={12} aria-hidden />
                              {own.length}
                            </span>
                          )}
                        </span>
                        <span className="flex flex-col gap-0.5 p-3">
                          <span className="truncate font-semibold">{m.title}</span>
                          <span className="text-xs text-fg-3">{date.format(parseKey(m.date))}</span>
                          {(m.place || trip) && (
                            <span className="mt-1 flex items-center gap-1 truncate text-xs text-fg-2">
                              {trip ? <IconPlane size={13} aria-hidden /> : <IconMapPin size={13} aria-hidden />}
                              {[m.place, trip?.name].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

        {view === 'photos' && (
          <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:gap-2 lg:grid-cols-6">
            {photos.map(({ photo, item }, i) => (
              <li key={photo.id} className="animate-[pop-in_0.3s_var(--ease-out-soft)]">
                <button type="button" onClick={() => setViewer(i)} className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-surface-2" title={item.comment || item.name}>
                  <AttachmentThumb file={photo} className="size-full transition-transform duration-500 group-hover:scale-105" />
                  {item.comment && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1 text-left text-[0.6875rem] text-white">{item.comment}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      {viewer !== null && photos.length > 0 && (
        <FileViewer
          items={photos.map((x) => x.item)}
          index={viewer}
          onClose={() => setViewer(null)}
          onChangeMeta={(id, meta) => void updateRecord('attachments', id, meta)}
          onRecover={recoverWithToast}
        />
      )}
      {panel && photosByMemory && (
        <MemoryPanel key={'id' in panel ? panel.id : 'new'} memory={panelMemory} initialPhotos={panelMemory ? photosOf(panelMemory.id) : []} onClose={() => setPanel(null)} />
      )}
    </div>
  )
}

// Foto en el formulario: las que ya existen (adjuntos) y las nuevas que todavía no se han guardado
interface DraftPhoto {
  id: string
  isNew: boolean
  blob: Blob | null
  thumb: Blob | null
  width: number
  height: number
  date: DateKey | null
  comment: string
  archive: ArchiveRef | null
}

const toDraft = (a: Attachment): DraftPhoto => ({ id: a.id, isNew: false, blob: a.blob, thumb: a.thumb, width: a.width, height: a.height, date: a.date, comment: a.comment, archive: a.archive })

function MemoryPanel({ memory, initialPhotos, onClose }: { memory?: Memory; initialPhotos: Attachment[]; onClose: () => void }) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const today = toDateKey(useNow())
  const trips = useTrips()
  const [title, setTitle] = useState(memory?.title ?? '')
  const [date, setDate] = useState(memory?.date ?? today)
  const [place, setPlace] = useState(memory?.place ?? '')
  const [tripId, setTripId] = useState(memory?.tripId ?? '')
  const [notes, setNotes] = useState(memory?.notes ?? '')
  const [photos, setPhotos] = useState<DraftPhoto[]>(() => initialPhotos.map(toDraft))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewer, setViewer] = useState<number | null>(null)
  const [over, setOver] = useState(false)

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setLoading(true)
    try {
      const added: DraftPhoto[] = []
      for (const f of [...files].filter((x) => x.type.startsWith('image/'))) {
        const full = await resizeImage(f)
        const thumb = await resizeImage(full.blob, 420, 0.75)
        // Cada foto nueva lleva la fecha del recuerdo; se puede cambiar luego en el visor
        added.push({ id: crypto.randomUUID(), isNew: true, blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height, date, comment: '', archive: null })
      }
      setPhotos((p) => [...p, ...added])
    } catch {
      setError(t('memories.errors.image'))
    }
    setLoading(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('calendar.form.errors.title'))
      return
    }
    const data = { title: title.trim(), date, place: place.trim(), tripId: tripId || null, notes: notes.trim() }
    let memoryId = memory?.id
    if (memoryId) await updateRecord('memories', memoryId, data)
    else memoryId = await createRecord('memories', data)
    // Fotos quitadas: a la papelera (se pueden restaurar)
    const kept = new Set(photos.map((p) => p.id))
    for (const old of initialPhotos) if (!kept.has(old.id)) await moveToTrash('attachments', old.id)
    // Fotos nuevas: se guardan como adjuntos; las que ya estaban, solo si cambió la fecha o el comentario
    for (const [i, p] of photos.entries()) {
      if (p.isNew && p.blob) {
        await createRecord('attachments', {
          ownerTable: 'memories', ownerId: memoryId, slot: SLOT, name: `${title.trim()} ${i + 1}.jpg`, type: 'image/jpeg', size: p.blob.size,
          blob: p.blob, thumb: p.thumb, width: p.width, height: p.height, date: p.date, comment: p.comment, archive: null,
        })
      } else {
        const before = initialPhotos.find((x) => x.id === p.id)
        if (before && (before.date !== p.date || before.comment !== p.comment)) await updateRecord('attachments', p.id, { date: p.date, comment: p.comment })
      }
    }
    onClose()
  }

  async function trash() {
    if (!memory) return
    await moveToTrash('memories', memory.id)
    showToast({ message: t('calendar.toast.trashed', { name: memory.title }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('memories', memory.id) } })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary} disabled={loading}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {memory && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={memory ? t('memories.editTitle') : t('memories.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-title`} className={fieldLabel}>
            {t('tasks.form.title')}
          </label>
          <input id={`${id}-title`} autoFocus={!memory} value={title} onChange={(e) => (setTitle(e.target.value), setError(''))} placeholder={t('memories.titlePlaceholder')} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-date`} className={fieldLabel}>
              {t('calendar.form.date')}
            </label>
            <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-place`} className={fieldLabel}>
              {t('memories.place')}
            </label>
            <input id={`${id}-place`} value={place} onChange={(e) => setPlace(e.target.value)} className={input} />
          </div>
        </div>
        {(trips ?? []).length > 0 && (
          <div>
            <label htmlFor={`${id}-trip`} className={fieldLabel}>
              {t('memories.trip')}
            </label>
            <select id={`${id}-trip`} value={tripId} onChange={(e) => setTripId(e.target.value)} className={input}>
              <option value="">{t('memories.noTrip')}</option>
              {(trips ?? []).map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <fieldset>
          <legend className={fieldLabel}>{t('memories.photosLabel')}</legend>
          <ul className="mb-2 grid grid-cols-3 gap-1.5">
            {photos.map((p, i) => (
              <li key={p.id} className="relative animate-[pop-in_0.25s_var(--ease-out-soft)]">
                <button type="button" onClick={() => setViewer(i)} className="block w-full overflow-hidden rounded-lg" title={p.comment || t('memories.photoAlt', { n: i + 1 })}>
                  <AttachmentThumb
                    file={{ blob: p.blob, thumb: p.thumb, type: 'image/jpeg', name: t('memories.photoAlt', { n: i + 1 }), comment: p.comment }}
                    className="aspect-square w-full transition-transform duration-300 hover:scale-105"
                  />
                </button>
                {p.comment && <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-black/55 px-1.5 py-0.5 text-[0.625rem] text-white">{p.comment}</span>}
                <button
                  type="button"
                  onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                  aria-label={t('memories.removePhoto')}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-transform hover:scale-110"
                >
                  <IconX size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <label
            onDragOver={(e) => (e.preventDefault(), setOver(true))}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => (e.preventDefault(), setOver(false), void addFiles(e.dataTransfer.files))}
            className={`flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium transition-colors ${
              over ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-fg' : 'border-line-strong text-fg-2 hover:border-accent hover:text-fg'
            }`}
          >
            <IconPhotoPlus size={18} aria-hidden />
            {loading ? t('memories.loading') : t('memories.addPhotos')}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => (void addFiles(e.target.files), (e.target.value = ''))} />
          </label>
          <p className="mt-1.5 text-xs text-fg-3">{t('memories.photosHint')}</p>
        </fieldset>
        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('memories.story')}
          </label>
          <textarea id={`${id}-notes`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('memories.storyPlaceholder')} className={textarea} />
        </div>
        {error && <p className={fieldError}>{error}</p>}
      </form>
      {viewer !== null && photos.length > 0 && (
        <FileViewer
          items={photos.map((p, i) => ({ id: p.id, blob: p.blob, thumb: p.thumb, archive: p.archive, type: 'image/jpeg', name: t('memories.photoAlt', { n: i + 1 }), date: p.date ?? date, comment: p.comment }))}
          index={viewer}
          onClose={() => setViewer(null)}
          onChangeMeta={(photoId, meta) => setPhotos((list) => list.map((p) => (p.id === photoId ? { ...p, ...meta } : p)))}
          onDelete={(photoId) => setPhotos((list) => list.filter((p) => p.id !== photoId))}
        />
      )}
    </SidePanel>
  )
}
