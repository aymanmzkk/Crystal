// Clases de Tailwind compartidas para que botones, campos y tarjetas se vean igual en toda la app

const press = 'transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.97]'

export const btn = `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-medium whitespace-nowrap text-fg shadow-sm hover:border-line-strong hover:bg-surface-2 ${press}`

export const btnPrimary = `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-accent px-3.5 font-semibold whitespace-nowrap text-accent-fg shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_2px_8px_-2px_var(--ring)] hover:brightness-110 ${press}`

export const btnDanger = `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-medium whitespace-nowrap text-fg shadow-sm hover:border-danger hover:text-danger ${press}`

// Botón fantasma: sin borde, para acciones secundarias dentro de tarjetas
export const btnGhost = `inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 font-medium whitespace-nowrap text-fg-2 hover:bg-surface-2 hover:text-fg ${press}`

export const btnIcon = `inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-2 shadow-sm hover:border-line-strong hover:bg-surface-2 hover:text-fg ${press}`

const fieldBase =
  'rounded-lg border border-line bg-surface-2/60 px-2.5 text-sm text-fg outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-fg-3 hover:border-line-strong focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--ring)]'

// Campo sin anchura fija, para barras de herramientas (añade tú w-40, max-w-48...)
export const field = `${fieldBase} h-9`

// Campo que ocupa todo el ancho, para formularios
export const input = `${field} w-full`

export const textarea = `${fieldBase} w-full py-2`

export const fieldLabel = 'mb-1.5 block text-xs font-medium text-fg-2'

export const fieldError = 'mt-1 text-xs text-danger'

// Tarjeta estándar y tarjeta clicable
export const card = 'card'
export const cardHover = 'card card-hover'

// Barra de herramientas de cada app (filtros, vistas, botón principal)
export const toolbar = 'flex flex-wrap items-center gap-2 px-4 py-3 md:px-6'

// Contenedor de una tabla
export const tableWrap = 'card overflow-x-auto'
export const th = 'px-3 py-2.5 text-xs font-medium text-fg-3'

// Botón de un grupo segmentado (Mes / Semana / Agenda...)
export function segment(active: boolean) {
  return `rounded-md px-3 py-1 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
    active ? 'bg-surface text-fg shadow-sm ring-1 ring-line-strong' : 'text-fg-2 hover:text-fg'
  }`
}

// Contenedor del grupo segmentado
export const segmentGroup = 'flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5'

// Botón que se puede activar y desactivar (chips de recordatorios, días de la semana...)
export function toggleChip(active: boolean) {
  return `rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 active:scale-95 ${
    active ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-fg' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg'
  }`
}

// Píldora de estado (Planificado, En curso...)
export function pill(tone: 'neutral' | 'accent' | 'success' | 'danger' | 'warning' = 'neutral') {
  const tones = {
    neutral: 'bg-surface-2 text-fg-2 ring-line',
    accent: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
    success: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success ring-[color-mix(in_srgb,var(--success)_30%,transparent)]',
    danger: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-danger ring-[color-mix(in_srgb,var(--danger)_30%,transparent)]',
    warning: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-warning ring-[color-mix(in_srgb,var(--warning)_30%,transparent)]',
  }
  return `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`
}
