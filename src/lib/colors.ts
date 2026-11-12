import type { CSSProperties } from 'react'
import type { ColorKey } from '../db/types'

// base: tono medio (iconos, bordes, fondos suaves). strong: tono fuerte para fondos rellenos con texto blanco.
export const COLORS: Record<ColorKey, { base: string; strong: string }> = {
  blue: { base: '#378ADD', strong: '#185FA5' },
  teal: { base: '#1D9E75', strong: '#0F6E56' },
  green: { base: '#639922', strong: '#3B6D11' },
  amber: { base: '#BA7517', strong: '#854F0B' },
  coral: { base: '#D85A30', strong: '#993C1D' },
  red: { base: '#E24B4A', strong: '#A32D2D' },
  pink: { base: '#D4537E', strong: '#993556' },
  purple: { base: '#7F77DD', strong: '#534AB7' },
  gray: { base: '#888780', strong: '#5F5E5A' },
}

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[]

// Variables CSS que usan las clases event-tint y event-solid de index.css
export function colorVars(key: ColorKey): CSSProperties {
  return { '--h': COLORS[key].base, '--hs': COLORS[key].strong } as CSSProperties
}
