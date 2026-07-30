import type { HTMLAttributes } from 'react'

export default function MessaWordmark({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`messa-wordmark ${className}`} aria-label="MESSA" {...props}>
      <span aria-hidden="true">MESSA</span>
    </span>
  )
}
