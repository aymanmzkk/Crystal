import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/index.css'
import './index.css'
import './i18n'
import { App } from './App'
import { loadProfile, openAccountDatabase, touchLastSeen, useAccount, type Profile } from './auth/account'
import { AuthScreen, BlockedScreen } from './auth/AuthScreen'
import { initDatabase } from './db/startup'
import { supabase } from './lib/supabase'

const root = createRoot(document.getElementById('root')!)
const render = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>)

// Último perfil conocido, para poder abrir la app sin internet
const PROFILE_KEY = 'vida-profile'

async function start() {
  if (supabase) {
    // Con cuentas: sin sesión se enseña la pantalla de entrar
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) return render(<AuthScreen />)

    await openAccountDatabase(session.user.id)
    let profile = await loadProfile(session.user.id)
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    else {
      const cached = localStorage.getItem(PROFILE_KEY)
      const parsed = cached ? (JSON.parse(cached) as Profile) : null
      profile = parsed?.id === session.user.id ? parsed : null
    }
    useAccount.getState().set({ session, profile })
    if (profile?.status === 'blocked') return render(<BlockedScreen />)
    void touchLastSeen(session.user.id)
    // Si se cierra la sesión (en otra pestaña o caduca), se vuelve a la pantalla de entrar
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') location.assign('/')
    })
  }
  void initDatabase()
  render(<App />)
}

void start()
