import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Icon, type IconName } from './Icons'

interface MenuItem {
  label: string
  hint?: string
  run: () => void
}

interface MenuProps {
  label: string
  icon: IconName
  items: MenuItem[]
  title?: string
}

/** Menu suspenso simples: fecha com Esc, clique fora ou escolha. */
export function Menu({ label, icon, items, title }: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={wrap}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        title={title ?? label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={icon} size={16} />
        <span>{label}</span>
      </button>
      {open ? (
        <div className="menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setOpen(false)
                item.run()
              }}
            >
              <span>{item.label}</span>
              {item.hint ? <kbd>{item.hint}</kbd> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: string; icon?: IconName; title?: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`seg-btn${value === opt.value ? ' is-on' : ''}`}
          aria-pressed={value === opt.value}
          title={opt.title ?? opt.label}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? <Icon name={opt.icon} size={15} /> : null}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

export function ToolButton({
  icon,
  label,
  onClick,
  title,
  disabled,
  primary,
  danger,
}: {
  icon: IconName
  label: string
  onClick: () => void
  title?: string
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      className={`btn ${primary ? 'btn-primary' : 'btn-ghost'}${danger ? ' btn-danger' : ''}`}
      onClick={onClick}
      title={title ?? label}
      disabled={disabled}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  )
}

export function IconButton({
  icon,
  onClick,
  label,
  disabled,
  title,
}: {
  icon: IconName
  onClick: () => void
  label: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

export function Sep(): ReactNode {
  return <span className="tb-sep" aria-hidden="true" />
}
