import { IconPlane } from '@tabler/icons-react'
import { AttachmentCover } from '../../components/Attachments'
import type { Trip } from '../../db/types'
import { coverHue, type TripStatus } from './trip'

export const STATUS_TONE: Record<TripStatus, 'accent' | 'warning' | 'success' | 'neutral'> = { planning: 'accent', soon: 'warning', now: 'success', done: 'neutral' }

// Punto de color del estado sobre la foto
export const STATUS_DOT = { accent: 'bg-accent', warning: 'bg-warning', success: 'bg-success', neutral: 'bg-white/60' }

// Portada del viaje: la foto subida o, si no hay, un degradado suave con el color del destino
export function TripCover({ trip, className = '' }: { trip: Trip; className?: string }) {
  const hue = coverHue(trip.destination || trip.name)
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 50% 18%))` }}
    >
      <IconPlane size={64} stroke={1} className="absolute -right-2 -bottom-3 text-white/10" aria-hidden />
      <AttachmentCover ownerTable="trips" ownerId={trip.id} slot="cover" className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
    </div>
  )
}

