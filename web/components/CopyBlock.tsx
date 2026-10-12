'use client'

import { useState } from 'react'

export function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="min-w-0 max-w-full rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <span className="text-caption text-fg-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 min-w-16 rounded-control px-3 text-caption font-medium text-fg transition-colors duration-[var(--duration-control)] hover:bg-raised"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre tabIndex={0} role="region" aria-label={`${label} code`} className="overflow-x-auto px-4 py-4 font-mono text-caption text-fg"><code>{code}</code></pre>
    </div>
  )
}
