import { useEffect } from 'react'
import i18n from '../i18n'
import { db } from '../db/db'
import { notifyUser } from '../lib/notify'
import { externalEvents } from '../modules/calendar/external'
import { useToast } from '../store/toast'
import { computeDueReminders, type DueReminder } from './schedule'

const LAST_CHECK_KEY = 'vida-reminders-last'
const FIRED_KEY = 'vida-reminders-fired'
const TICK_MS = 30_000
// Al abrir la app solo se recuperan los avisos de los últimos 10 minutos, para no lanzar avisos viejos
const MAX_CATCH_UP_MS = 10 * 60_000
// Se recuerda qué avisos ya salieron durante 9 días (más que el aviso más antelado)
const FIRED_TTL_MS = 9 * 24 * 60 * 60_000

function readFired(now: number): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as Record<string, number>
    return Object.fromEntries(Object.entries(all).filter(([, at]) => now - at < FIRED_TTL_MS))
  } catch {
    return {}
  }
}

function describe(reminder: DueReminder): string {
  const when = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(reminder.startsAt)
  if (reminder.minutesBefore === 0) return i18n.t(reminder.kind === 'event' ? 'reminders.startsNow' : 'reminders.dueNow')
  return i18n.t(reminder.kind === 'event' ? 'reminders.startsAt' : 'reminders.dueAt', { when })
}

async function notify(reminder: DueReminder) {
  const body = describe(reminder)
  useToast.getState().show({ message: `${reminder.title} · ${body}` })
  await notifyUser(reminder.title, body, reminder.key)
}

// Revisa cada 30 segundos si toca algún aviso de eventos o tareas mientras la app está abierta
export function useReminders() {
  useEffect(() => {
    async function tick() {
      const now = Date.now()
      let last = now - TICK_MS
      try {
        last = Number(localStorage.getItem(LAST_CHECK_KEY)) || last
      } catch {
        // Sin localStorage solo se miran los últimos 30 segundos
      }
      const [stored, tasks, categories, subjects, assessments, subscriptions, contacts, inventory, documents, trips] = await Promise.all([
        db.events.where('deletedAt').equals(0).toArray(),
        db.tasks.where('deletedAt').equals(0).toArray(),
        db.categories.where('deletedAt').equals(0).toArray(),
        db.subjects.where('deletedAt').equals(0).toArray(),
        db.assessments.where('deletedAt').equals(0).toArray(),
        db.subscriptions.where('deletedAt').equals(0).toArray(),
        db.contacts.where('deletedAt').equals(0).toArray(),
        db.inventory.where('deletedAt').equals(0).toArray(),
        db.documents.where('deletedAt').equals(0).toArray(),
        db.trips.where('deletedAt').equals(0).toArray(),
      ])
      // Los exámenes y entregas de Clase y los cobros de suscripciones avisan el día antes
      const events = [...stored, ...externalEvents({ subjects, assessments, subscriptions, contacts, inventory, documents, trips }, i18n.language)]
      const active = new Set(categories.map((c) => c.id))
      const due = computeDueReminders(
        events.filter((e) => active.has(e.categoryId)),
        tasks,
        Math.max(last, now - MAX_CATCH_UP_MS),
        now,
      )
      const fired = readFired(now)
      for (const reminder of due) {
        if (fired[reminder.key]) continue
        fired[reminder.key] = now
        await notify(reminder)
      }
      try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
        localStorage.setItem(LAST_CHECK_KEY, String(now))
      } catch {
        // Si no se puede guardar, como mucho se repetirá algún aviso
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), TICK_MS)
    return () => clearInterval(timer)
  }, [])
}
