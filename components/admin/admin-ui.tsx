'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronRight, X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function AdminWorkspace({ eyebrow, title, description, actions, children, className = '' }: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`messa-workspace ${className}`}>
      <header className="messa-workspace__header">
        <div>
          <p className="messa-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="messa-workspace__actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}

export function AdminPanel({ eyebrow, title, detail, action, children, className = '' }: {
  eyebrow?: string
  title?: string
  detail?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <article className={`messa-panel ${className}`}>
      {(eyebrow || title || detail || action) && (
        <header className="messa-panel__header">
          <div>
            {eyebrow && <p className="messa-kicker">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {detail && <p>{detail}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </article>
  )
}

export function AdminMetric({ label, value, detail, Icon, tone = 'gold', progress }: {
  label: string
  value: string
  detail: string
  Icon: LucideIcon
  tone?: 'gold' | 'green' | 'amber' | 'blue' | 'rose'
  progress?: number
}) {
  return (
    <article className={`messa-metric messa-tone--${tone}`}>
      <span className="messa-metric__icon"><Icon size={18} strokeWidth={1.8} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {typeof progress === 'number' && <i className="messa-progress"><b style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></i>}
    </article>
  )
}

export function AdminSegmented<T extends string>({ value, onChange, items, label }: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string; count?: number }[]
  label: string
}) {
  return (
    <div className="messa-segmented" role="group" aria-label={label}>
      {items.map(item => (
        <button key={item.value} type="button" className={value === item.value ? 'active' : ''} onClick={() => onChange(item.value)} aria-pressed={value === item.value}>
          {item.label}{typeof item.count === 'number' && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function AdminButton({ tone = 'neutral', icon: Icon, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'neutral' | 'danger' | 'quiet'
  icon?: LucideIcon
}) {
  return (
    <button {...props} className={`messa-button messa-button--${tone} ${className}`}>
      {Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function AdminStatus({ tone = 'neutral', children }: {
  tone?: 'green' | 'amber' | 'rose' | 'blue' | 'gold' | 'neutral'
  children: ReactNode
}) {
  return <span className={`messa-status messa-status--${tone}`}>{children}</span>
}

export function AdminEmpty({ Icon, title, description, action }: {
  Icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="messa-empty">
      <span><Icon size={22} strokeWidth={1.6} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function AdminSheet({ open, onClose, title, eyebrow, children, footer, wide = false }: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="messa-sheet-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`messa-sheet${wide ? ' messa-sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="messa-sheet-title">
        <header>
          <div>
            {eyebrow && <p className="messa-kicker">{eyebrow}</p>}
            <h2 id="messa-sheet-title">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar panel"><X size={19} /></button>
        </header>
        <div className="messa-sheet__body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}

export function AdminToast({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="messa-toast" role="status"><Check size={15} />{children}</div>
}

export function AdminListAction({ title, detail, leading, onClick }: {
  title: string
  detail: string
  leading?: ReactNode
  onClick?: () => void
}) {
  const content = (
    <>
      {leading && <span className="messa-list-action__leading">{leading}</span>}
      <span><b>{title}</b><small>{detail}</small></span>
      <ChevronRight size={17} />
    </>
  )
  return onClick ? <button type="button" className="messa-list-action" onClick={onClick}>{content}</button> : <div className="messa-list-action">{content}</div>
}
