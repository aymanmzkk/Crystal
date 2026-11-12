import type { CSSProperties, DragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconCheck, IconCheckbox } from '@tabler/icons-react'
import type { Category, ColorKey } from '../../db/types'
import { colorVars } from '../../lib/colors'
import { getCategoryIcon } from '../../lib/icons'
import type { AppIcon } from '../registry'
import { isEditable, isTaskEvent, toggleOccurrenceDone } from './activities'
import type { Occurrence } from './recurrence'

export interface OccurrenceLook {
  color: ColorKey
  Icon: AppIcon
  done: boolean
  // Clase de index.css: franja de color, más marcada si es importante, gris si está hecha
  className: string
  style: CSSProperties
}

export function lookOf(occ: Occurrence, categories: Map<string, Category>): OccurrenceLook {
  const category = categories.get(occ.event.categoryId)
  const color = occ.event.color ?? category?.color ?? 'gray'
  const done = occ.event.doneDates.includes(occ.start)
  return {
    color,
    Icon: isTaskEvent(occ.event.id) ? IconCheckbox : getCategoryIcon(category?.icon),
    done,
    className: done ? 'activity-done' : occ.event.important ? 'activity-solid' : 'activity-tint',
    style: colorVars(color),
  }
}

// Color del icono dentro de un evento: gris si está hecho y el tono del color si no
export function iconColor(look: OccurrenceLook): string {
  return look.done ? 'text-fg-3' : 'text-(--h)'
}

// Lo que se está arrastrando ahora mismo: una actividad del calendario o una tarea sin fecha de la barra lateral
export const DRAG_TYPE = 'application/x-vida-occurrence'
export interface DragData {
  // Clave de la aparición (Occurrence.key) o UNSCHEDULED + id de la tarea
  key: string
  // Minutos entre el inicio y el punto por donde se agarró (vista semana)
  grabMin: number
  // Duración con la que se dibuja la sombra al arrastrar
  duration: number
}
export const UNSCHEDULED = 'unscheduled:'
export const dragState: { current: DragData | null } = { current: null }
if (typeof window !== 'undefined') window.addEventListener('dragend', () => (dragState.current = null))

export function startDrag(e: DragEvent, key: string, grabMin = 0, duration = 60) {
  dragState.current = { key, grabMin, duration }
  // Hace falta poner algo en dataTransfer para que el navegador permita arrastrar
  e.dataTransfer.setData(DRAG_TYPE, key)
  e.dataTransfer.effectAllowed = 'move'
}

// Círculo para marcar como hecha (como en Pipedrive). Solo en eventos propios y tareas.
export function DoneButton({ occ, size = 'sm' }: { occ: Occurrence; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  const done = occ.event.doneDates.includes(occ.start)
  if (!isEditable(occ)) return null
  const box = size === 'md' ? 'size-[18px]' : 'size-4'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void toggleOccurrenceDone(occ)
      }}
      aria-pressed={done}
      aria-label={`${done ? t('calendar.markUndone') : t('calendar.markDone')}: ${occ.event.title}`}
      title={done ? t('calendar.markUndone') : t('calendar.markDone')}
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 hover:scale-110 active:scale-90 ${
        done ? 'border-success bg-success text-white' : 'border-(--h) bg-surface/70 text-transparent hover:text-(--h)'
      }`}
    >
      <IconCheck size={size === 'md' ? 12 : 11} stroke={3} aria-hidden />
    </button>
  )
}

interface EventChipProps {
  occ: Occurrence
  categories: Map<string, Category>
  onOpen: (occ: Occurrence, at: { x: number; y: number }) => void
  prefix?: ReactNode
}

// Etiqueta pequeña de una actividad, para la vista mes y la fila de "todo el día". Se puede arrastrar.
export function EventChip({ occ, categories, onOpen, prefix }: EventChipProps) {
  const look = lookOf(occ, categories)
  const editable = isEditable(occ)
  return (
    <div
      draggable={editable}
      onDragStart={(e) => (e.stopPropagation(), startDrag(e, occ.key, 0, 60))}
      onClick={(e) => e.stopPropagation()}
      style={look.style}
      className={`group flex w-full min-w-0 items-center gap-1 rounded-md py-px pr-1 pl-1 text-[0.8125rem] leading-5 transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-sm ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${look.className}`}
    >
      {editable ? <DoneButton occ={occ} /> : <look.Icon size={14} className={`shrink-0 ${iconColor(look)}`} aria-hidden />}
      <button type="button" onClick={(e) => onOpen(occ, { x: e.clientX, y: e.clientY })} title={occ.event.title} className="flex min-w-0 flex-1 items-center gap-1 text-left">
        {prefix}
        {occ.event.time && occ.start === occ.end && <span className="shrink-0 text-fg-3 tabular-nums">{occ.event.time}</span>}
        <span className={`event-title truncate ${look.done ? 'line-through' : ''}`}>{occ.event.title}</span>
      </button>
    </div>
  )
}
