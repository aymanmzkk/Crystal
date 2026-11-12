import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconMenu2, IconMoon, IconSearch, IconSun } from '@tabler/icons-react'
import { PomodoroIndicator } from './PomodoroIndicator'
import { colorVars } from '../lib/colors'
import type { ModuleDef } from '../modules/registry'
import { useNav } from '../store/nav'
import { usePalette } from '../store/palette'
import { useSettings } from '../store/settings'

interface TopBarProps {
  // Nombre de la página actual
  title?: string
  // Si es una app, su icono aparece junto al título
  module?: ModuleDef
  // Icono propio cuando no es una app (papelera, inicio)
  icon?: ReactNode
}

// Cabecera fija de cada página: menú (móvil), icono y título, Pomodoro en marcha y buscador
export function TopBar({ title, module, icon }: TopBarProps) {
  const { t } = useTranslation()
  const openPalette = usePalette((s) => s.setOpen)
  const openDrawer = useNav((s) => s.setDrawerOpen)
  const Icon = module?.icon
  const { theme, setTheme, language, setLanguage } = useSettings()
  const dark = theme === 'dark'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={() => openDrawer(true)}
        aria-label={t('nav.menu')}
        className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg md:hidden"
      >
        <IconMenu2 size={20} aria-hidden />
      </button>
      {(Icon || icon) && (
        <span
          style={module ? colorVars(module.color) : undefined}
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
            module ? 'bg-[color-mix(in_srgb,var(--h)_14%,transparent)] text-(--h) ring-[color-mix(in_srgb,var(--h)_22%,transparent)]' : 'bg-surface-2 text-fg-2 ring-line'
          }`}
          aria-hidden
        >
          {Icon ? <Icon size={18} stroke={1.8} /> : icon}
        </span>
      )}
      {title && <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</h1>}
      <span className="ml-auto flex items-center gap-2 text-xs text-fg-2">
        <PomodoroIndicator />
      </span>
      <button
        type="button"
        onClick={() => openPalette(true)}
        aria-label={t('palette.button')}
        className="inline-flex size-9 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg md:hidden"
      >
        <IconSearch size={19} aria-hidden />
      </button>
      {/* Modo oscuro / claro e idioma */}
      <button
        type="button"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label={dark ? t('status.theme.light') : t('status.theme.dark')}
        title={dark ? t('status.theme.light') : t('status.theme.dark')}
        className="inline-flex size-9 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg active:scale-95"
      >
        {dark ? <IconSun size={19} aria-hidden /> : <IconMoon size={19} aria-hidden />}
      </button>
      <button
        type="button"
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        aria-label={t('status.language')}
        title={t('status.language')}
        className="inline-flex h-9 items-center justify-center rounded-lg px-2 text-xs font-semibold text-fg-2 uppercase transition-colors hover:bg-surface-2 hover:text-fg active:scale-95"
      >
        {language === 'es' ? 'EN' : 'ES'}
      </button>
    </header>
  )
}
