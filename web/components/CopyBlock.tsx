'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from '@/components/icons/generated'

// A code window: the label sits in the title bar, the copy button on its right.
export function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="win min-w-0 max-w-full">
      <div className="win-bar">
        <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <button type="button" onClick={copy} className="flip -my-2 inline-flex min-h-11 min-w-24 items-center justify-center gap-2 px-3 font-pixel text-pixel">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span role="status" className="sr-only">
          {copied ? 'Copied to the clipboard' : ''}
        </span>
      </div>
      <pre tabIndex={0} role="region" aria-label={`${label} code`} className="m-0 overflow-x-auto bg-paper p-4 font-mono text-caption">
        <code>{code}</code>
      </pre>
    </div>
  )
}
