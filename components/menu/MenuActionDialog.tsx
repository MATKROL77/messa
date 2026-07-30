'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'

export default function MenuActionDialog({
  open,
  onClose,
  Icon,
  eyebrow,
  title,
  description,
  children,
  footer,
  tone = 'neutral',
  labelledBy = 'messa-menu-dialog-title',
}: {
  open: boolean
  onClose: () => void
  Icon: LucideIcon
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  tone?: 'neutral' | 'gold' | 'green' | 'danger'
  labelledBy?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="menu-action-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`menu-action-dialog menu-action-dialog--${tone}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header>
          <span className="menu-action-dialog__icon"><Icon size={22} strokeWidth={1.7} /></span>
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={labelledBy}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        {children && <div className="menu-action-dialog__body">{children}</div>}
        {footer && <footer>{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
