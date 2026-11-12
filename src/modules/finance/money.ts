import {
  IconBook,
  IconBus,
  IconConfetti,
  IconGift,
  IconHeartbeat,
  IconHome,
  IconReceipt2,
  IconShirt,
  IconShoppingCart,
  IconSparkles,
  IconSchool,
  IconTag,
  IconWallet,
} from '@tabler/icons-react'
import type { DateKey, FinanceCategory, SavingsGoal, Subscription, Transaction } from '../../db/types'
import { parseKey, toDateKey } from '../../lib/dates'
import type { AppIcon } from '../registry'

export const EXPENSE_CATEGORIES: FinanceCategory[] = ['food', 'transport', 'home', 'leisure', 'health', 'education', 'clothes', 'subscriptions', 'gifts', 'other']
export const INCOME_CATEGORIES: FinanceCategory[] = ['salary', 'grant', 'extra', 'gifts', 'other']

export const CATEGORY_ICON: Record<FinanceCategory, AppIcon> = {
  food: IconShoppingCart,
  transport: IconBus,
  home: IconHome,
  leisure: IconConfetti,
  health: IconHeartbeat,
  education: IconSchool,
  clothes: IconShirt,
  subscriptions: IconReceipt2,
  gifts: IconGift,
  other: IconTag,
  salary: IconWallet,
  grant: IconBook,
  extra: IconSparkles,
}

export interface Totals {
  income: number
  expense: number
  balance: number
  // Gasto por categoría, de mayor a menor
  byCategory: [FinanceCategory, number][]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function totals(transactions: Transaction[]): Totals {
  let income = 0
  let expense = 0
  const byCategory = new Map<FinanceCategory, number>()
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else {
      expense += t.amount
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
    }
  }
  return {
    income: round2(income),
    expense: round2(expense),
    balance: round2(income - expense),
    byCategory: [...byCategory].map(([c, v]) => [c, round2(v)] as [FinanceCategory, number]).sort((a, b) => b[1] - a[1]),
  }
}

export function monthlyEquivalent(sub: Pick<Subscription, 'amount' | 'cycle'>): number {
  return round2(sub.cycle === 'monthly' ? sub.amount : sub.amount / 12)
}

// Siguiente cobro: mismo día del mes siguiente (o del año siguiente). Si ese mes no tiene ese día, el último del mes.
export function advanceDate(date: DateKey, cycle: Subscription['cycle']): DateKey {
  const d = parseKey(date)
  const months = cycle === 'monthly' ? 1 : 12
  const lastDay = new Date(d.getFullYear(), d.getMonth() + months + 1, 0).getDate()
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + months, Math.min(d.getDate(), lastDay)))
}

// Cuánto hay que ahorrar al mes para llegar a tiempo. null si no tiene fecha o ya está conseguida.
export function monthlyNeeded(goal: Pick<SavingsGoal, 'target' | 'saved' | 'deadline'>, today: DateKey): number | null {
  const left = goal.target - goal.saved
  if (!goal.deadline || left <= 0) return null
  const a = parseKey(today)
  const b = parseKey(goal.deadline)
  const months = Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()))
  return round2(left / months)
}

// "12,99", "12.99" o "1.234,50" -> número. null si no es un importe válido mayor que 0.
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/\s|€/g, '')
  if (!clean) return null
  // Si hay coma, los puntos son de miles; si no, el punto es el decimal
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? round2(n) : null
}
