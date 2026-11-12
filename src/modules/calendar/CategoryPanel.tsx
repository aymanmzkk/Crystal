import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { ColorPicker, IconPicker } from '../../components/pickers'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Category, ColorKey } from '../../db/types'
import { useToast } from '../../store/toast'

interface CategoryPanelProps {
  // null = crear un calendario nuevo
  category: Category | null
  nextOrder: number
  onClose: () => void
}

export function CategoryPanel({ category, nextOrder, onClose }: CategoryPanelProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState<ColorKey>(category?.color ?? 'blue')
  const [icon, setIcon] = useState(category?.icon ?? 'calendar')
  const [nameError, setNameError] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(true)
      return
    }
    const data = { name: name.trim(), color, icon }
    if (category) await updateRecord('categories', category.id, data)
    else await createRecord('categories', { ...data, order: nextOrder })
    onClose()
  }

  async function trash() {
    if (!category) return
    await moveToTrash('categories', category.id)
    showToast({
      message: t('calendar.toast.trashed', { name: category.name }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('categories', category.id) },
    })
    onClose()
  }

  const footer = (
    <>
      <button type="submit" form={id} className={btnPrimary}>
        {t('calendar.form.save')}
      </button>
      <button type="button" onClick={onClose} className={btn}>
        {t('calendar.form.cancel')}
      </button>
      {category && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`}>
          <IconTrash size={18} aria-hidden />
          {t('calendar.category.delete')}
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={category ? t('calendar.editCalendar') : t('calendar.newCalendar')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-name`} className={fieldLabel}>
            {t('calendar.category.name')}
          </label>
          <input
            id={`${id}-name`}
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError(false)
            }}
            placeholder={t('calendar.category.namePlaceholder')}
            aria-invalid={nameError}
            className={input}
          />
          {nameError && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
        </div>

        <ColorPicker label={t('calendar.category.color')} value={color} onChange={setColor} />
        <IconPicker label={t('calendar.category.icon')} value={icon} color={color} onChange={setIcon} />

        {category && <p className="text-xs text-fg-3">{t('calendar.category.deleteHint')}</p>}
      </form>
    </SidePanel>
  )
}
