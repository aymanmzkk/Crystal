import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconAlertCircle, IconEye, IconEyeOff, IconInfoCircle, IconLoader2, IconLock, IconMailCheck } from '@tabler/icons-react'
import { btnPrimary, fieldLabel, input } from '../components/ui'
import { supabase } from '../lib/supabase'
import { signOut } from './account'

type Mode = 'login' | 'register'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow),transparent)]" aria-hidden />
      <div className="relative w-full max-w-sm animate-[pop-in_0.3s_var(--ease-out-soft)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg?v=c3" alt="" className="size-16 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-semibold tracking-tight">Crystal</h1>
        </div>
        {children}
      </div>
    </div>
  )
}

// Pantalla de entrar o crear cuenta (solo sale si hay Supabase configurado)
export function AuthScreen() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    if (mode === 'register' && !name.trim()) return setError(t('auth.errors.name'))
    if (password.length < 8) return setError(t('auth.errors.password'))
    setBusy(true)
    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } })
    setBusy(false)
    if (result.error) {
      const msg = result.error.message.toLowerCase()
      setError(msg.includes('invalid login') ? t('auth.errors.invalid') : msg.includes('already') ? t('auth.errors.exists') : msg.includes('confirm') ? t('auth.errors.notConfirmed') : t('auth.errors.generic'))
      return
    }
    // Si Supabase pide confirmar el correo, todavía no hay sesión
    if (!result.data.session) return setCheckEmail(true)
    location.assign('/')
  }

  if (checkEmail)
    return (
      <Shell>
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <IconMailCheck size={36} stroke={1.5} className="text-accent" aria-hidden />
          <h2 className="text-lg font-semibold">{t('auth.checkEmailTitle')}</h2>
          <p className="text-sm text-fg-2">{t('auth.checkEmailBody', { email })}</p>
          <button type="button" onClick={() => (setCheckEmail(false), setMode('login'))} className={btnPrimary}>
            {t('auth.goLogin')}
          </button>
        </div>
      </Shell>
    )

  return (
    <Shell>
      <form onSubmit={(e) => void submit(e)} className="card flex flex-col gap-4 p-6" noValidate>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => (setMode(m), setError(''))}
              className={`rounded-md py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-surface text-fg shadow-sm ring-1 ring-line-strong' : 'text-fg-2 hover:text-fg'}`}
            >
              {t(`auth.${m}`)}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <div>
            <label htmlFor="auth-name" className={fieldLabel}>
              {t('auth.name')}
            </label>
            <input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className={fieldLabel}>
            {t('auth.email')}
          </label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="auth-password" className={fieldLabel}>
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${input} pr-10`}
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} className="absolute top-1/2 right-2 -translate-y-1/2 text-fg-3 hover:text-fg">
              {show ? <IconEyeOff size={18} aria-hidden /> : <IconEye size={18} aria-hidden />}
            </button>
          </div>
          {mode === 'register' && <p className="mt-1 text-xs text-fg-3">{t('auth.passwordHint')}</p>}
        </div>

        {mode === 'register' && (
          // Transparencia: la cuenta admin puede ver los datos
          <p className="flex gap-2 rounded-lg bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-2 text-xs text-fg-2">
            <IconInfoCircle size={16} className="mt-px shrink-0 text-warning" aria-hidden />
            {t('auth.adminNotice')}
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-danger" role="alert">
            <IconAlertCircle size={16} aria-hidden />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${btnPrimary} h-10`}>
          {busy && <IconLoader2 size={17} className="animate-spin" aria-hidden />}
          {mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
        </button>
      </form>
    </Shell>
  )
}

// Cuenta bloqueada por el admin
export function BlockedScreen() {
  const { t } = useTranslation()
  return (
    <Shell>
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <IconLock size={36} stroke={1.5} className="text-danger" aria-hidden />
        <h2 className="text-lg font-semibold">{t('auth.blockedTitle')}</h2>
        <p className="text-sm text-fg-2">{t('auth.blockedBody')}</p>
        <button type="button" onClick={() => void signOut()} className={btnPrimary}>
          {t('auth.logout')}
        </button>
      </div>
    </Shell>
  )
}
