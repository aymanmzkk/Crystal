import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { Dexie } from 'dexie'
import { LEGACY_DB, VidaDB, db, switchToUserDatabase } from '../db/db'
import { createBackup, restoreBackup } from '../lib/backup'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'blocked'
  created_at: string
  last_seen_at: string | null
}

interface AccountState {
  session: Session | null
  profile: Profile | null
  set: (state: Partial<Pick<AccountState, 'session' | 'profile'>>) => void
}

// Cuenta con la que se ha entrado (null si no hay cuentas o no se ha entrado)
export const useAccount = create<AccountState>((set) => ({
  session: null,
  profile: null,
  set: (state) => set(state),
}))

// Qué cuenta se quedó con los datos que había en este dispositivo antes de las cuentas
const LEGACY_OWNER_KEY = 'vida-legacy-owner'

export async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return (data as Profile | null) ?? null
}

// Al arrancar con una sesión: cambia a la base de datos de esa cuenta.
// La primera cuenta que entra en este dispositivo se queda con los datos de antes (se copian a su base de datos).
export async function openAccountDatabase(userId: string): Promise<void> {
  switchToUserDatabase(userId)
  if (localStorage.getItem(LEGACY_OWNER_KEY)) return
  localStorage.setItem(LEGACY_OWNER_KEY, userId)
  if (!(await Dexie.exists(LEGACY_DB))) return
  const legacy = new VidaDB(LEGACY_DB)
  const userDb = db
  try {
    const backup = await createBackup(legacy)
    await restoreBackup(backup, userDb)
  } finally {
    legacy.close()
  }
}

// Marca la última conexión (para las estadísticas del admin). Si falla (sin internet), no pasa nada.
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    await supabase?.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
  } catch {
    // sin conexión
  }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
  location.assign('/')
}
