import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Si no hay claves en .env.local, la app funciona como siempre: sin cuentas y solo en este dispositivo
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const accountsEnabled = supabase !== null
