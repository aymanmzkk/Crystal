import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconDownload, IconFolder, IconFolderPlus, IconLink, IconX } from '@tabler/icons-react'
import { btn, btnGhost } from '../../components/ui'
import type { ArchiveTarget } from '../../db/types'
import { canUseFolders, forgetTarget, listTargets, pickFolder, relinkFolder } from '../../lib/archive'
import { useToast } from '../../store/toast'
import { Card } from './shared'

// Dónde se puede archivar en este dispositivo: carpetas elegidas (Windows, disco externo...) o descargas
export function DestinationsCard() {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const [targets, setTargets] = useState<ArchiveTarget[]>([])
  const folders = canUseFolders()

  const load = useCallback(() => void listTargets().then(setTargets), [])
  useEffect(load, [load])

  async function add() {
    if (await pickFolder()) load()
  }

  // En otro dispositivo o tras restaurar una copia: se elige la carpeta y Crystal vuelve a encontrar sus archivos
  async function relink() {
    const target = await pickFolder()
    if (!target) return
    load()
    const count = await relinkFolder(target)
    showToast({ message: t('storage.destinations.relinked', { count, name: target.name }) })
  }

  return (
    <Card title={t('storage.destinations.title')} icon={<IconFolder size={17} />}>
      {folders ? (
        <>
          {targets.length === 0 ? (
            <p className="text-sm text-fg-2">{t('storage.destinations.none')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {targets.map((target) => (
                <li key={target.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                  <IconFolder size={17} className="text-fg-3" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{target.name}</span>
                  <button
                    type="button"
                    onClick={() => void forgetTarget(target.id).then(load)}
                    aria-label={t('storage.destinations.forget', { name: target.name })}
                    title={t('storage.destinations.forget', { name: target.name })}
                    className="text-fg-3 hover:text-danger"
                  >
                    <IconX size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void add()} className={btn}>
              <IconFolderPlus size={17} aria-hidden />
              {t('storage.destinations.add')}
            </button>
            <button type="button" onClick={() => void relink()} className={btnGhost}>
              <IconLink size={16} aria-hidden />
              {t('storage.destinations.relink')}
            </button>
          </div>
          <p className="mt-3 text-xs text-fg-3">{t('storage.destinations.folderHint')}</p>
        </>
      ) : (
        <p className="flex gap-2 text-sm text-fg-2">
          <IconDownload size={17} className="mt-0.5 shrink-0 text-fg-3" aria-hidden />
          {t('storage.destinations.noFolders')}
        </p>
      )}
    </Card>
  )
}
