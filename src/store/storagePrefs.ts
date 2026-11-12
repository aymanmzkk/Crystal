import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LIMIT, addSnapshot, type AlertLevel, type StorageSnapshot } from '../lib/storage'

interface StoragePrefs {
  // Límite elegido para Crystal en este dispositivo (bytes)
  limit: number
  // Avisos automáticos al 70, 85 y 95 %
  alerts: boolean
  // Último nivel avisado (para no repetir el mismo aviso)
  lastAlert: AlertLevel
  // Una medida por día, para la gráfica de evolución
  history: StorageSnapshot[]
  setLimit: (limit: number) => void
  setAlerts: (alerts: boolean) => void
  setLastAlert: (level: AlertLevel) => void
  record: (snap: StorageSnapshot) => void
}

// Ajustes del almacenamiento: son de cada dispositivo (cada uno tiene su espacio), por eso van en localStorage
export const useStoragePrefs = create<StoragePrefs>()(
  persist(
    (set) => ({
      limit: DEFAULT_LIMIT,
      alerts: true,
      lastAlert: 0,
      history: [],
      setLimit: (limit) => set({ limit, lastAlert: 0 }),
      setAlerts: (alerts) => set({ alerts }),
      setLastAlert: (lastAlert) => set({ lastAlert }),
      record: (snap) => set((s) => ({ history: addSnapshot(s.history, snap) })),
    }),
    { name: 'vida-storage' },
  ),
)
