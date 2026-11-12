import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArchive, IconDownload, IconFolder, IconLoader2, IconRestore, IconShieldCheck } from '@tabler/icons-react'
import { ConfirmButton } from '../../components/ConfirmButton'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnPrimary, pill } from '../../components/ui'
import type { StorageUsage } from '../../hooks/useStorageUsage'
import { releaseLocalCopies, verifyDownloads } from '../../lib/archive'
import { recoverWithToast } from '../../lib/archiveUi'
import { formatBytes } from '../../lib/files'
import type { FileInfo } from '../../lib/storage'
import { useToast } from '../../store/toast'
import { FilePreview, useModuleLabel } from './shared'
import { useOwnerNames } from './useOwnerNames'

// Estado de un archivo archivado
function statusOf(f: FileInfo): 'pending' | 'both' | 'outside' {
  if (!f.archive?.verifiedAt) return 'pending'
  return f.local ? 'both' : 'outside'
}
const STATUS_TONE = { pending: 'warning', both: 'success', outside: 'accent' } as const

// Archivos archivados: dónde están, recuperarlos, verificar descargas y liberar espacio
export function ArchivedTab({ usage }: { usage: StorageUsage }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const bytes = (n: number) => formatBytes(n, lang)
  const showToast = useToast((s) => s.show)
  const moduleLabel = useModuleLabel()
  const archived = usage.files.filter((f) => f.archive).sort((a, b) => (b.archive!.archivedAt ?? 0) - (a.archive!.archivedAt ?? 0))
  const owners = useOwnerNames(archived)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const verifyInput = useRef<HTMLInputElement>(null)
  const dateFormat = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  const pending = archived.filter((f) => statusOf(f) === 'pending')
  const releasable = archived.filter((f) => statusOf(f) === 'both')
  const releasableBytes = releasable.reduce((s, f) => s + f.size, 0)

  async function verify(list: FileList | null) {
    if (!list?.length) return
    setBusy('verify')
    const { verified, unknown } = await verifyDownloads([...list])
    setBusy(null)
    showToast({ message: `${t('storage.wizard.verified', { count: verified.length })}${unknown.length ? ` · ${t('storage.wizard.unknown', { count: unknown.length })}` : ''}` })
  }

  async function release(ids: string[]) {
    setBusy(ids.length === 1 ? ids[0] : 'all')
    const { freed, skipped } = await releaseLocalCopies(ids)
    setBusy(null)
    showToast({ message: `${t('storage.wizard.released', { size: bytes(freed) })}${skipped.length ? ` · ${t('storage.wizard.skipped', { count: skipped.length })}` : ''}` })
  }

  async function recover(id: string) {
    setBusy(id)
    await recoverWithToast(id)
    setBusy(null)
  }

  if (archived.length === 0)
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-3">
          <IconArchive size={28} stroke={1.5} aria-hidden />
        </span>
        <p className="text-fg-2">{t('storage.archived.empty')}</p>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {(pending.length > 0 || releasable.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && (
            <>
              <input ref={verifyInput} type="file" multiple hidden onChange={(e) => (void verify(e.target.files), (e.target.value = ''))} />
              <button type="button" onClick={() => verifyInput.current?.click()} disabled={busy !== null} className={btn}>
                {busy === 'verify' ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconShieldCheck size={17} aria-hidden />}
                {t('storage.archived.verifyDownloads')} · {pending.length}
              </button>
            </>
          )}
          {releasable.length > 0 && (
            <button type="button" onClick={() => setConfirmAll(true)} disabled={busy !== null} className={btnPrimary}>
              {busy === 'all' && <IconLoader2 size={17} className="animate-spin" aria-hidden />}
              {t('storage.archived.freeAll', { size: bytes(releasableBytes) })}
            </button>
          )}
        </div>
      )}

      <ul className="card divide-y divide-line overflow-hidden">
        {archived.map((f) => {
          const status = statusOf(f)
          const owner = owners.get(f.ownerId)
          const where = f.archive!.kind === 'folder' ? t('storage.archived.folder', { name: f.archive!.targetName }) : t('storage.archived.downloads')
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FilePreview file={f} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{f.comment || f.name}</span>
                <span className="block truncate text-xs text-fg-3">
                  {moduleLabel(f.module)}
                  {owner && ` · ${t('storage.files.of', { owner })}`} · {bytes(f.size)}
                </span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-fg-2" title={f.archive!.path}>
                  {f.archive!.kind === 'folder' ? <IconFolder size={13} aria-hidden /> : <IconDownload size={13} aria-hidden />}
                  {where} · {t('storage.archived.archivedOn', { date: dateFormat.format(new Date(f.archive!.archivedAt)) })}
                </span>
              </span>
              <span className={pill(STATUS_TONE[status])}>{t(`storage.archived.status.${status}`)}</span>
              {status === 'outside' && (
                <button type="button" onClick={() => void recover(f.id)} disabled={busy !== null} className={btn}>
                  {busy === f.id ? <IconLoader2 size={16} className="animate-spin" aria-hidden /> : <IconRestore size={16} aria-hidden />}
                  {t('storage.recover')}
                </button>
              )}
              {status === 'both' && (
                <ConfirmButton question={t('common.sure')} onConfirm={() => void release([f.id])} className={btn}>
                  {t('storage.archived.free')}
                </ConfirmButton>
              )}
            </li>
          )
        })}
      </ul>

      {confirmAll && (
        <SidePanel
          title={t('storage.wizard.releaseTitle')}
          onClose={() => setConfirmAll(false)}
          footer={
            <>
              <button type="button" onClick={() => (setConfirmAll(false), void release(releasable.map((f) => f.id)))} className={btnPrimary}>
                {t('storage.wizard.releaseButton', { size: bytes(releasableBytes) })}
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} className={btn}>
                {t('calendar.form.cancel')}
              </button>
            </>
          }
        >
          <p className="text-sm text-fg-2">{t('storage.wizard.releaseBody')}</p>
          <p className="mt-3 text-sm font-medium">{t('storage.wizard.summaryOf', { count: releasable.length, size: bytes(releasableBytes) })}</p>
        </SidePanel>
      )}
    </div>
  )
}
