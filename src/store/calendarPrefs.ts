import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CalendarView = 'day' | 'week' | 'month' | 'agenda'

interface CalendarPrefs {
  view: CalendarView
  // Calendarios ocultos en los filtros (ids)
  hidden: string[]
  // Si las tareas con fecha salen en el calendario
  showTasks: boolean
  // Barra lateral del calendario plegada
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setShowTasks: (show: boolean) => void
  setView: (view: CalendarView) => void
  toggleHidden: (id: string) => void
}

export const useCalendarPrefs = create<CalendarPrefs>()(
  persist(
    (set) => ({
      view: 'week',
      hidden: [],
      showTasks: true,
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setShowTasks: (showTasks) => set({ showTasks }),
      setView: (view) => set({ view }),
      toggleHidden: (id) =>
        set((s) => ({ hidden: s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id] })),
    }),
    { name: 'vida-calendar' },
  ),
)
