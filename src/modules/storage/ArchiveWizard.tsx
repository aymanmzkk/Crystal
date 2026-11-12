import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconAlertTriangle, IconCircleCheck, IconDownload, IconFolder, IconFolderPlus, IconLoader2, IconShieldCheck } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnPrimary } from '../../components/ui'
import type { ArchiveTarget } from '../../db/types'
import { archiveByDownload, archiveToFolder, canUseFolders, listTargets, pickFolder, releaseLocalCopies, verifyDownloads, type ArchiveResult } from '../../lib/archive'
import { formatBytes } from '../../lib/files'
import type { FileInfo } from '../../lib/storage'
import { useToast } from '../../store/toast'

type Step = 'choose' | 'working' | 'result' | 'verify' | 'released'
type Destination = { kind: 'folder'; target: ArchiveTarget } | { kind: 'download' }

// Descarga un archivo con su nombre (en el móvil va a la carpeta de Descargas)
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Archivar paso a paso. Nunca quita nada de Crystal sin una copia verificada Y sin que el usuario lo confirme.
export function ArchiveWizard({ files: initialFiles, onClose, onDone }: { files: FileInfo[]; onClose: () => void; onDone: () => void }) {
  // La lista se fija al abrir: al liberar, los archivos dejan de estar "en Crystal" y no deben desaparecer del resumen
  const [files] = useState(initialFiles)
  const { t, i18n } = useTranslation()
  const bytes = (n: number) => formatBytes(n, i18n.language)
  const showToast = useToast((s) => s.show)
  const folders = canUseFolders()
  const [step, setStep] = useState<Step>('choose')
  const [targets, setTargets] = useState<ArchiveTarget[]>([])
  const [dest, setDest] = useState<Destination | null>(folders ? null : { kind: 'download' })
  const [progress, setProgress] = useState({ done: 0, total: files.length })
  const [results, setResults] = useState<ArchiveResult[]>([])
  const [verifyMsg, setVerifyMsg] = useState<{ verified: number; unknown: number } | null>(null)
  const [releaseInfo, setReleaseInfo] = useState<{ freed: number; skipped: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const verifyInput = useRef<HTMLInputElement>(null)
  const totalBytes = files.reduce((s, f) => s + f.size, 0)

  useEffect(() => {
    if (!folders) return
    void listTargets().then((list) => {
      setTargets(list)
      if (list[0]) setDest((d) => d ?? { kind: 'folder', target: list[0] })
    })
  }, [folders])

  async function chooseFolder() {
    const target = await pickFolder()
    if (!target) return
    setTargets(await listTargets())
    setDest({ kind: 'folder', target })
  }

  async function start() {
    if (!dest) return
    setStep('working')
    const ids = files.map((f) => f.id)
    const onProgress = (done: number, total: number) => setProgress({ done, total })
    const res =
      dest.kind === 'folder'
        ? await archiveToFolder(dest.target, ids, onProgress)
        : await archiveByDownload(
            ids,
            (blob, name) => downloadBlob(blob, name),
            onProgress,
          )
    setResults(res)
    setStep(dest.kind === 'folder' ? 'result' : 'verify')
  }

  async function verify(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    const { verified, unknown } = await verifyDownloads([...list])
    setVerifyMsg({ verified: verified.length, unknown: unknown.length })
    setBusy(false)
  }

  // Liberar: solo los que tienen copia verificada (releaseLocalCopies lo vuelve a comprobar)
  async function release() {
    setBusy(true)
    const okIds = results.filter((r) => r.ok).map((r) => r.id)
    const { freed, skipped } = await releaseLocalCopies(okIds)
    setReleaseInfo({ freed, skipped: skipped.length })
    setBusy(false)
    setStep('released')
    onDone()
    showToast({ message: t('storage.wizard.released', { size: bytes(freed) }) })
  }

  const ok = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  const okBytes = ok.reduce((s, r) => s + r.size, 0)
  const nameOf = (id: string) => files.find((f) => f.id === id)?.name ?? id

  const optionClass = (active: boolean) =>
    `flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]' : 'border-line hover:border-line-strong'}`

  const footer =
    step === 'choose' ? (
      <>
        <button type="button" onClick={() => void start()} disabled={!dest} className={`${btnPrimary} disabled:opacity-50`}>
          <IconShieldCheck size={17} aria-hidden />
          {t('storage.wizard.start')}
        </button>
        <button type="button" onClick={onClose} className={btn}>
          {t('calendar.form.cancel')}
        </button>
      </>
    ) : step === 'result' ? (
      <>
        {ok.length > 0 && (
          <button type="button" onClick={() => void release()} disabled={busy} className={btnPrimary}>
            {busy && <IconLoader2 size={17} className="animate-spin" aria-hidden />}
            {t('storage.wizard.releaseButton', { size: bytes(okBytes) })}
          </button>
        )}
        <button type="button" onClick={() => (onDone(), onClose())} className={btn}>
          {ok.length > 0 ? t('storage.wizard.keep') : t('storage.wizard.close')}
        </button>
      </>
    ) : step === 'verify' ? (
      <>
        {verifyMsg && verifyMsg.verified > 0 && (
          <button type="button" onClick={() => void release()} disabled={busy} className={btnPrimary}>
            {t('storage.wizard.releaseButton', { size: bytes(okBytes) })}
          </button>
        )}
        <button type="button" onClick={() => (onDone(), onClose())} className={btn}>
          {verifyMsg ? t('storage.wizard.keep') : t('storage.wizard.later')}
        </button>
      </>
    ) : step === 'released' ? (
      <button type="button" onClick={onClose} className={btnPrimary}>
        {t('storage.wizard.close')}
      </button>
    ) : undefined

  return (
    <SidePanel title={t('storage.wizard.title')} onClose={step === 'working' ? () => undefined : onClose} footer={footer}>
      <p className="mb-4 text-sm text-fg-2">{t('storage.wizard.summaryOf', { count: files.length, size: bytes(totalBytes) })}</p>

      {step === 'choose' && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t('storage.wizard.where')}</h3>
          {folders && (
            <div className="flex flex-col gap-2">
              {targets.map((target) => (
                <button key={target.id} type="button" onClick={() => setDest({ kind: 'folder', target })} aria-pressed={dest?.kind === 'folder' && dest.target.id === target.id} className={optionClass(dest?.kind === 'folder' && dest.target.id === target.id)}>
                  <IconFolder size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="block font-medium">{target.name}</span>
                    <span className="block text-xs text-fg-3">{t('storage.wizard.folderHint')}</span>
                  </span>
                </button>
              ))}
              <button type="button" onClick={() => void chooseFolder()} className={optionClass(false)}>
                <IconFolderPlus size={20} className="mt-0.5 shrink-0 text-fg-3" aria-hidden />
                <span>
                  <span className="block font-medium">{targets.length ? t('storage.wizard.chooseFolder') : t('storage.wizard.folder')}</span>
                  {targets.length === 0 && <span className="block text-xs text-fg-3">{t('storage.wizard.folderHint')}</span>}
                </span>
              </button>
            </div>
          )}
          <button type="button" onClick={() => setDest({ kind: 'download' })} aria-pressed={dest?.kind === 'download'} className={optionClass(dest?.kind === 'download')}>
            <IconDownload size={20} className="mt-0.5 shrink-0 text-fg-3" aria-hidden />
            <span>
              <span className="block font-medium">{t('storage.wizard.download')}</span>
              <span className="block text-xs text-fg-3">{t('storage.wizard.downloadHint')}</span>
            </span>
          </button>
        </div>
      )}

      {step === 'working' && (
        <div className="flex flex-col items-center gap-4 py-8 text-center" aria-live="polite">
          <IconLoader2 size={32} className="animate-spin text-accent" aria-hidden />
          <p className="text-sm">{t(dest?.kind === 'download' ? 'storage.wizard.downloading' : 'storage.wizard.copying', progress)}</p>
          <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span className="accent-gradient block h-full rounded-full transition-[width] duration-300" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </span>
        </div>
      )}

      {(step === 'result' || step === 'verify') && (
        <div className="flex flex-col gap-3">
          {step === 'result' && ok.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-2.5 text-sm">
              <IconCircleCheck size={18} className="mt-px shrink-0 text-success" aria-hidden />
              {t('storage.wizard.ok', { count: ok.length, size: bytes(okBytes) })}
            </p>
          )}
          {failed.length > 0 && (
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-2.5 text-sm">
              <p className="flex items-start gap-2">
                <IconAlertTriangle size={18} className="mt-px shrink-0 text-warning" aria-hidden />
                {t('storage.wizard.failed', { count: failed.length })}
              </p>
              <ul className="mt-1.5 ml-7 list-disc text-xs text-fg-2">
                {failed.map((r) => (
                  <li key={r.id}>
                    {nameOf(r.id)}: {t(`storage.wizard.errors.${r.error}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step === 'result' && ok.length > 0 && (
            <div className="rounded-xl border border-line p-3">
              <h3 className="text-sm font-semibold">{t('storage.wizard.releaseTitle')}</h3>
              <p className="mt-1 text-sm text-fg-2">{t('storage.wizard.releaseBody')}</p>
            </div>
          )}
          {step === 'verify' && ok.length > 0 && (
            <div className="rounded-xl border border-line p-3">
              <h3 className="text-sm font-semibold">{t('storage.wizard.downloadedTitle')}</h3>
              <p className="mt-1 text-sm text-fg-2">{t('storage.wizard.downloadedBody')}</p>
              <input ref={verifyInput} type="file" multiple hidden onChange={(e) => (void verify(e.target.files), (e.target.value = ''))} />
              <button type="button" onClick={() => verifyInput.current?.click()} disabled={busy} className={`${btn} mt-3`}>
                {busy ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconShieldCheck size={17} aria-hidden />}
                {t('storage.wizard.verify')}
              </button>
              {verifyMsg && (
                <p className="mt-2 text-sm">
                  <span className="text-success">{t('storage.wizard.verified', { count: verifyMsg.verified })}</span>
                  {verifyMsg.unknown > 0 && <span className="block text-xs text-fg-3">{t('storage.wizard.unknown', { count: verifyMsg.unknown })}</span>}
                </p>
              )}
              {verifyMsg && verifyMsg.verified > 0 && <p className="mt-3 text-sm text-fg-2">{t('storage.wizard.releaseBody')}</p>}
            </div>
          )}
        </div>
      )}

      {step === 'released' && releaseInfo && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <IconCircleCheck size={36} className="text-success" aria-hidden />
          <p className="text-lg font-semibold">{t('storage.wizard.released', { size: bytes(releaseInfo.freed) })}</p>
          {releaseInfo.skipped > 0 && <p className="text-sm text-fg-2">{t('storage.wizard.skipped', { count: releaseInfo.skipped })}</p>}
        </div>
      )}
    </SidePanel>
  )
}
