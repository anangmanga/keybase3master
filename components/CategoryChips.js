// components/CategoryChips.js
import { useRef } from 'react'

export default function CategoryChips({
  items = [],
  active,
  onSelect,
  ariaLabel = 'Categories',
  className = '',
}) {
  const btnRefs = useRef([])

  if (!items?.length) return null

  const focusAt = (idx) => {
    const el = btnRefs.current[idx]
    if (el) el.focus()
  }

  const onKeyDown = (e, idx, name) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect?.(name)
        break
      case 'ArrowRight':
      case 'Right':
        e.preventDefault()
        focusAt((idx + 1) % items.length)
        break
      case 'ArrowLeft':
      case 'Left':
        e.preventDefault()
        focusAt((idx - 1 + items.length) % items.length)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(items.length - 1)
        break
      default:
    }
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 ${className}`}
    >
      {items.map((name, i) => {
        const selected = active === name
        return (
          <button
            key={name}
            ref={(el) => (btnRefs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect?.(name)}
            onKeyDown={(e) => onKeyDown(e, i, name)}
            className={[
              'shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium border transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60',
              selected
                ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                : 'bg-white text-gray-800 border-gray-200 hover:border-brand-blue/60',
            ].join(' ')}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
