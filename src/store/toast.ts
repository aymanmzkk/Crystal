import { create } from 'zustand'

export interface ToastData {
  id: number
  message: string
  // Botón opcional, normalmente "Deshacer"
  action?: { label: string; run: () => void }
}

interface ToastState {
  toast: ToastData | null
  show: (toast: Omit<ToastData, 'id'>) => void
  hide: () => void
}

let nextId = 1

// Aviso corto en la parte de abajo ("Movido a la papelera · Deshacer")
export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  hide: () => set({ toast: null }),
}))
