import type { ReactNode } from 'react'

export function RuleBlock({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border-l border-ink pl-4 ${className}`}>{children}</div>
}
