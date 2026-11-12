import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconTrash } from '@tabler/icons-react'
import { ColorPicker, IconPicker, WeekdayPicker } from '../../components/pickers'
import { SidePanel } from '../../components/SidePanel'
import { btn, btnDanger, btnPrimary, fieldError, fieldLabel, input } from '../../components/ui'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { ColorKey, DateKey, Habit } from '../../db/types'
import { COLORS } from '../../lib/colors'
import { addDays, addDaysKey, parseKey, startOfWeek, toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'
import { bestStreak, completionRate, currentStreak, isDone, isScheduled, type HabitValues } from './stats'

const HEATMAP_WEEKS = 12

interface HabitPanelProps {
  habit?: Habit
  // Valores para un hábito nuevo (desde las sugerencias)
  preset?: Partial<Habit>
  values: HabitValues
  today: DateKey
  nextOrder: number
  onClose: () => void
}

export function HabitPanel({ habit, preset, values, today, nextOrder, onClose }: HabitPanelProps) {
  const { t } = useTranslation()
  const showToast = useToast((s) => s.show)
  const id = useId()
  const start = habit ?? preset
  const [name, setName] = useState(start?.name ?? '')
  const [icon, setIcon] = useState(start?.icon ?? 'star')
  const [color, setColor] = useState<ColorKey>(start?.color ?? 'green')
  const [kind, setKind] = useState<Habit['kind']>(start?.kind ?? 'check')
  const [goal, setGoal] = useState(String(start?.goal ?? 8))
  const [weekdays, setWeekdays] = useState<number[]>(start?.weekdays ?? [0, 1, 2, 3, 4, 5, 6])
  const [errors, setErrors] = useState<string[]>([])

  async function save(e: FormEvent) {
    e.preventDefault()
    const goalNumber = Math.round(Number(goal))
    const found = [
      !name.trim() && 'name',
      kind === 'count' && !(goalNumber >= 1) && 'goal',
      weekdays.length === 0 && 'weekdays',
    ].filter(Boolean) as string[]
    if (found.length) {
      setErrors(found)
      return
    }
    const data = { name: name.trim(), icon, color, kind, goal: kind === 'count' ? goalNumber : 1, weekdays }
    if (habit) await updateRecord('habits', habit.id, data)
    else await createRecord('habits', { ...data, order: nextOrder })
    onClose()
  }

  async function trash() {
    if (!habit) return
    await moveToTrash('habits', habit.id)
    showToast({
      message: t('calendar.toast.trashed', { name: habit.name }),
      action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('habits', habit.id) },
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
      {habit && (
        <button type="button" onClick={() => void trash()} className={`ml-auto ${btnDanger}`} title={t('calendar.form.delete')}>
          <IconTrash size={18} aria-hidden />
          <span className="sr-only">{t('calendar.form.delete')}</span>
        </button>
      )}
    </>
  )

  return (
    <SidePanel title={habit ? t('habits.editTitle') : t('habits.newTitle')} onClose={onClose} footer={footer}>
      <form id={id} onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-4">
        {habit && <HabitStats habit={habit} values={values} today={today} />}

        <div>
          <label htmlFor={`${id}-name`} className={fieldLabel}>
            {t('habits.name')}
          </label>
          <input
            id={`${id}-name`}
            autoFocus={!habit}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors([])
            }}
            placeholder={t('habits.namePlaceholder')}
            aria-invalid={errors.includes('name')}
            className={input}
          />
          {errors.includes('name') && <p className={fieldError}>{t('calendar.category.errors.name')}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-kind`} className={fieldLabel}>
              {t('habits.kind')}
            </label>
            <select id={`${id}-kind`} value={kind} onChange={(e) => setKind(e.target.value as Habit['kind'])} className={input}>
              <option value="check">{t('habits.kinds.check')}</option>
              <option value="count">{t('habits.kinds.count')}</option>
            </select>
          </div>
          {kind === 'count' && (
            <div>
              <label htmlFor={`${id}-goal`} className={fieldLabel}>
                {t('habits.goal')}
              </label>
              <input
                id={`${id}-goal`}
                type="number"
                min={1}
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value)
                  setErrors([])
                }}
                aria-invalid={errors.includes('goal')}
                className={input}
              />
              {errors.includes('goal') && <p className={fieldError}>{t('habits.errors.goal')}</p>}
            </div>
          )}
        </div>

        <div>
          <WeekdayPicker label={t('habits.weekdays')} value={weekdays} onChange={setWeekdays} />
          {errors.includes('weekdays') && <p className={fieldError}>{t('calendar.form.errors.weekdays')}</p>}
        </div>
        <ColorPicker label={t('calendar.category.color')} value={color} onChange={setColor} />
        <IconPicker label={t('calendar.category.icon')} value={icon} color={color} onChange={setIcon} />
      </form>
    </SidePanel>
  )
}

// Rachas, porcentaje y un mapa de las últimas semanas
function HabitStats({ habit, values, today }: { habit: Habit; values: HabitValues; today: DateKey }) {
  const { t } = useTranslation()
  const firstMonday = addDays(startOfWeek(parseKey(today)), -(HEATMAP_WEEKS - 1) * 7)
  const created = toDateKey(new Date(habit.createdAt))
  const stats = [
    { label: t('habits.streak'), value: t('calendar.days', { count: currentStreak(habit, values, today) }) },
    { label: t('habits.best'), value: t('calendar.days', { count: bestStreak(habit, values, today) }) },
    { label: t('habits.last30'), value: `${Math.round(completionRate(habit, values, today) * 100)} %` },
  ]
  return (
    <div className="card-2 p-3">
      <dl className="mb-3 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" aria-hidden>
        {Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
          const day = addDaysKey(toDateKey(firstMonday), i)
          const future = day > today
          const scheduled = isScheduled(habit, day) && day >= created
          const done = isDone(habit, values.get(day))
          return (
            <span
              key={day}
              title={day}
              className={`size-3 rounded-[2px] ${future || !scheduled ? 'bg-transparent' : done ? '' : 'bg-line'}`}
              style={done && !future ? { backgroundColor: COLORS[habit.color].base } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
