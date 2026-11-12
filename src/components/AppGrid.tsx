import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { colorVars } from '../lib/colors'
import { APP_ORDER, MODULES } from '../modules/registry'

// Lanzador compacto de todas las apps (en el móvil, debajo del inicio)
export function AppGrid() {
  const { t } = useTranslation()

  return (
    <ul className="grid grid-cols-4 gap-1 sm:grid-cols-6">
      {APP_ORDER.map((id) => {
        const { icon: Icon, color } = MODULES[id]
        return (
          <li key={id}>
            <Link
              to={`/${id}`}
              style={colorVars(color)}
              className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors active:bg-surface-2"
            >
              {/* Fondo neutro igual para todas; el color de la app solo en el trazo del icono */}
              <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-(--h) shadow-sm transition-transform duration-150 group-active:scale-90">
                <Icon size={24} stroke={1.7} aria-hidden />
              </span>
              <span className="w-full truncate text-center text-[0.6875rem] leading-tight font-medium text-fg-2">{t(`apps.${id}`)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
