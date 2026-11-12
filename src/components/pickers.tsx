import { useTranslation } from 'react-i18next'
import type { ColorKey } from '../db/types'
import { COLORS, COLOR_KEYS } from '../lib/colors'
import { CATEGORY_ICONS } from '../lib/icons'
import { fieldLabel, toggleChip } from './ui'

// Días de la semana con el lunes primero (0 = domingo)
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function ColorPicker({ label, value, onChange }: { label: string; value: ColorKey; onChange: (c: ColorKey) => void }) {
  const { t } = useTranslation()
  return (
    <fieldset>
      <legend className={fieldLabel}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            aria-label={t(`colors.${key}`)}
            title={t(`colors.${key}`)}
            onClick={() => onChange(key)}
            className={`size-7 rounded-full transition-shadow ${value === key ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
            style={{ backgroundColor: COLORS[key].strong }}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function IconPicker({ label, value, color, onChange }: { label: string; value: string; color: ColorKey; onChange: (icon: string) => void }) {
  return (
    <fieldset>
      <legend className={fieldLabel}>{label}</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            aria-label={key}
            onClick={() => onChange(key)}
            className={`flex h-9 items-center justify-center rounded-app border transition-colors ${
              value === key ? 'border-accent bg-surface-2' : 'border-line hover:border-line-strong'
            }`}
            style={value === key ? { color: COLORS[color].base } : undefined}
          >
            <Icon size={18} stroke={1.6} aria-hidden />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function WeekdayPicker({ label, value, onChange }: { label: string; value: number[]; onChange: (days: number[]) => void }) {
  const { i18n } = useTranslation()
  const narrow = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
  // 7 de enero de 2024 fue domingo: sirve para sacar el nombre de cada día
  const name = (wd: number) => narrow.format(new Date(2024, 0, 7 + wd))
  return (
    <fieldset>
      <legend className={fieldLabel}>{label}</legend>
      <div className="flex gap-1">
        {WEEK_ORDER.map((wd) => (
          <button
            key={wd}
            type="button"
            aria-pressed={value.includes(wd)}
            onClick={() => onChange(value.includes(wd) ? value.filter((d) => d !== wd) : [...value, wd].sort())}
            className={`w-8 ${toggleChip(value.includes(wd))}`}
          >
            {name(wd)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
