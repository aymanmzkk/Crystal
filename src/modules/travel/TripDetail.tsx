import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  IconArrowLeft,
  IconBed,
  IconBus,
  IconCamera,
  IconCar,
  IconCheck,
  IconChecklist,
  IconCoins,
  IconFileText,
  IconHome,
  IconLuggage,
  IconMapPin,
  IconPencil,
  IconPhoto,
  IconPlane,
  IconPlus,
  IconReceipt2,
  IconRoute,
  IconShoppingBag,
  IconTicket,
  IconToolsKitchen2,
  IconTrain,
  IconWallet,
  IconX,
} from '@tabler/icons-react'
import { Attachments } from '../../components/Attachments'
import { Checklist } from '../../components/Checklist'
import { ProgressRing } from '../../components/ProgressRing'
import { btn, btnGhost, btnPrimary, field, pill, segment, textarea } from '../../components/ui'
import { updateRecord } from '../../db/repo'
import type { CheckItem, DateKey, Trip, TripBooking, TripBookingKind, TripExpenseCategory, TripPlan, TripPlanKind } from '../../db/types'
import { diffDays, parseKey } from '../../lib/dates'
import { formatMoney } from '../../lib/format'
import { addAttachments, trashSlot } from '../../lib/files'
import { useToast } from '../../store/toast'
import { parseAmount } from '../finance/money'
import { BookingPanel, PlanPanel } from './TripForms'
import { EXPENSE_CATEGORIES, FOOD_KINDS, STAY_KINDS, prepProgress, spendByCategory, totalSpend, tripDays, tripStatus } from './trip'
import { STATUS_DOT, STATUS_TONE, TripCover } from './TripCover'

const TABS = ['overview', 'prep', 'bookings', 'plans', 'budget', 'itinerary', 'files'] as const
type Tab = (typeof TABS)[number]

export const BOOKING_ICON: Record<TripBookingKind, typeof IconPlane> = { flight: IconPlane, train: IconTrain, bus: IconBus, car: IconCar, hotel: IconBed, apartment: IconHome, other: IconTicket }
export const PLAN_ICON: Record<TripPlanKind, typeof IconPlane> = { activity: IconCamera, ticket: IconTicket, restaurant: IconToolsKitchen2, food: IconToolsKitchen2 }

type Editing = { kind: 'booking'; booking?: TripBooking; stay?: boolean } | { kind: 'plan'; plan?: TripPlan; food?: boolean } | null

// Tarjeta de un apartado del viaje
function Section({ title, icon, action, children, className = '' }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex min-w-0 flex-col p-4 ${className}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-fg-3" aria-hidden>
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-xs text-fg-3">{children}</p>
}

export function TripDetail({ trip, today, onBack, onEdit }: { trip: Trip; today: DateKey; onBack: () => void; onEdit: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const showToast = useToast((s) => s.show)
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState<Editing>(null)
  const status = tripStatus(trip, today)
  const days = diffDays(today, trip.start)
  const prep = prepProgress(trip)
  const spent = totalSpend(trip)
  const money = (n: number) => formatMoney(n, lang)
  const range = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'long' })
  const short = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const nights = Math.max(0, diffDays(trip.start, trip.end))

  const save = (changes: Partial<Trip>) => void updateRecord('trips', trip.id, changes)
  const setList = (key: 'todo' | 'shopping' | 'packing') => (items: CheckItem[]) => save({ [key]: items })

  const packingTemplate = () =>
    save({
      packing: [
        ...trip.packing,
        ...(t('travel.template', { returnObjects: true }) as string[])
          .filter((text) => !trip.packing.some((x) => x.text === text))
          .map((text) => ({ id: crypto.randomUUID(), text, done: false })),
      ],
    })
  const todoTemplate = () =>
    save({
      todo: [
        ...trip.todo,
        ...(t('travel.todoTemplate', { returnObjects: true }) as string[])
          .filter((text) => !trip.todo.some((x) => x.text === text))
          .map((text) => ({ id: crypto.randomUUID(), text, done: false })),
      ],
    })

  async function changeCover(files: FileList | null) {
    if (!files?.length) return
    const failed = await addAttachments({ table: 'trips', id: trip.id }, 'cover', [files[0]])
    if (failed) showToast({ message: t('files.failed', { count: failed }) })
  }

  const transport = trip.bookings.filter((b) => !STAY_KINDS.includes(b.kind))
  const stays = trip.bookings.filter((b) => STAY_KINDS.includes(b.kind))
  const activities = trip.plans.filter((p) => !FOOD_KINDS.includes(p.kind))
  const food = trip.plans.filter((p) => FOOD_KINDS.includes(p.kind))
  const byDate = <T extends { date: DateKey | null; time: string | null }>(list: T[]) =>
    [...list].sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9') || (a.time ?? '').localeCompare(b.time ?? ''))

  const bookingRow = (b: TripBooking) => {
    const Icon = BOOKING_ICON[b.kind]
    return (
      <li key={b.id} className="rounded-xl border border-line bg-surface-2/40 p-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg-2">
            <Icon size={18} aria-hidden />
          </span>
          <button type="button" onClick={() => setEditing({ kind: 'booking', booking: b })} className="min-w-0 flex-1 text-left">
            <span className="block truncate font-medium">{b.title || t(`travel.bookingKinds.${b.kind}`)}</span>
            <span className="block text-xs text-fg-3">
              {[b.date && short.format(parseKey(b.date)), b.time, b.endDate && `→ ${short.format(parseKey(b.endDate))}`, b.place].filter(Boolean).join(' · ') || t('travel.noDate')}
            </span>
            {b.code && <span className="mt-1 inline-block rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-xs tracking-wide">{b.code}</span>}
          </button>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {b.price !== null && <span className="text-sm font-semibold tabular-nums">{money(b.price)}</span>}
            <button
              type="button"
              onClick={() => save({ bookings: trip.bookings.map((x) => (x.id === b.id ? { ...x, paid: !x.paid } : x)) })}
              className={`${pill(b.paid ? 'success' : 'warning')} transition-transform active:scale-95`}
              aria-pressed={b.paid}
            >
              {b.paid && <IconCheck size={12} aria-hidden />}
              {b.paid ? t('travel.paid') : t('travel.unpaid')}
            </button>
          </span>
        </div>
        <div className="mt-3">
          <Attachments ownerTable="trips" ownerId={trip.id} slot={`booking:${b.id}`} variant="list" compact label={t('travel.addTicket')} defaultDate={b.date} />
        </div>
      </li>
    )
  }

  const planRow = (p: TripPlan) => {
    const Icon = PLAN_ICON[p.kind]
    return (
      <li key={p.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
        <input type="checkbox" checked={p.done} onChange={() => save({ plans: trip.plans.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)) })} aria-label={`${t('travel.visited')}: ${p.title}`} />
        <Icon size={17} className="shrink-0 text-fg-3" aria-hidden />
        <button type="button" onClick={() => setEditing({ kind: 'plan', plan: p })} className="min-w-0 flex-1 text-left">
          <span className={`block truncate ${p.done ? 'text-fg-3 line-through' : ''}`}>{p.title}</span>
          <span className="block text-xs text-fg-3">{[p.date && short.format(parseKey(p.date)), p.time, t(`travel.planKinds.${p.kind}`)].filter(Boolean).join(' · ')}</span>
        </button>
        {p.booked && <span className={pill('accent')}>{p.kind === 'ticket' || p.kind === 'activity' ? t('travel.bought') : t('travel.reserved')}</span>}
        {p.price !== null && <span className="shrink-0 text-sm tabular-nums text-fg-2">{money(p.price)}</span>}
      </li>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Portada con el nombre, fechas y cuenta atrás */}
      <div className="relative">
        <TripCover trip={trip} className="h-48 md:h-60" />
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3 md:px-6">
          <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black/40 px-3 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95">
            <IconArrowLeft size={17} aria-hidden />
            {t('apps.travel')}
          </button>
          <span className="flex-1" />
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-black/40 px-3 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55">
            <IconPhoto size={17} aria-hidden />
            <span className="hidden sm:inline">{t('travel.changeCover')}</span>
            <input type="file" accept="image/*" hidden onChange={(e) => (void changeCover(e.target.files), (e.target.value = ''))} aria-label={t('travel.changeCover')} />
          </label>
          <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black/40 px-3 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95">
            <IconPencil size={17} aria-hidden />
            <span className="hidden sm:inline">{t('travel.edit')}</span>
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-4 text-white md:px-6">
          <div className="min-w-0 flex-1">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-medium ring-1 ring-white/15 backdrop-blur-md">
              <span className={`size-1.5 rounded-full ${STATUS_DOT[STATUS_TONE[status]]}`} aria-hidden />
              {t(`travel.status.${status}`)}
            </span>
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{trip.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-white/85">
              <span className="flex items-center gap-1">
                <IconMapPin size={15} aria-hidden />
                {[trip.destination, trip.country].filter(Boolean).join(', ') || '—'}
              </span>
              <span className="first-letter:uppercase">
                {range.formatRange(parseKey(trip.start), parseKey(trip.end))} · {t('travel.nights', { count: nights })}
              </span>
            </p>
          </div>
          {status !== 'done' && (
            <div className="text-right">
              <span className="block text-4xl leading-none font-semibold tracking-tight tabular-nums">{status === 'now' ? '✈' : days}</span>
              <span className="text-xs font-medium tracking-wide uppercase opacity-80">{status === 'now' ? t('travel.status.now') : t('travel.daysLeft', { count: days })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Apartados */}
      <div className="sticky top-14 z-20 border-b border-line bg-bg/80 px-4 py-2.5 backdrop-blur-xl md:px-6">
        <div role="tablist" aria-label={trip.name} className="flex w-max max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5">
          {TABS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`${segment(tab === v)} whitespace-nowrap`}>
              {t(`travel.tabs.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <main key={tab} className="page-in w-full flex-1 p-4 md:p-6" role="tabpanel">
        {tab === 'overview' && (
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Section title={t('travel.prep')} icon={<IconChecklist size={17} />}>
              <div className="flex items-center gap-4">
                <ProgressRing value={prep.total ? prep.done / prep.total : 0} size={92} stroke={8} label={t('travel.prep')} />
                <ul className="flex-1 space-y-1.5 text-sm">
                  {(['todo', 'shopping', 'packing'] as const).map((k) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-fg-2">{t(`travel.lists.${k}`)}</span>
                      <span className="font-medium tabular-nums">
                        {trip[k].filter((x) => x.done).length}/{trip[k].length}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-2">
                    <span className="text-fg-2">{t('travel.paidBookings')}</span>
                    <span className="font-medium tabular-nums">
                      {trip.bookings.filter((b) => b.paid).length}/{trip.bookings.length}
                    </span>
                  </li>
                </ul>
              </div>
              <button type="button" onClick={() => setTab('prep')} className={`${btnGhost} mt-3 self-start`}>
                {t('travel.goPrep')}
              </button>
            </Section>

            <Section title={t('travel.money')} icon={<IconWallet size={17} />}>
              <MoneySummary trip={trip} spent={spent} />
              <button type="button" onClick={() => setTab('budget')} className={`${btnGhost} mt-3 self-start`}>
                {t('travel.goBudget')}
              </button>
            </Section>

            <Section title={t('travel.tabs.bookings')} icon={<IconPlane size={17} />} className="md:col-span-2 xl:col-span-1">
              {trip.bookings.length === 0 ? (
                <Empty>{t('travel.noBookings')}</Empty>
              ) : (
                <ul className="flex flex-col gap-2">
                  {byDate(trip.bookings).slice(0, 4).map((b) => {
                    const Icon = BOOKING_ICON[b.kind]
                    return (
                      <li key={b.id} className="flex items-center gap-3 text-sm">
                        <Icon size={17} className="shrink-0 text-fg-3" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{b.title || t(`travel.bookingKinds.${b.kind}`)}</span>
                        <span className="shrink-0 text-xs text-fg-3">{[b.date && short.format(parseKey(b.date)), b.time].filter(Boolean).join(' ')}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button type="button" onClick={() => setTab('bookings')} className={`${btnGhost} mt-3 self-start`}>
                {t('travel.goBookings')}
              </button>
            </Section>

            <Section title={t('travel.tabs.itinerary')} icon={<IconRoute size={17} />} className="md:col-span-2">
              <ol className="flex flex-col gap-2">
                {tripDays(trip).slice(0, 5).map((d, i) => (
                  <li key={d} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 text-xs font-medium text-fg-3">{t('travel.dayN', { n: i + 1 })}</span>
                    <span className={`min-w-0 flex-1 truncate ${trip.days[d] ? '' : 'text-fg-3'}`}>{trip.days[d] || '—'}</span>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => setTab('itinerary')} className={`${btnGhost} mt-3 self-start`}>
                {t('travel.goItinerary')}
              </button>
            </Section>

            <Section title={t('travel.photos')} icon={<IconPhoto size={17} />}>
              <Attachments ownerTable="trips" ownerId={trip.id} slot="photos" accept="image/*" compact label={t('travel.addPhotos')} />
            </Section>
          </div>
        )}

        {tab === 'prep' && (
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Section
              title={t('travel.lists.todo')}
              icon={<IconChecklist size={17} />}
              action={
                <button type="button" onClick={todoTemplate} className={btnGhost}>
                  {t('travel.useTemplate')}
                </button>
              }
            >
              <Checklist items={trip.todo} onChange={setList('todo')} placeholder={t('travel.addTodo')} />
            </Section>
            <Section title={t('travel.lists.shopping')} icon={<IconShoppingBag size={17} />}>
              <Checklist items={trip.shopping} onChange={setList('shopping')} placeholder={t('travel.addShopping')} />
            </Section>
            <Section
              title={t('travel.lists.packing')}
              icon={<IconLuggage size={17} />}
              action={
                <button type="button" onClick={packingTemplate} className={btnGhost}>
                  {t('travel.useTemplate')}
                </button>
              }
            >
              <Checklist items={trip.packing} onChange={setList('packing')} placeholder={t('travel.addItem')} />
            </Section>
          </div>
        )}

        {tab === 'bookings' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title={t('travel.transport')}
              icon={<IconPlane size={17} />}
              action={
                <button type="button" onClick={() => setEditing({ kind: 'booking' })} className={btn}>
                  <IconPlus size={16} aria-hidden />
                  {t('travel.addBooking')}
                </button>
              }
            >
              {transport.length === 0 ? <Empty>{t('travel.noTransport')}</Empty> : <ul className="stagger flex flex-col gap-3">{byDate(transport).map(bookingRow)}</ul>}
            </Section>
            <Section
              title={t('travel.stay')}
              icon={<IconBed size={17} />}
              action={
                <button type="button" onClick={() => setEditing({ kind: 'booking', stay: true })} className={btn}>
                  <IconPlus size={16} aria-hidden />
                  {t('travel.addStay')}
                </button>
              }
            >
              {stays.length === 0 ? <Empty>{t('travel.noStay')}</Empty> : <ul className="stagger flex flex-col gap-3">{byDate(stays).map(bookingRow)}</ul>}
            </Section>
            <Section title={t('travel.tickets')} icon={<IconTicket size={17} />} className="lg:col-span-2">
              <p className="mb-3 text-xs text-fg-3">{t('travel.ticketsHint')}</p>
              <Attachments ownerTable="trips" ownerId={trip.id} slot="tickets" variant="list" label={t('travel.addTicket')} />
            </Section>
          </div>
        )}

        {tab === 'plans' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title={t('travel.activities')}
              icon={<IconTicket size={17} />}
              action={
                <button type="button" onClick={() => setEditing({ kind: 'plan' })} className={btn}>
                  <IconPlus size={16} aria-hidden />
                  {t('travel.add')}
                </button>
              }
            >
              {activities.length === 0 ? <Empty>{t('travel.noActivities')}</Empty> : <ul className="stagger -mx-2 flex flex-col">{byDate(activities).map(planRow)}</ul>}
            </Section>
            <Section
              title={t('travel.food')}
              icon={<IconToolsKitchen2 size={17} />}
              action={
                <button type="button" onClick={() => setEditing({ kind: 'plan', food: true })} className={btn}>
                  <IconPlus size={16} aria-hidden />
                  {t('travel.add')}
                </button>
              }
            >
              {food.length === 0 ? <Empty>{t('travel.noFood')}</Empty> : <ul className="stagger -mx-2 flex flex-col">{byDate(food).map(planRow)}</ul>}
            </Section>
          </div>
        )}

        {tab === 'budget' && <BudgetTab trip={trip} spent={spent} save={save} />}

        {tab === 'itinerary' && (
          <div className="flex flex-col gap-4">
            <ol className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tripDays(trip).map((d, i) => {
                const items = [
                  ...trip.bookings.filter((b) => b.date === d).map((b) => ({ id: b.id, time: b.time, title: b.title || t(`travel.bookingKinds.${b.kind}`), Icon: BOOKING_ICON[b.kind] })),
                  ...trip.plans.filter((p) => p.date === d).map((p) => ({ id: p.id, time: p.time, title: p.title, Icon: PLAN_ICON[p.kind] })),
                ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
                return (
                  <li key={d} className="card flex flex-col p-4">
                    <header className="mb-2 flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{t('travel.dayN', { n: i + 1 })}</span>
                      <span className="text-xs text-fg-3 first-letter:uppercase">{short.format(parseKey(d))}</span>
                    </header>
                    {items.length > 0 && (
                      <ul className="mb-2 flex flex-col gap-1">
                        {items.map(({ id, time, title, Icon }) => (
                          <li key={id} className="flex items-center gap-2 text-xs">
                            <Icon size={14} className="text-fg-3" aria-hidden />
                            <span className="w-10 shrink-0 text-fg-3 tabular-nums">{time ?? ''}</span>
                            <span className="truncate">{title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <textarea
                      key={`${trip.id}-${d}`}
                      rows={3}
                      defaultValue={trip.days[d] ?? ''}
                      onBlur={(e) => e.target.value !== (trip.days[d] ?? '') && save({ days: { ...trip.days, [d]: e.target.value } })}
                      placeholder={t('travel.dayPlaceholder')}
                      aria-label={`${t('travel.dayN', { n: i + 1 })}: ${t('travel.plan')}`}
                      className={`${textarea} flex-1`}
                    />
                  </li>
                )
              })}
            </ol>
            <Section title={t('travel.generalNotes')} icon={<IconFileText size={17} />}>
              <textarea
                rows={4}
                defaultValue={trip.itinerary}
                onBlur={(e) => e.target.value !== trip.itinerary && save({ itinerary: e.target.value })}
                placeholder={t('travel.itineraryPlaceholder')}
                aria-label={t('travel.generalNotes')}
                className={textarea}
              />
            </Section>
          </div>
        )}

        {tab === 'files' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title={t('travel.tickets')} icon={<IconTicket size={17} />}>
              <Attachments ownerTable="trips" ownerId={trip.id} slot="tickets" variant="list" label={t('travel.addTicket')} />
            </Section>
            <Section title={t('travel.receipts')} icon={<IconCoins size={17} />}>
              <Attachments ownerTable="trips" ownerId={trip.id} slot="receipts" variant="list" label={t('travel.addReceipt')} />
            </Section>
            <Section
              title={t('travel.photos')}
              icon={<IconPhoto size={17} />}
              className="lg:col-span-2"
              action={
                <Link to="/memories" className={btnGhost}>
                  {t('apps.memories')}
                </Link>
              }
            >
              <Attachments ownerTable="trips" ownerId={trip.id} slot="photos" accept="image/*" label={t('travel.addPhotos')} />
            </Section>
          </div>
        )}
      </main>

      {editing?.kind === 'booking' && (
        <BookingPanel
          key={editing.booking?.id ?? 'new'}
          trip={trip}
          booking={editing.booking}
          defaultKind={editing.stay ? 'hotel' : 'flight'}
          onClose={() => setEditing(null)}
          onSave={(b) => save({ bookings: editing.booking ? trip.bookings.map((x) => (x.id === b.id ? b : x)) : [...trip.bookings, b] })}
          onDelete={(id) => (save({ bookings: trip.bookings.filter((x) => x.id !== id) }), void trashSlot(trip.id, `booking:${id}`))}
        />
      )}
      {editing?.kind === 'plan' && (
        <PlanPanel
          key={editing.plan?.id ?? 'new'}
          trip={trip}
          plan={editing.plan}
          defaultKind={editing.food ? 'restaurant' : 'activity'}
          onClose={() => setEditing(null)}
          onSave={(p) => save({ plans: editing.plan ? trip.plans.map((x) => (x.id === p.id ? p : x)) : [...trip.plans, p] })}
          onDelete={(id) => (save({ plans: trip.plans.filter((x) => x.id !== id) }), void trashSlot(trip.id, `plan:${id}`))}
        />
      )}
    </div>
  )
}

function MoneySummary({ trip, spent }: { trip: Trip; spent: number }) {
  const { t, i18n } = useTranslation()
  const money = (n: number) => formatMoney(n, i18n.language)
  const budget = trip.budget ?? 0
  const left = (trip.available ?? budget) - spent
  const rows = [
    { label: t('travel.budgetEstimated'), value: trip.budget !== null ? money(trip.budget) : '—' },
    { label: t('travel.available'), value: trip.available !== null ? money(trip.available) : '—' },
    { label: t('travel.spent'), value: money(spent) },
  ]
  return (
    <div>
      <p className="mb-3">
        <span className={`text-2xl font-semibold tracking-tight tabular-nums ${left < 0 ? 'text-danger' : ''}`}>{money(left)}</span>
        <span className="ml-1.5 text-xs text-fg-3">{t('travel.left')}</span>
      </p>
      {budget > 0 && (
        <span className="mb-3 block h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <span className={`block h-full rounded-full transition-[width] duration-700 ${spent > budget ? 'bg-danger' : 'accent-gradient'}`} style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} />
        </span>
      )}
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between gap-2">
            <span className="text-fg-2">{r.label}</span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BudgetTab({ trip, spent, save }: { trip: Trip; spent: number; save: (c: Partial<Trip>) => void }) {
  const { t, i18n } = useTranslation()
  const money = (n: number) => formatMoney(n, i18n.language)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<TripExpenseCategory>('food')
  const byCat = spendByCategory(trip)
  const max = Math.max(1, ...Object.values(byCat))

  function add(e: FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!title.trim() || value === null) return
    save({ expenses: [...trip.expenses, { id: crypto.randomUUID(), title: title.trim(), amount: value, category, date: null }] })
    setTitle('')
    setAmount('')
  }

  return (
    <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Section title={t('travel.money')} icon={<IconWallet size={17} />}>
        <MoneySummary trip={trip} spent={spent} />
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
          <label className="text-xs text-fg-2">
            {t('travel.budgetEstimated')}
            <input
              key={`b-${trip.budget}`}
              inputMode="decimal"
              defaultValue={trip.budget ? String(trip.budget).replace('.', ',') : ''}
              onBlur={(e) => save({ budget: parseAmount(e.target.value) })}
              placeholder="0,00 €"
              className={`${field} mt-1 w-full`}
            />
          </label>
          <label className="text-xs text-fg-2">
            {t('travel.available')}
            <input
              key={`a-${trip.available}`}
              inputMode="decimal"
              defaultValue={trip.available ? String(trip.available).replace('.', ',') : ''}
              onBlur={(e) => save({ available: parseAmount(e.target.value) })}
              placeholder="0,00 €"
              className={`${field} mt-1 w-full`}
            />
          </label>
        </div>
      </Section>

      <Section title={t('travel.byCategory')} icon={<IconCoins size={17} />}>
        <ul className="flex flex-col gap-3">
          {EXPENSE_CATEGORIES.map((c) => (
            <li key={c}>
              <span className="mb-1 flex justify-between text-sm">
                <span className="text-fg-2">{t(`travel.expenseCategories.${c}`)}</span>
                <span className="font-medium tabular-nums">{money(byCat[c])}</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(byCat[c] / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-fg-3">{t('travel.byCategoryHint')}</p>
      </Section>

      <Section title={t('travel.expenses')} icon={<IconReceipt2 size={17} />}>
        <form onSubmit={add} className="mb-3 flex flex-wrap gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('travel.expensePlaceholder')} aria-label={t('travel.expensePlaceholder')} className={`${field} min-w-0 flex-1`} />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00 €" aria-label={t('travel.amount')} className={`${field} w-24`} />
          <select value={category} onChange={(e) => setCategory(e.target.value as TripExpenseCategory)} aria-label={t('travel.category')} className={`${field} w-full sm:w-auto`}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`travel.expenseCategories.${c}`)}
              </option>
            ))}
          </select>
          <button type="submit" className={btnPrimary}>
            <IconPlus size={16} aria-hidden />
            {t('travel.add')}
          </button>
        </form>
        {trip.expenses.length === 0 ? (
          <Empty>{t('travel.noExpenses')}</Empty>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {trip.expenses.map((x) => (
              <li key={x.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{x.title}</span>
                  <span className="block text-xs text-fg-3">{t(`travel.expenseCategories.${x.category}`)}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">{money(x.amount)}</span>
                <button
                  type="button"
                  onClick={() => save({ expenses: trip.expenses.filter((e) => e.id !== x.id) })}
                  aria-label={`${t('calendar.form.delete')}: ${x.title}`}
                  className="text-fg-3 hover:text-danger md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                >
                  <IconX size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-medium text-fg-2">{t('travel.receipts')}</p>
          <Attachments ownerTable="trips" ownerId={trip.id} slot="receipts" variant="list" compact label={t('travel.addReceipt')} />
        </div>
      </Section>
    </div>
  )
}
