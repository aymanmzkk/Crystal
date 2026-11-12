import { useEffect, useId, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconCalendar, IconMapPin, IconPlane, IconPlus, IconTrash, IconWorld } from '@tabler/icons-react'
import { SidePanel } from '../../components/SidePanel'
import { StatTile } from '../../components/StatTile'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input, pill } from '../../components/ui'
import { useTrips } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Trip } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { diffDays, parseKey, toDateKey } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { useToast } from '../../store/toast'
import { parseAmount } from '../finance/money'
import { emptyTripParts, prepProgress, totalSpend, tripStatus } from './trip'
import { STATUS_DOT, STATUS_TONE, TripCover } from './TripCover'
import { TripDetail } from './TripDetail'

type Panel = { id: string } | { new: true } | null

function Bar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'danger' }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
      <span className={`block h-full rounded-full transition-[width] duration-700 ${tone === 'danger' ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </span>
  )
}

function TripCard({ trip, today, onOpen }: { trip: Trip; today: string; onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const status = tripStatus(trip, today)
  const days = diffDays(today, trip.start)
  const prep = prepProgress(trip)
  const spent = totalSpend(trip)
  const range = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })
  const nights = Math.max(0, diffDays(trip.start, trip.end))

  return (
    <li>
      <button type="button" onClick={onOpen} className="card card-hover group flex w-full flex-col overflow-hidden text-left">
        <div className="relative">
          <TripCover trip={trip} className="h-36 transition-transform duration-500 group-hover:scale-[1.02]" />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[STATUS_TONE[status]]}`} aria-hidden />
            {t(`travel.status.${status}`)}
          </span>
          {status !== 'done' && (
            <span className="absolute top-2.5 right-3 text-right text-white">
              <span className="block text-2xl leading-none font-semibold tracking-tight tabular-nums">{status === 'now' ? '✈' : days}</span>
              {status !== 'now' && <span className="text-[0.625rem] font-medium tracking-wide uppercase opacity-80">{t('travel.daysLeft', { count: days })}</span>}
            </span>
          )}
          <span className="absolute inset-x-3 bottom-2.5 text-white">
            <span className="block truncate text-base font-semibold">{trip.name}</span>
            <span className="flex items-center gap-1 text-xs opacity-85">
              <IconMapPin size={13} aria-hidden />
              {[trip.destination, trip.country].filter(Boolean).join(', ') || '—'}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-3 p-3.5">
          <span className="flex items-center gap-1.5 text-xs text-fg-2">
            <IconCalendar size={14} aria-hidden />
            {range.formatRange(parseKey(trip.start), parseKey(trip.end))} · {t('travel.nights', { count: nights })}
          </span>
          {status !== 'done' && prep.total > 0 && (
            <span className="block">
              <span className="mb-1 flex justify-between text-xs">
                <span className="text-fg-3">{t('travel.prep')}</span>
                <span className="font-medium tabular-nums">{Math.round((prep.done / prep.total) * 100)} %</span>
              </span>
              <Bar value={prep.done / prep.total} />
            </span>
          )}
          {trip.budget ? (
            <span className="block">
              <span className="mb-1 flex justify-between text-xs">
                <span className="text-fg-3">{t('travel.budget')}</span>
                <span className={`font-medium tabular-nums ${spent > trip.budget ? 'text-danger' : ''}`}>
                  {formatMoney(spent, i18n.language)} / {formatMoney(trip.budget, i18n.language)}
                </span>
              </span>
              <Bar value={spent / trip.budget} tone={spent > trip.budget ? 'danger' : 'accent'} />
            </span>
          ) : null}
        </div>
      </button>
    </li>
  )
}

export default function TravelPage() {
  const { t } = useTranslation()
  const today = toDateKey(useNow())
  const [params, setParams] = useSearchParams()
  const trips = useTrips()
  const [panel, setPanel] = useState<Panel>(null)
  const openId = params.get('trip')

  // ?open=<id> (desde el calendario) abre el viaje
  useEffect(() => {
    const open = params.get('open')
    if (open) setParams({ trip: open }, { replace: true })
  }, [params, setParams])

  const all = trips ?? []
  const openTrip = openId ? all.find((trip) => trip.id === openId) : undefined
  const upcoming = all.filter((trip) => trip.end >= today)
  const past = [...all.filter((trip) => trip.end < today)].reverse()
  const countries = [...new Set(past.map((trip) => trip.country.trim()).filter(Boolean))].sort()
  const panelTrip = panel && 'id' in panel ? all.find((trip) => trip.id === panel.id) : undefined
  const totalNights = past.reduce((n, trip) => n + Math.max(0, diffDays(trip.start, trip.end)), 0)

  const panelEl = panel && (
    <TripPanel
      key={'id' in panel ? panel.id : 'new'}
      trip={panelTrip}
      today={today}
      onClose={() => setPanel(null)}
      onCreated={(id) => setParams({ trip: id })}
      onTrashed={() => setParams({})}
    />
  )

  if (openTrip) {
    return (
      <>
        <TripDetail trip={openTrip} today={today} onBack={() => setParams({})} onEdit={() => setPanel({ id: openTrip.id })} />
        {panelEl}
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex w-full flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid flex-1 grid-cols-3 gap-3">
            <StatTile label={t('travel.upcoming')} value={String(upcoming.length)} />
            <StatTile label={t('travel.done')} value={String(past.length)} sub={totalNights ? t('travel.nights', { count: totalNights }) : undefined} />
            <StatTile label={t('travel.countries')} value={String(countries.length)} />
          </div>
          <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
            <IconPlus size={18} aria-hidden />
            {t('travel.new')}
          </button>
        </div>

        {trips && all.length === 0 && (
          <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-3">
              <IconPlane size={28} stroke={1.5} aria-hidden />
            </span>
            <p className="text-fg-2">{t('travel.empty')}</p>
            <button type="button" onClick={() => setPanel({ new: true })} className={btnPrimary}>
              <IconPlus size={18} aria-hidden />
              {t('travel.newTitle')}
            </button>
          </div>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="eyebrow mb-3">{t('travel.upcoming')}</h2>
            <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((trip) => (
                <TripCard key={trip.id} trip={trip} today={today} onOpen={() => setParams({ trip: trip.id })} />
              ))}
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="eyebrow mb-3">{t('travel.done')}</h2>
            <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {past.map((trip) => (
                <TripCard key={trip.id} trip={trip} today={today} onOpen={() => setParams({ trip: trip.id })} />
              ))}
            </ul>
          </section>
        )}

        {countries.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <IconWorld size={17} className="text-fg-3" aria-hidden />
              {t('travel.countries')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <li key={c} className={pill('neutral')}>
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      {panelEl}
    </div>
  )
}

// Datos básicos del viaje. El resto (reservas, planes, presupuesto...) se edita dentro del viaje.
function TripPanel({ trip, today, onClose, onCreated, onTrashed }: { trip?: Trip; today: string; onClose: () => void; onCreated: (id: string) => void; onTrashed: () => void }) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [name, setName] = useState(trip?.name ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [country, setCountry] = useState(trip?.country ?? '')
  const [start, setStart] = useState(trip?.start ?? today)
  const [end, setEnd] = useState(trip?.end ?? today)
  const [budget, setBudget] = useState(trip?.budget ? String(trip.budget).replace('.', ',') : '')
  const [available, setAvailable] = useState(trip?.available ? String(trip.available).replace('.', ',') : '')
  const [errors, setErrors] = useState<string[]>([])

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = [!name.trim() && 'name', end < start && 'dates'].filter(Boolean) as string[]
    if (found.length) {
      setErrors(found)
      return
    }
    const data = { name: name.trim(), destination: destination.trim(), country: country.trim(), start, end, budget: parseAmount(budget), available: parseAmount(available) }
    if (trip) {
      await updateRecord('trips', trip.id, data)
      onClose()
    } else {
      const newId = await createRecord('trips', { ...emptyTripParts(), ...data, packing: [], itinerary: '' })
      onClose()
      onCreated(newId)
    }
  }

  async function trash() {
    if (!trip) return
    await moveToTrash('trips', trip.id)
    showToast({ message: t('calendar.toast.trashed', { name: trip.name }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('trips', trip.id) } })
    onClose()
    onTrashed()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {trip && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={trip ? t('travel.editTitle') : t('travel.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-name`} className={fieldLabel}>
            {t('habits.name')}
          </label>
          <input id={`${id}-name`} autoFocus={!trip} value={name} onChange={(e) => (setName(e.target.value), setErrors([]))} placeholder={t('travel.namePlaceholder')} aria-invalid={errors.includes('name')} className={input} />
          {errors.includes('name') && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-dest`} className={fieldLabel}>
              {t('travel.destination')}
            </label>
            <input id={`${id}-dest`} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Lisboa" className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-country`} className={fieldLabel}>
              {t('travel.country')}
            </label>
            <input id={`${id}-country`} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Portugal" className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-start`} className={fieldLabel}>
              {t('travel.start')}
            </label>
            <input id={`${id}-start`} type="date" value={start} onChange={(e) => (setStart(e.target.value), setErrors([]))} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-end`} className={fieldLabel}>
              {t('travel.end')}
            </label>
            <input id={`${id}-end`} type="date" value={end} min={start} onChange={(e) => (setEnd(e.target.value), setErrors([]))} aria-invalid={errors.includes('dates')} className={input} />
          </div>
          {errors.includes('dates') && <p className={`col-span-2 -mt-2 ${fieldError}`}>{t('calendar.form.errors.endDate')}</p>}
          <div>
            <label htmlFor={`${id}-budget`} className={fieldLabel}>
              {t('travel.budgetEstimated')}
            </label>
            <input id={`${id}-budget`} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00 €" className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-available`} className={fieldLabel}>
              {t('travel.available')}
            </label>
            <input id={`${id}-available`} inputMode="decimal" value={available} onChange={(e) => setAvailable(e.target.value)} placeholder="0,00 €" className={input} />
          </div>
        </div>
        <p className="text-xs text-fg-3">{t('travel.panelHint')}</p>
      </form>
    </SidePanel>
  )
}
