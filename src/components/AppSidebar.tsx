import type { CSSProperties } from 'react'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  IconChartDonut,
  IconDatabase,
  IconHome2,
  IconLogout,
  IconShieldCheck,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconTrash,
  IconWifiOff,
} from '@tabler/icons-react'
import { NotificationsToggle } from './NotificationsToggle'
import { signOut, useAccount } from '../auth/account'
import { useTrashCount } from '../db/hooks'
import { useOnline } from '../hooks/useOnline'
import { COLORS } from '../lib/colors'
import { APP_GROUPS, MODULES } from '../modules/registry'
import { usePalette } from '../store/palette'
import { useSettings } from '../store/settings'


function navItem(active: boolean, collapsed: boolean) {
  return `group relative flex h-8 items-center gap-2.5 rounded-lg text-[0.8125rem] font-medium transition-colors duration-150 ${
    collapsed ? 'w-9 justify-center' : 'px-2'
  } ${active ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`
}

// Barra lateral: buscador, Inicio y las apps por grupos. En el móvil sale como cajón (drawer).
export function AppSidebar({ onNavigate, drawer = false }: { onNavigate?: () => void; drawer?: boolean }) {
  const { t } = useTranslation()
  const online = useOnline()
  const trashCount = useTrashCount()
  const openPalette = usePalette((s) => s.setOpen)
  const { sidebarCollapsed, setSidebarCollapsed } = useSettings()
  const profile = useAccount((st) => st.profile)
  const collapsed = sidebarCollapsed && !drawer

  return (
    <nav aria-label={t('nav.menu')} className={`flex h-full flex-col ${collapsed ? 'w-[60px] items-center' : 'w-64'} bg-surface/60`}>
      <div className={`flex items-center gap-2 px-3 pt-3 pb-2 ${collapsed ? 'flex-col' : ''}`}>
        <NavLink to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-2 rounded-lg">
          <img src="/logo.svg?v=c3" alt="Crystal" className="size-7 rounded-lg shadow-sm" />
          {!collapsed && <span className="text-[0.9375rem] font-semibold tracking-tight">Crystal</span>}
        </NavLink>
        {!drawer && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
            className={`${collapsed ? '' : 'ml-auto'} inline-flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg`}
          >
            {collapsed ? <IconLayoutSidebarLeftExpand size={18} aria-hidden /> : <IconLayoutSidebarLeftCollapse size={18} aria-hidden />}
          </button>
        )}
      </div>

      <div className={`px-3 pb-2 ${collapsed ? '' : 'w-full'}`}>
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            openPalette(true)
          }}
          aria-label={t('palette.button')}
          className={`flex h-8 items-center gap-2 rounded-lg border border-line bg-surface text-fg-3 shadow-sm transition-colors hover:border-line-strong hover:text-fg ${collapsed ? 'w-9 justify-center' : 'w-full px-2.5'}`}
        >
          <IconSearch size={16} aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-[0.8125rem]">{t('palette.button')}</span>
              <kbd className="rounded border border-line px-1 font-sans text-[0.625rem] text-fg-3">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto px-3 pb-3 ${collapsed ? '' : 'w-full'}`}>
        <NavLink to="/" end onClick={onNavigate} className={({ isActive }) => navItem(isActive, collapsed)} title={collapsed ? t('nav.home') : undefined}>
          <IconHome2 size={18} stroke={1.75} aria-hidden />
          {!collapsed && t('nav.home')}
        </NavLink>

        {APP_GROUPS.map((group) => (
          <div key={group.id} className="mt-4">
            {collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden /> : <p className="eyebrow mb-1 px-2">{t(`nav.groups.${group.id}`)}</p>}
            <ul className="flex flex-col gap-px">
              {group.apps.map((id) => {
                const { icon: Icon, color } = MODULES[id]
                return (
                  <li key={id}>
                    <NavLink
                      to={`/${id}`}
                      onClick={onNavigate}
                      title={collapsed ? t(`apps.${id}`) : undefined}
                      className={({ isActive }) => navItem(isActive, collapsed)}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && !collapsed && <span className="absolute top-1.5 bottom-1.5 -left-3 w-0.5 rounded-r-full bg-accent" aria-hidden />}
                          {/* El color de cada app solo se nota en el icono, de forma discreta */}
                          <span
                            style={{ '--hc': COLORS[color].base } as CSSProperties}
                            className={`flex transition-colors duration-150 group-hover:text-(--hc) ${isActive ? 'text-(--hc)' : ''}`}
                          >
                            <Icon size={18} stroke={1.75} aria-hidden />
                          </span>
                          {!collapsed && <span className="truncate">{t(`apps.${id}`)}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Pie: papelera, datos, admin, avisos y la cuenta */}
      <div className={`border-t border-line px-3 py-3 text-xs text-fg-3 ${collapsed ? 'flex flex-col items-center gap-2' : 'w-full space-y-2.5'}`}>
        {!online && (
          <p className="flex items-center gap-1.5 text-warning" title={t('status.offline')}>
            <IconWifiOff size={15} aria-hidden />
            {!collapsed && t('status.offline')}
          </p>
        )}
        <NavLink to="/trash" onClick={onNavigate} className={({ isActive }) => navItem(isActive, collapsed)} title={collapsed ? t('status.trash', { count: trashCount }) : undefined}>
          <IconTrash size={18} stroke={1.75} aria-hidden />
          {!collapsed && t('status.trash', { count: trashCount })}
        </NavLink>
        <NavLink to="/storage" onClick={onNavigate} className={({ isActive }) => navItem(isActive, collapsed)} title={collapsed ? t('storage.title') : undefined}>
          <IconChartDonut size={18} stroke={1.75} aria-hidden />
          {!collapsed && t('storage.title')}
        </NavLink>
        <NavLink to="/data" onClick={onNavigate} className={({ isActive }) => navItem(isActive, collapsed)} title={collapsed ? t('data.title') : undefined}>
          <IconDatabase size={18} stroke={1.75} aria-hidden />
          {!collapsed && t('data.title')}
        </NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => navItem(isActive, collapsed)} title={collapsed ? t('admin.title') : undefined}>
            <IconShieldCheck size={18} stroke={1.75} aria-hidden />
            {!collapsed && t('admin.title')}
          </NavLink>
        )}
        {!collapsed && (
          <div className="px-2">
            <NotificationsToggle />
          </div>
        )}
        {/* Cuenta con la que se ha entrado */}
        {profile && (
          <div className={`flex items-center gap-2 border-t border-line pt-2.5 ${collapsed ? 'flex-col' : 'px-1'}`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-xs font-semibold text-accent uppercase" title={profile.email}>
              {(profile.name || profile.email).slice(0, 1)}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium text-fg">{profile.name || profile.email}</span>
                <span className="block truncate">{profile.email}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label={t('auth.logout')}
              title={t('auth.logout')}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <IconLogout size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
