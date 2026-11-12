import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../store/toast'
import { useXp } from './useXp'

// Logros que ya se han enseñado (para avisar solo de los nuevos)
const SEEN_KEY = 'vida-achievements-seen'

function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

// Avisa con un toast al subir de nivel o desbloquear un logro
export function useAchievementWatcher() {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const xp = useXp()
  const lastLevel = useRef<number | null>(null)

  useEffect(() => {
    if (!xp) return
    const unlocked = xp.achievements.filter((a) => a.value >= a.goal).map((a) => a.id)
    const seen = readSeen()
    // La primera vez se guardan los que ya había, sin avisar
    if (seen === null) {
      localStorage.setItem(SEEN_KEY, JSON.stringify(unlocked))
    } else {
      const fresh = unlocked.filter((id) => !seen.has(id))
      if (fresh.length) {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh]))
        showToast({ message: t('achievements.unlocked', { name: t(`achievements.list.${fresh[0]}.name`) }) })
      }
    }
    if (lastLevel.current !== null && xp.level.level > lastLevel.current) showToast({ message: t('achievements.levelUp', { level: xp.level.level }) })
    lastLevel.current = xp.level.level
  }, [xp, showToast, t])
}
