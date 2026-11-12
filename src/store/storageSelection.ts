import { create } from 'zustand'

// Archivos seleccionados en el gestor de almacenamiento (se comparte entre pestañas: las recomendaciones seleccionan y Archivos archiva)
interface SelectionState {
  ids: Set<string>
  set: (ids: Iterable<string>) => void
  toggle: (id: string) => void
  clear: () => void
}

export const useStorageSelection = create<SelectionState>((set) => ({
  ids: new Set(),
  set: (ids) => set({ ids: new Set(ids) }),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.ids)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ids: next }
    }),
  clear: () => set({ ids: new Set() }),
}))
