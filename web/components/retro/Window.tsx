import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  gray?: boolean
  barRight?: ReactNode
}

// A 1-bit window. The title bar is decoration for the page; headings live in the body.
export function Window({ title, icon, children, className = '', bodyClassName = '', gray = false, barRight }: Props) {
  return (
    <section aria-label={title} className={`win ${gray ? 'win-gray' : ''} ${className}`}>
      <div className="win-bar">
        <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
        {icon ? <span aria-hidden="true" className="inline-flex shrink-0 items-center">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate text-pixel">{title}</span>
        {barRight}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
