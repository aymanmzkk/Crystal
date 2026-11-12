import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconTargetArrow, IconTrash, IconTrophy, IconX } from '@tabler/icons-react'
import { StatTile } from '../../components/StatTile'
import { btnIcon, btnPrimary, field, fieldError, segment } from '../../components/ui'
import { useGoals } from '../../db/hooks'
import { createRecord, moveToTrash, restoreFromTrash, updateRecord } from '../../db/repo'
import type { Goal } from '../../db/types'
import { useNow } from '../../hooks/useNow'
import { diffDays, parseKey, toDateKey } from '../../lib/dates'
import { useToast } from '../../store/toast'

type Filter = 'active' | 'bucket' | 'achieved'

// Progreso de 0 a 1 según los pasos hechos (un objetivo sin pasos cuenta como hecho o no hecho)
export function goalProgress(goal: Pick<Goal, 'milestones' | 'achievedAt'>): number {
  if (goal.achievedAt) return 1
  if (goal.milestones.length === 0) return 0
  return goal.milestones.filter((m) => m.done).length / goal.milestones.length
}

export default function GoalsPage() {
  const { t, i18n } = useTranslation()
  const today = toDateKey(useNow())
  const showToast = useToast((s) => s.show)
  const goals = useGoals()
  const [filter, setFilter] = useState<Filter>('active')
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [bucket, setBucket] = useState(false)
  const [error, setError] = useState(false)
  const all = goals ?? []
  const list = all
    .filter((g) => (filter === 'achieved' ? g.achievedAt : !g.achievedAt && (filter === 'bucket' ? g.bucket : !g.bucket)))
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(true)
      return
    }
    await createRecord('goals', { title: title.trim(), why: '', deadline: bucket ? null : deadline || null, milestones: [], bucket, achievedAt: null })
    setTitle('')
    setDeadline('')
    setError(false)
    setFilter(bucket ? 'bucket' : 'active')
  }

  // Al marcar el último paso el objetivo se da por conseguido
  function setMilestones(goal: Goal, milestones: Goal['milestones']) {
    const complete = milestones.length > 0 && milestones.every((m) => m.done)
    void updateRecord('goals', goal.id, { milestones, achievedAt: complete ? (goal.achievedAt ?? Date.now()) : null })
    if (complete && !goal.achievedAt) showToast({ message: t('goals.achievedToast', { name: goal.title }) })
  }

  async function trash(goal: Goal) {
    await moveToTrash('goals', goal.id)
    showToast({ message: t('calendar.toast.trashed', { name: goal.title }), action: { label: t('calendar.toast.undo'), run: () => void restoreFromTrash('goals', goal.id) } })
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t('goals.active')} value={String(all.filter((g) => !g.achievedAt && !g.bucket).length)} />
        <StatTile label={t('goals.bucket')} value={String(all.filter((g) => !g.achievedAt && g.bucket).length)} />
        <StatTile label={t('goals.achieved')} value={String(all.filter((g) => g.achievedAt).length)} />
      </div>
      <form onSubmit={(e) => void add(e)} noValidate className="flex flex-wrap items-center gap-2 card p-3">
        <IconTargetArrow size={20} className="text-fg-2" aria-hidden />
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(false)
          }}
          placeholder={bucket ? t('goals.bucketPlaceholder') : t('goals.placeholder')}
          aria-label={t('tasks.form.title')}
          aria-invalid={error}
          className={`${field} min-w-48 flex-1`}
        />
        {!bucket && (
          <label className="flex items-center gap-1.5 text-fg-2">
            {t('finance.deadline')}
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} w-36`} />
          </label>
        )}
        <label className="flex items-center gap-1.5 text-fg-2">
          <input type="checkbox" checked={bucket} onChange={(e) => setBucket(e.target.checked)} />
          {t('goals.isBucket')}
        </label>
        <button type="submit" className={btnPrimary}>
          {t('finance.add')}
        </button>
        {error && <p className={`w-full ${fieldError}`}>{t('calendar.form.errors.title')}</p>}
      </form>
      <div role="group" aria-label={t('school.filter')} className="flex w-fit gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
        {(['active', 'bucket', 'achieved'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={segment(filter === f)}>
            {t(`goals.${f}`)}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-fg-3">{t(`goals.empty.${filter}`)}</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            deadlineText={
              goal.deadline
                ? `${date.format(parseKey(goal.deadline))} · ${rtf.format(diffDays(today, goal.deadline), 'day')}`
                : goal.bucket
                  ? t('goals.someday')
                  : t('finance.noDeadline')
            }
            late={Boolean(goal.deadline && goal.deadline < today && !goal.achievedAt)}
            onMilestones={(m) => setMilestones(goal, m)}
            onAchieve={() => void updateRecord('goals', goal.id, { achievedAt: goal.achievedAt ? null : Date.now() })}
            onTrash={() => void trash(goal)}
          />
        ))}
      </ul>
    </main>
  )
}

interface GoalCardProps {
  goal: Goal
  deadlineText: string
  late: boolean
  onMilestones: (m: Goal['milestones']) => void
  onAchieve: () => void
  onTrash: () => void
}

function GoalCard({ goal, deadlineText, late, onMilestones, onAchieve, onTrash }: GoalCardProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState('')
  const [why, setWhy] = useState(goal.why)
  const progress = goalProgress(goal)
  const addStep = () => {
    if (!step.trim()) return
    onMilestones([...goal.milestones, { id: crypto.randomUUID(), text: step.trim(), done: false }])
    setStep('')
  }
  return (
    <li className={`flex flex-col gap-2 rounded-app border bg-surface p-3 ${goal.achievedAt ? 'border-success' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{goal.title}</h3>
          <p className={`text-xs ${late ? 'text-danger' : 'text-fg-3'}`}>{deadlineText}</p>
        </div>
        <button type="button" onClick={onAchieve} aria-pressed={Boolean(goal.achievedAt)} aria-label={t('goals.markAchieved')} title={t('goals.markAchieved')} className={`${btnIcon} ${goal.achievedAt ? 'text-success' : ''}`}>
          <IconTrophy size={19} aria-hidden />
        </button>
        <button type="button" onClick={onTrash} aria-label={t('calendar.form.delete')} className={btnIcon}>
          <IconTrash size={18} aria-hidden />
        </button>
      </div>
      <input
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        onBlur={() => why !== goal.why && void updateRecord('goals', goal.id, { why: why.trim() })}
        placeholder={t('goals.why')}
        aria-label={t('goals.why')}
        className="h-7 bg-transparent text-xs text-fg-2 outline-none placeholder:text-fg-3"
      />
      <div className="flex items-center gap-2 text-xs text-fg-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className={`block h-full rounded-full ${goal.achievedAt ? 'bg-success' : 'bg-accent'}`} style={{ width: `${progress * 100}%` }} />
        </span>
        {Math.round(progress * 100)} %
      </div>
      <ul className="flex flex-col">
        {goal.milestones.map((m) => (
          <li key={m.id} className="group flex items-center gap-2 py-0.5">
            <input type="checkbox" checked={m.done} onChange={() => onMilestones(goal.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))} aria-label={m.text} />
            <span className={`flex-1 text-xs ${m.done ? 'text-fg-3 line-through' : ''}`}>{m.text}</span>
            <button type="button" onClick={() => onMilestones(goal.milestones.filter((x) => x.id !== m.id))} aria-label={t('goals.removeStep')} className="text-fg-3 hover:text-fg md:opacity-0 md:group-hover:opacity-100 focus:opacity-100">
              <IconX size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addStep()
            }
          }}
          placeholder={t('goals.addStep')}
          aria-label={t('goals.addStep')}
          className={`${field} h-7 flex-1 text-xs`}
        />
        <button type="button" onClick={addStep} aria-label={t('goals.addStep')} className={`${btnIcon} size-7`}>
          <IconPlus size={16} aria-hidden />
        </button>
      </div>
    </li>
  )
}
