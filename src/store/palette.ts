import { create } from 'zustand'

interface PaletteState {
  open: boolean
  setOpen: (open: boolean) => void
}

// Si el buscador Ctrl+K está abierto
export const usePalette = create<PaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
