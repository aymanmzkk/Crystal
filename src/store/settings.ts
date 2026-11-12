import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type Language = 'es' | 'en'
export type Accent = 'indigo' | 'violet' | 'emerald' | 'sky' | 'orange' | 'pink'
export const ACCENTS: Accent[] = ['indigo', 'violet', 'emerald', 'sky', 'orange', 'pink']

interface SettingsState {
  theme: Theme
  language: Language
  accent: Accent
  // Barra lateral plegada (solo iconos) en el ordenador
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setAccent: (accent: Accent) => void
}

// Ajustes del usuario, guardados en localStorage con la clave "vida-settings"
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en',
      accent: 'indigo',
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'vida-settings',
      // v1: ya no hay tema automático; quien lo tenía pasa a oscuro
      version: 1,
      migrate: (state) => {
        const s = state as Partial<SettingsState> & { theme?: string }
        return { ...s, theme: s.theme === 'light' ? 'light' : 'dark' } as SettingsState
      },
    },
  ),
)
