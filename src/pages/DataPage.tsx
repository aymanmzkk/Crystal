import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconAlertTriangle, IconDatabase, IconDownload, IconLoader2, IconTrashX, IconUpload } from '@tabler/icons-react'
import { SidePanel } from '../components/SidePanel'
import { TopBar } from '../components/TopBar'
import { btn, btnPrimary, input } from '../components/ui'
import { backupFileName, createBackup, deleteAllData, restoreBackup } from '../lib/backup'
import { useToast } from '../store/toast'

type Confirm = { kind: 'restore'; file: File } | { kind: 'delete' } | null

// Datos: copia de seguridad, restaurar y borrar todo
export function DataPage() {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'backup' | 'restore' | 'delete' | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [typed, setTyped] = useState('')
  const word = t('data.confirmWord')

  async function download() {
    setBusy('backup')
    try {
      const blob = await createBackup()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backupFileName()
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast({ message: t('data.backupDone') })
    } finally {
      setBusy(null)
    }
  }

  async function run() {
    if (!confirm) return
    const current = confirm
    setConfirm(null)
    setTyped('')
    setBusy(current.kind)
    try {
      if (current.kind === 'restore') await restoreBackup(current.file)
      else await deleteAllData()
      // Se recarga para empezar con los datos nuevos (o vacíos)
      location.assign('/')
    } catch {
      setBusy(null)
      showToast({ message: t('data.restoreError') })
    }
  }

  const cardClass = 'card flex flex-col gap-3 p-5'

  return (
    <>
      <TopBar title={t('data.title')} icon={<IconDatabase size={18} stroke={1.8} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 md:p-6">
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconDownload size={18} className="text-fg-3" aria-hidden />
            {t('data.backupTitle')}
          </h2>
          <p className="text-sm text-fg-2">{t('data.backupBody')}</p>
          <button type="button" onClick={() => void download()} disabled={busy !== null} className={`${btnPrimary} self-start`}>
            {busy === 'backup' ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconDownload size={17} aria-hidden />}
            {t('data.backupButton')}
          </button>
        </section>

        <section className={cardClass}>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconUpload size={18} className="text-fg-3" aria-hidden />
            {t('data.restoreTitle')}
          </h2>
          <p className="text-sm text-fg-2">{t('data.restoreBody')}</p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && setConfirm({ kind: 'restore', file: e.target.files[0] }), (e.target.value = ''))} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className={`${btn} self-start`}>
            {busy === 'restore' ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconUpload size={17} aria-hidden />}
            {t('data.restoreButton')}
          </button>
        </section>

        <section className={`${cardClass} border-[color-mix(in_srgb,var(--danger)_40%,var(--line))]`}>
          <h2 className="flex items-center gap-2 font-semibold text-danger">
            <IconAlertTriangle size={18} aria-hidden />
            {t('data.deleteTitle')}
          </h2>
          <p className="text-sm text-fg-2">{t('data.deleteBody')}</p>
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'delete' })}
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-danger px-3 font-semibold text-danger transition-colors hover:bg-danger hover:text-white active:scale-[0.97]"
          >
            {busy === 'delete' ? <IconLoader2 size={17} className="animate-spin" aria-hidden /> : <IconTrashX size={17} aria-hidden />}
            {t('data.deleteButton')}
          </button>
        </section>
      </main>

      {confirm && (
        <SidePanel
          title={confirm.kind === 'delete' ? t('data.deleteTitle') : t('data.restoreTitle')}
          onClose={() => (setConfirm(null), setTyped(''))}
          footer={
            <>
              <button
                type="button"
                onClick={() => void run()}
                disabled={typed.trim().toUpperCase() !== word.toUpperCase()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-danger px-3.5 font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {confirm.kind === 'delete' ? t('data.deleteButton') : t('data.restoreButton')}
              </button>
              <button type="button" onClick={() => (setConfirm(null), setTyped(''))} className={btn}>
                {t('calendar.form.cancel')}
              </button>
            </>
          }
        >
          <p className="text-sm text-fg-2">{confirm.kind === 'delete' ? t('data.deleteWarning') : t('data.restoreWarning', { name: confirm.file.name })}</p>
          <p className="mt-2 text-sm text-fg-2">{t('data.backupFirst')}</p>
          <label className="mt-4 block text-sm">
            {t('data.typeToConfirm', { word })}
            <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={`${input} mt-1.5`} />
          </label>
        </SidePanel>
      )}
    </>
  )
}
