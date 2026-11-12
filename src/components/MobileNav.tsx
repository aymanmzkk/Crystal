import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconCalendar, IconCheckbox, IconHome2, IconLayoutGrid, IconRepeat } from '@tabler/icons-react'
import { AppSidebar } from './AppSidebar'
import { useNav } from '../store/nav'

const TABS = [
  { to: '/', icon: IconHome2, label: 'nav.home', end: true },
  { to: '/calendar', icon: IconCalendar, label: 'apps.calendar' },
  { to: '/tasks', icon: IconCheckbox, label: 'apps.tasks' },
  { to: '/habits', icon: IconRepeat, label: 'apps.habits' },
]

// En el móvil: barra de pestañas abajo y el menú completo como cajón que sale por la izquierda
export function MobileNav() {
  const { t } = useTranslation()
  const { drawerOpen, setDrawerOpen } = useNav()
  const { pathname } = useLocation()

  // Al cambiar de página se cierra el cajón
  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, setDrawerOpen])

  return (
    <>
      <nav
        aria-label={t('nav.menu')}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {TABS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium transition-colors ${isActive ? 'text-accent' : 'text-fg-3'}`
            }
          >
            <Icon size={22} stroke={1.75} aria-hidden />
            {t(label)}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium text-fg-3"
        >
          <IconLayoutGrid size={22} stroke={1.75} aria-hidden />
          {t('nav.more')}
        </button>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-(--overlay) backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 animate-[drawer-in_0.28s_var(--ease-out-soft)] border-r border-line bg-surface shadow-2xl">
            <AppSidebar drawer onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
