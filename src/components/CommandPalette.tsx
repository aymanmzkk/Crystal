import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconCheckbox,
  IconLanguage,
  IconPlus,
  IconSearch,
  IconSunMoon,
  IconTrash,
} from '@tabler/icons-react'
import { useActiveEvents, useActiveTasks } from '../db/hooks'
import { APP_ORDER, MODULES } from '../modules/registry'
import { addTask } from '../modules/tasks/taskActions'
import { usePalette } from '../store/palette'
import { useSettings, type Theme } from '../store/settings'
import { useToast } from '../store/toast'

const NEXT_THEME: Record<Theme, Theme> = { light: 'dark', dark: 'light' }
// Los eventos y tareas solo aparecen al escribir al menos esto, para que la lista no sea enorme
const MIN_SEARCH = 2

function Item({
  icon,
  children,
  onSelect,
  value,
}: {
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
  value: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-fg-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </Command.Item>
  )
}

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open, setOpen } = usePalette()
  const [query, setQuery] = useState('')
  const settings = useSettings()
  const showToast = useToast((s) => s.show)

  // Ctrl+K (o Cmd+K en Mac) abre y cierra el buscador desde cualquier pantalla
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!usePalette.getState().open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  const close = () => setOpen(false)
  const go = (path: string) => {
    close()
    navigate(path)
  }
  const text = query.trim()
  // El filtrado se hace aquí (no en cmdk) para que el orden sea siempre: resultados, apps, acciones y crear
  const matches = (label: string) => !text || label.toLowerCase().includes(text.toLowerCase())
  const apps = APP_ORDER.filter((id) => matches(t(`apps.${id}`)))
  const showTrash = matches(t('trash.title'))
  const showTheme = matches(t('palette.toggleTheme'))
  const showLanguage = matches(`${t('palette.toggleLanguage')} language idioma`)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 px-4 pt-[12vh]"
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.label')}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-w-xl animate-[toast-in_0.15s_ease-out] overflow-hidden rounded-app border border-line-strong bg-surface shadow-2xl"
      >
        <Command
          label={t('palette.label')}
          loop
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-fg-3"
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            <IconSearch size={20} className="text-fg-3" aria-hidden />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={t('palette.placeholder')}
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-3"
            />
            <kbd className="rounded border border-line-strong px-1.5 text-xs text-fg-3">Esc</kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-fg-3">{t('palette.empty')}</Command.Empty>
            {text.length >= MIN_SEARCH && <SearchResults query={text} go={go} />}
            <Command.Group heading={t('home.apps')}>
              {apps.map((id) => {
                const Icon = MODULES[id].icon
                return (
                  <Item
                    key={id}
                    value={`app ${t(`apps.${id}`)}`}
                    icon={<Icon size={19} aria-hidden />}
                    onSelect={() => go(`/${id}`)}
                  >
                    {t(`apps.${id}`)}
                  </Item>
                )
              })}
              {showTrash && (
                <Item value={`app ${t('trash.title')}`} icon={<IconTrash size={19} aria-hidden />} onSelect={() => go('/trash')}>
                  {t('trash.title')}
                </Item>
              )}
            </Command.Group>
            <Command.Group heading={t('palette.actions')}>
              {showTheme && (
                <Item
                  value={`action ${t('palette.toggleTheme')}`}
                  icon={<IconSunMoon size={19} aria-hidden />}
                  onSelect={() => {
                    settings.setTheme(NEXT_THEME[settings.theme])
                    close()
                  }}
                >
                  {t('palette.toggleTheme')} · {t(`status.theme.${NEXT_THEME[settings.theme]}`)}
                </Item>
              )}
              {showLanguage && (
                <Item
                  value={`action ${t('palette.toggleLanguage')} language idioma`}
                  icon={<IconLanguage size={19} aria-hidden />}
                  onSelect={() => {
                    settings.setLanguage(settings.language === 'es' ? 'en' : 'es')
                    close()
                  }}
                >
                  {t('palette.toggleLanguage')}
                </Item>
              )}
            </Command.Group>
            {text && (
              <Command.Group heading={t('palette.create')}>
                <Item
                  value={`create-task ${text}`}
                  icon={<IconPlus size={19} aria-hidden />}
                  onSelect={() => {
                    void addTask({ title: text })
                    showToast({ message: t('palette.taskCreated', { name: text }) })
                    close()
                  }}
                >
                  {t('palette.createTask', { name: text })}
                </Item>
                <Item
                  value={`create-event ${text}`}
                  icon={<IconCalendarPlus size={19} aria-hidden />}
                  onSelect={() => go(`/calendar?new=${encodeURIComponent(text)}`)}
                >
                  {t('palette.createEvent', { name: text })}
                </Item>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

// Eventos y tareas cuyo título contiene lo escrito
function SearchResults({ query, go }: { query: string; go: (path: string) => void }) {
  const { t } = useTranslation()
  const events = useActiveEvents() ?? []
  const tasks = useActiveTasks() ?? []
  const words = query.toLowerCase()
  const foundEvents = events.filter((e) => e.title.toLowerCase().includes(words)).slice(0, 8)
  const foundTasks = tasks.filter((x) => x.title.toLowerCase().includes(words)).slice(0, 8)

  return (
    <>
      {foundEvents.length > 0 && (
        <Command.Group heading={t('apps.calendar')}>
          {foundEvents.map((e) => (
            <Item
              key={e.id}
              value={`event ${e.id} ${e.title}`}
              icon={<IconCalendarEvent size={19} aria-hidden />}
              onSelect={() => go(`/calendar?open=${e.id}`)}
            >
              {e.title}
            </Item>
          ))}
        </Command.Group>
      )}
      {foundTasks.length > 0 && (
        <Command.Group heading={t('apps.tasks')}>
          {foundTasks.map((task) => (
            <Item
              key={task.id}
              value={`task ${task.id} ${task.title}`}
              icon={<IconCheckbox size={19} aria-hidden />}
              onSelect={() => go(`/tasks?open=${task.id}`)}
            >
              <span className={task.status === 'done' ? 'line-through' : ''}>{task.title}</span>
            </Item>
          ))}
        </Command.Group>
      )}
    </>
  )
}
