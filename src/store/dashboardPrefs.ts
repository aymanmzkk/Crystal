import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WIDGETS = ['today', 'tasks', 'habits', 'countdowns', 'focus', 'school', 'gym'] as const
export type WidgetId = (typeof WIDGETS)[number]

interface DashboardPrefs {
  order: WidgetId[]
  hidden: WidgetId[]
  setOrder: (order: WidgetId[]) => void
  toggleHidden: (id: WidgetId) => void
}

// Orden y visibilidad de los widgets del Dashboard (se guarda en este dispositivo)
export const useDashboardPrefs = create<DashboardPrefs>()(
  persist(
    (set) => ({
      order: [...WIDGETS],
      hidden: [],
      setOrder: (order) => set({ order }),
      toggleHidden: (id) => set((s) => ({ hidden: s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id] })),
    }),
    { name: 'vida-dashboard' },
  ),
)

// Orden guardado más los widgets nuevos que se hayan añadido a la app después
export function fullOrder(order: WidgetId[]): WidgetId[] {
  return [...order.filter((id) => WIDGETS.includes(id)), ...WIDGETS.filter((id) => !order.includes(id))]
}
