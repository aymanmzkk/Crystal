import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { Attachments } from '../../components/Attachments'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input, textarea, toggleChip } from '../../components/ui'
import type { Trip, TripBooking, TripBookingKind, TripPlan, TripPlanKind } from '../../db/types'
import { parseAmount } from '../finance/money'
import { BOOKING_KINDS, PLAN_KINDS, STAY_KINDS } from './trip'

const priceText = (n: number | null) => (n !== null ? String(n).replace('.', ',') : '')

interface PanelProps<T, K> {
  trip: Trip
  onClose: () => void
  onSave: (item: T) => void
  onDelete: (id: string) => void
  defaultKind: K
}

// Vuelo, tren, alojamiento... con su localizador, precio y billete adjunto
export function BookingPanel({ trip, booking, defaultKind, onClose, onSave, onDelete }: PanelProps<TripBooking, TripBookingKind> & { booking?: TripBooking }) {
  const { t } = useTranslation()
  const id = useId()
  const [itemId] = useState(() => booking?.id ?? crypto.randomUUID())
  const [kind, setKind] = useState<TripBookingKind>(booking?.kind ?? defaultKind)
  const [title, setTitle] = useState(booking?.title ?? '')
  const [date, setDate] = useState(booking?.date ?? trip.start)
  const [time, setTime] = useState(booking?.time ?? '')
  const [endDate, setEndDate] = useState(booking?.endDate ?? (STAY_KINDS.includes(defaultKind) ? trip.end : ''))
  const [code, setCode] = useState(booking?.code ?? '')
  const [place, setPlace] = useState(booking?.place ?? '')
  const [price, setPrice] = useState(priceText(booking?.price ?? null))
  const [paid, setPaid] = useState(booking?.paid ?? false)
  const [notes, setNotes] = useState(booking?.notes ?? '')
  const stay = STAY_KINDS.includes(kind)

  function save(e: FormEvent) {
    e.preventDefault()
    onSave({ id: itemId, kind, title: title.trim(), date: date || null, time: time || null, endDate: endDate || null, code: code.trim(), place: place.trim(), price: parseAmount(price), paid, notes: notes.trim() })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {booking && (
        <button type="button" onClick={() => (onDelete(booking.id), onClose())} className={`ml-auto ${btnDanger}`} aria-label={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={booking ? t('travel.editBooking') : stay ? t('travel.addStay') : t('travel.addBooking')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={save} className="flex flex-col gap-4">
        <fieldset>
          <legend className={fieldLabel}>{t('habits.kind')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {BOOKING_KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={toggleChip(kind === k)}>
                {t(`travel.bookingKinds.${k}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${id}-title`} className={fieldLabel}>
            {t('tasks.form.title')}
          </label>
          <input id={`${id}-title`} autoFocus={!booking} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={stay ? 'Hotel Central' : 'Madrid → Lisboa'} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-date`} className={fieldLabel}>
              {stay ? t('travel.checkIn') : t('calendar.form.date')}
            </label>
            <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-time`} className={fieldLabel}>
              {t('travel.time')}
            </label>
            <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
          </div>
          {stay && (
            <div>
              <label htmlFor={`${id}-end`} className={fieldLabel}>
                {t('travel.checkOut')}
              </label>
              <input id={`${id}-end`} type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={input} />
            </div>
          )}
          <div>
            <label htmlFor={`${id}-code`} className={fieldLabel}>
              {t('travel.code')}
            </label>
            <input id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" className={`${input} font-mono`} />
          </div>
          <div className={stay ? 'col-span-2' : ''}>
            <label htmlFor={`${id}-place`} className={fieldLabel}>
              {stay ? t('travel.address') : t('travel.terminal')}
            </label>
            <input id={`${id}-place`} value={place} onChange={(e) => setPlace(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-price`} className={fieldLabel}>
              {t('travel.price')}
            </label>
            <input id={`${id}-price`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00 €" className={input} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            {t('travel.paid')}
          </label>
        </div>
        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textarea} />
        </div>
        <div>
          <p className={fieldLabel}>{t('travel.ticketFiles')}</p>
          {/* El id existe ya aunque la reserva sea nueva: los billetes se quedan si luego se guarda */}
          <Attachments ownerTable="trips" ownerId={trip.id} slot={`booking:${itemId}`} variant="list" compact label={t('travel.addTicket')} defaultDate={date || null} />
        </div>
      </form>
    </SidePanel>
  )
}

// Actividad, entrada, restaurante o comida que probar
export function PlanPanel({ trip, plan, defaultKind, onClose, onSave, onDelete }: PanelProps<TripPlan, TripPlanKind> & { plan?: TripPlan }) {
  const { t } = useTranslation()
  const id = useId()
  const [itemId] = useState(() => plan?.id ?? crypto.randomUUID())
  const [kind, setKind] = useState<TripPlanKind>(plan?.kind ?? defaultKind)
  const [title, setTitle] = useState(plan?.title ?? '')
  const [date, setDate] = useState(plan?.date ?? '')
  const [time, setTime] = useState(plan?.time ?? '')
  const [price, setPrice] = useState(priceText(plan?.price ?? null))
  const [booked, setBooked] = useState(plan?.booked ?? false)
  const [url, setUrl] = useState(plan?.url ?? '')
  const [notes, setNotes] = useState(plan?.notes ?? '')
  const [error, setError] = useState(false)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(true)
      return
    }
    onSave({ id: itemId, kind, title: title.trim(), date: date || null, time: time || null, price: parseAmount(price), booked, done: plan?.done ?? false, url: url.trim(), notes: notes.trim() })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {plan && (
        <button type="button" onClick={() => (onDelete(plan.id), onClose())} className={`ml-auto ${btnDanger}`} aria-label={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={plan ? t('travel.editPlan') : t('travel.newPlan')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={save} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className={fieldLabel}>{t('habits.kind')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={toggleChip(kind === k)}>
                {t(`travel.planKinds.${k}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${id}-title`} className={fieldLabel}>
            {t('tasks.form.title')}
          </label>
          <input id={`${id}-title`} autoFocus={!plan} value={title} onChange={(e) => (setTitle(e.target.value), setError(false))} aria-invalid={error} className={input} />
          {error && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-date`} className={fieldLabel}>
              {t('calendar.form.date')}
            </label>
            <input id={`${id}-date`} type="date" value={date} min={trip.start} max={trip.end} onChange={(e) => setDate(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-time`} className={fieldLabel}>
              {t('travel.time')}
            </label>
            <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-price`} className={fieldLabel}>
              {t('travel.price')}
            </label>
            <input id={`${id}-price`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00 €" className={input} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={booked} onChange={(e) => setBooked(e.target.checked)} />
            {kind === 'restaurant' || kind === 'food' ? t('travel.reserved') : t('travel.bought')}
          </label>
        </div>
        <div>
          <label htmlFor={`${id}-url`} className={fieldLabel}>
            {t('travel.link')}
          </label>
          <input id={`${id}-url`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={input} />
        </div>
        <div>
          <label htmlFor={`${id}-notes`} className={fieldLabel}>
            {t('calendar.form.notes')}
          </label>
          <textarea id={`${id}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textarea} />
        </div>
        <div>
          <p className={fieldLabel}>{t('travel.ticketFiles')}</p>
          <Attachments ownerTable="trips" ownerId={trip.id} slot={`plan:${itemId}`} variant="list" compact label={t('travel.addTicket')} defaultDate={date || null} />
        </div>
      </form>
    </SidePanel>
  )
}
