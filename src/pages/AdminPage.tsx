import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconEye, IconLoader2, IconLock, IconLockOpen, IconRefresh, IconShieldCheck, IconUsers } from '@tabler/icons-react'
import { SidePanel } from '../components/SidePanel'
import { StatTile } from '../components/StatTile'
import { TopBar } from '../components/TopBar'
import { btn, btnGhost, pill } from '../components/ui'
import { useAccount, type Profile } from '../auth/account'
import { formatBytes } from '../lib/files'
import { supabase } from '../lib/supabase'
import { useToast } from '../store/toast'

interface Stats {
  user_id: string
  records: number
  bytes: number
  last_change: number | null
}

interface RecordRow {
  table_name: string
  id: string
  data: Record<string, unknown>
  deleted_at: number
}

// Panel del admin: cuentas, estadísticas, bloquear y ver datos
export function AdminPage() {
  const { t, i18n } = useTranslation()
  const me = useAccount((s) => s.profile)
  const showToast = useToast((s) => s.show)
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [stats, setStats] = useState<Map<string, Stats>>(new Map())
  const [viewing, setViewing] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [{ data: p }, { data: s }] = await Promise.all([supabase.from('profiles').select('*').order('created_at'), supabase.rpc('admin_stats')])
    setProfiles((p as Profile[] | null) ?? [])
    setStats(new Map(((s as Stats[] | null) ?? []).map((x) => [x.user_id, x])))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!supabase || me?.role !== 'admin') return <Navigate to="/" replace />

  async function setStatus(p: Profile, status: Profile['status']) {
    const { error } = await supabase!.from('profiles').update({ status }).eq('id', p.id)
    if (error) showToast({ message: t('admin.error') })
    else {
      showToast({ message: status === 'blocked' ? t('admin.blocked', { name: p.name || p.email }) : t('admin.unblocked', { name: p.name || p.email }) })
      void load()
    }
  }

  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  const ago = (iso: string | null) => {
    if (!iso) return t('admin.never')
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
    if (days === 0) {
      const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000)
      return rtf.format(hours, 'hour')
    }
    return rtf.format(days, 'day')
  }
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
  const list = profiles ?? []

  return (
    <>
      <TopBar title={t('admin.title')} icon={<IconShieldCheck size={18} stroke={1.8} />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={t('admin.accounts')} value={String(list.length)} />
          <StatTile label={t('admin.active')} value={String(list.filter((p) => p.status === 'active').length)} />
          <StatTile label={t('admin.blockedCount')} value={String(list.filter((p) => p.status === 'blocked').length)} tone={list.some((p) => p.status === 'blocked') ? 'danger' : undefined} />
          <StatTile label={t('admin.storage')} value={formatBytes([...stats.values()].reduce((s, x) => s + Number(x.bytes), 0), i18n.language)} />
        </div>

        <section className="card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <IconUsers size={17} className="text-fg-3" aria-hidden />
            <h2 className="text-sm font-semibold">{t('admin.users')}</h2>
            <button type="button" onClick={() => void load()} className={`${btnGhost} ml-auto`} aria-label={t('admin.refresh')}>
              {loading ? <IconLoader2 size={16} className="animate-spin" aria-hidden /> : <IconRefresh size={16} aria-hidden />}
            </button>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t('admin.user')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('admin.role')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('admin.registered')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('admin.lastSeen')}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t('admin.records')}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t('admin.size')}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const st = stats.get(p.id)
                  const self = p.id === me.id
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold uppercase">{(p.name || p.email).slice(0, 1)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {p.name || '—'} {self && <span className="text-xs text-fg-3">({t('admin.you')})</span>}
                            </span>
                            <span className="block truncate text-xs text-fg-3">{p.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          <span className={pill(p.role === 'admin' ? 'accent' : 'neutral')}>{t(`admin.roles.${p.role}`)}</span>
                          {p.status === 'blocked' && <span className={pill('danger')}>{t('admin.statusBlocked')}</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-fg-2">{date.format(new Date(p.created_at))}</td>
                      <td className="px-3 py-2.5 text-fg-2">{ago(p.last_seen_at)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{st ? Number(st.records) : 0}</td>
                      <td className="px-3 py-2.5 text-right text-fg-2 tabular-nums">{st ? formatBytes(Number(st.bytes), i18n.language) : '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setViewing(p)} className={btn} title={t('admin.viewData')}>
                            <IconEye size={16} aria-hidden />
                            <span className="hidden lg:inline">{t('admin.viewData')}</span>
                          </button>
                          {!self &&
                            (p.status === 'active' ? (
                              <button type="button" onClick={() => void setStatus(p, 'blocked')} className={`${btn} hover:border-danger hover:text-danger`}>
                                <IconLock size={16} aria-hidden />
                                {t('admin.block')}
                              </button>
                            ) : (
                              <button type="button" onClick={() => void setStatus(p, 'active')} className={btn}>
                                <IconLockOpen size={16} aria-hidden />
                                {t('admin.unblock')}
                              </button>
                            ))}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-xs text-fg-3">{t('admin.hint')}</p>
      </main>
      {viewing && <UserData profile={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

// Datos de una cuenta (solo lectura), agrupados por app
function UserData({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<RecordRow[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      ?.from('records')
      .select('table_name,id,data,deleted_at')
      .eq('user_id', profile.id)
      .eq('deleted_at', 0)
      .limit(5000)
      .then(({ data }) => setRows((data as RecordRow[] | null) ?? []))
  }, [profile.id])

  const groups = new Map<string, RecordRow[]>()
  for (const r of rows ?? []) groups.set(r.table_name, [...(groups.get(r.table_name) ?? []), r])
  const label = (r: RecordRow) => String(r.data.title ?? r.data.name ?? r.data.front ?? r.data.date ?? r.id)

  return (
    <SidePanel title={t('admin.dataOf', { name: profile.name || profile.email })} onClose={onClose} size="lg">
      {!rows && <div className="skeleton h-40" />}
      {rows && rows.length === 0 && <p className="py-8 text-center text-sm text-fg-3">{t('admin.noData')}</p>}
      <ul className="flex flex-col gap-2">
        {[...groups].map(([table, items]) => (
          <li key={table} className="rounded-xl border border-line">
            <button type="button" onClick={() => setOpen(open === table ? null : table)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium">
              {t(`trash.kinds.${table}`, { defaultValue: table })}
              <span className={pill('neutral')}>{items.length}</span>
            </button>
            {open === table && (
              <ul className="max-h-72 overflow-y-auto border-t border-line px-3 py-2 text-sm">
                {items.slice(0, 300).map((r) => (
                  <li key={r.id} className="truncate border-b border-line/60 py-1 text-fg-2 last:border-0">
                    {label(r)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </SidePanel>
  )
}
