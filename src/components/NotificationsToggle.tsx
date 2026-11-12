import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBell, IconBellOff, IconBellPlus } from '@tabler/icons-react'

type Permission = NotificationPermission | 'unsupported'

// Botón de la barra inferior para dar permiso a los avisos del navegador
export function NotificationsToggle() {
  const { t } = useTranslation()
  const [permission, setPermission] = useState<Permission>(() => ('Notification' in window ? Notification.permission : 'unsupported'))

  if (permission === 'unsupported') return null

  if (permission === 'granted') {
    return (
      <span className="flex items-center gap-1">
        <IconBell size={15} aria-hidden />
        {t('reminders.enabled')}
      </span>
    )
  }

  if (permission === 'denied') {
    return (
      <span className="flex items-center gap-1" title={t('reminders.blockedHint')}>
        <IconBellOff size={15} aria-hidden />
        {t('reminders.blocked')}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void Notification.requestPermission().then(setPermission)}
      className="flex items-center gap-1 rounded-app hover:text-fg"
    >
      <IconBellPlus size={15} aria-hidden />
      {t('reminders.enable')}
    </button>
  )
}
