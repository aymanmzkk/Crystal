import { useTranslation } from 'react-i18next'
import {
  IconAddressBook,
  IconArrowBackUp,
  IconBooks,
  IconCode,
  IconLanguage,
  IconPaperclip,
  IconPhoto,
  IconPlane,
  IconNotebook,
  IconPill,
  IconScale,
  IconTargetArrow,
  IconId,
  IconPackages,
  IconBucket,
  IconShoppingCart,
  IconBarbell,
  IconBook,
  IconCalendarDue,
  IconCalendarEvent,
  IconCards,
  IconCash,
  IconGift,
  IconPigMoney,
  IconReceipt2,
  IconArrowsExchange,
  IconCheckbox,
  IconClockHour4,
  IconListCheck,
  IconNote,
  IconRepeat,
  IconTag,
  IconTrash,
  IconTrashX,
} from '@tabler/icons-react'
import { ConfirmButton } from '../components/ConfirmButton'
import { TopBar } from '../components/TopBar'
import { useTrashItems } from '../db/hooks'
import { TRASH_DAYS, daysUntilPurge, deleteForever, emptyTrash, restoreFromTrash } from '../db/repo'
import type { TrashableTable } from '../db/types'

const KIND_ICON: Record<TrashableTable, typeof IconTrash> = {
  events: IconCalendarEvent,
  tasks: IconCheckbox,
  categories: IconTag,
  habits: IconRepeat,
  routines: IconListCheck,
  workShifts: IconClockHour4,
  subjects: IconBook,
  assessments: IconCalendarDue,
  decks: IconCards,
  cards: IconNote,
  exercises: IconBarbell,
  gymRoutines: IconListCheck,
  workouts: IconBarbell,
  transactions: IconCash,
  subscriptions: IconReceipt2,
  savingsGoals: IconPigMoney,
  wishlist: IconGift,
  debts: IconArrowsExchange,
  contacts: IconAddressBook,
  shopping: IconShoppingCart,
  chores: IconBucket,
  inventory: IconPackages,
  documents: IconId,
  measurements: IconScale,
  medications: IconPill,
  notes: IconNotebook,
  goals: IconTargetArrow,
  trips: IconPlane,
  memories: IconPhoto,
  library: IconBooks,
  projects: IconCode,
  courses: IconLanguage,
  attachments: IconPaperclip,
}

const DAY_MS = 24 * 60 * 60 * 1000

export function TrashPage() {
  const { t, i18n } = useTranslation()
  const items = useTrashItems()
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  const now = Date.now()

  return (
    <>
      <TopBar title={t('trash.title')} icon={<IconTrash size={18} stroke={1.8} />} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="flex items-center gap-1.5 font-semibold">
            <IconTrash size={20} aria-hidden />
            {t('trash.title')}
          </h1>
          {items && (
            <span className="text-fg-3">
              {t('trash.count', { count: items.length })} · {t('trash.autoDelete', { days: TRASH_DAYS })}
            </span>
          )}
          {items && items.length > 0 && (
            <span className="ml-auto">
              <ConfirmButton
                question={t('trash.emptyConfirm')}
                onConfirm={() => void emptyTrash()}
                className="inline-flex h-8 items-center gap-1.5 rounded-app border border-line-strong px-3 transition-colors hover:border-danger hover:text-danger"
              >
                <IconTrashX size={18} aria-hidden />
                {t('trash.empty')}
              </ConfirmButton>
            </span>
          )}
        </div>

        {items && items.length === 0 && (
          <div className="card px-6 py-14 text-center">
            <IconTrash size={28} stroke={1.5} className="mx-auto mb-3 text-fg-3" aria-hidden />
            <p className="font-semibold">{t('trash.emptyTitle')}</p>
            <p className="mt-1 text-fg-2">{t('trash.emptyBody', { days: TRASH_DAYS })}</p>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="overflow-hidden card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2/50 text-xs text-fg-3">
                <tr>
                  <th className="px-3 py-2 font-normal">{t('trash.colKind')}</th>
                  <th className="px-3 py-2 font-normal">{t('trash.colName')}</th>
                  <th className="hidden px-3 py-2 font-normal sm:table-cell">{t('trash.colDeleted')}</th>
                  <th className="px-3 py-2 font-normal">{t('trash.colExpires')}</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">{t('trash.colActions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const Icon = KIND_ICON[item.table]
                  const daysAgo = Math.floor((now - item.deletedAt) / DAY_MS)
                  const daysLeft = daysUntilPurge(item.deletedAt, now)
                  return (
                    <tr key={item.id} className="border-t border-line transition-colors hover:bg-surface-2">
                      <td className="px-3 py-2 whitespace-nowrap text-fg-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon size={18} aria-hidden />
                          {t(`trash.kinds.${item.table}`)}
                        </span>
                      </td>
                      <td className="max-w-0 truncate px-3 py-2 sm:max-w-none">{item.label}</td>
                      <td className="hidden px-3 py-2 whitespace-nowrap text-fg-2 sm:table-cell">
                        {rtf.format(-daysAgo, 'day')}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap ${daysLeft <= 3 ? 'text-danger' : 'text-fg-2'}`}>
                        {rtf.format(daysLeft, 'day')}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void restoreFromTrash(item.table, item.id)}
                            className="inline-flex h-7 items-center gap-1.5 rounded-app border border-line-strong px-2.5 transition-colors hover:bg-surface"
                          >
                            <IconArrowBackUp size={18} aria-hidden />
                            {/* En móvil solo se ve el icono, pero el texto sigue ahí para lectores de pantalla */}
                            <span className="sr-only sm:not-sr-only">{t('trash.restore')}</span>
                          </button>
                          <ConfirmButton
                            question={t('common.sure')}
                            ariaLabel={t('trash.deleteForever')}
                            onConfirm={() => void deleteForever(item.table, item.id)}
                            className="inline-flex size-7 items-center justify-center rounded-app border border-line-strong text-fg-2 transition-colors hover:border-danger hover:text-danger"
                          >
                            <IconTrashX size={18} aria-hidden />
                          </ConfirmButton>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
