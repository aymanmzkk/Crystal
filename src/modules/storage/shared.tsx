import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArchive, IconFile, IconFileTypePdf, IconMovie, IconPhoto } from '@tabler/icons-react'
import { useObjectUrl } from '../../lib/images'
import type { AlertLevel, FileCategory, FileInfo } from '../../lib/storage'

export const CATEGORY_ICON: Record<FileCategory, typeof IconPhoto> = { photos: IconPhoto, videos: IconMovie, documents: IconFileTypePdf, other: IconFile }

// Color según el nivel de aviso
export const LEVEL_TONE: Record<AlertLevel, 'accent' | 'warning' | 'danger'> = { 0: 'accent', 70: 'accent', 85: 'warning', 95: 'danger' }

// Miniatura de un archivo del panel: la imagen si la hay; si no, el icono de su tipo. Con marca si está archivado.
export function FilePreview({ file, className = 'size-10' }: { file: FileInfo; className?: string }) {
  const url = useObjectUrl(file.preview)
  const Icon = CATEGORY_ICON[file.category]
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 ${className}`}>
      {url ? <img src={url} alt="" loading="lazy" className={`size-full object-cover ${file.local ? '' : 'opacity-60'}`} /> : <Icon size={18} className="text-fg-3" aria-hidden />}
      {file.archive && (
        <span className={`absolute right-0.5 bottom-0.5 inline-flex size-4 items-center justify-center rounded ${file.archive.verifiedAt ? 'bg-success' : 'bg-warning'} text-white`}>
          <IconArchive size={10} aria-hidden />
        </span>
      )}
    </span>
  )
}

// Nombre de la app de un archivo (o "Otros" si es de una app que ya no existe)
export function useModuleLabel() {
  const { t } = useTranslation()
  return (module: string) => (module === 'other' ? t('storage.otherModule') : t(`apps.${module}`))
}

// Tarjeta con título e icono, igual que en el resto de Crystal
export function Card({ title, icon, action, children, className = '' }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex min-w-0 flex-col p-4 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-fg-3" aria-hidden>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </header>
      {children}
    </section>
  )
}

// Barra de proporción (un solo color: tamaño)
export function SizeBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
      <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0}%` }} />
    </span>
  )
}
