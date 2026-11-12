import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TasksView = 'list' | 'kanban' | 'matrix'

interface TasksPrefs {
  view: TasksView
  showDone: boolean
  setView: (view: TasksView) => void
  setShowDone: (showDone: boolean) => void
}

export const useTasksPrefs = create<TasksPrefs>()(
  persist(
    (set) => ({
      view: 'kanban',
      showDone: false,
      setView: (view) => set({ view }),
      setShowDone: (showDone) => set({ showDone }),
    }),
    { name: 'vida-tasks' },
  ),
)
