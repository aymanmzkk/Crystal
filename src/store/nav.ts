import { create } from 'zustand'

interface NavState {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

// Si el menú lateral del móvil está abierto
export const useNav = create<NavState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}))
