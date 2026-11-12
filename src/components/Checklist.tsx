import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconX } from '@tabler/icons-react'
import type { CheckItem } from '../db/types'
import { btnIcon, field } from './ui'

// Lista de comprobación editable (maleta de un viaje, pendientes de un proyecto...)
export function Checklist({ items, onChange, placeholder }: { items: CheckItem[]; onChange: (items: CheckItem[]) => void; placeholder: string }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    onChange([...items, { id: crypto.randomUUID(), text: text.trim(), done: false }])
    setText('')
  }
  return (
    <div>
      <ul className="mb-2 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 py-0.5">
            <input type="checkbox" checked={item.done} onChange={() => onChange(items.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))} aria-label={item.text} />
            <span className={`flex-1 ${item.done ? 'text-fg-3 line-through' : ''}`}>{item.text}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((x) => x.id !== item.id))}
              aria-label={t('goals.removeStep')}
              className="text-fg-3 hover:text-fg focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <IconX size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${field} h-8 min-w-0 flex-1`}
        />
        <button type="button" onClick={add} aria-label={placeholder} className={btnIcon}>
          <IconPlus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
