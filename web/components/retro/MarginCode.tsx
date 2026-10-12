import { encodeMarginCode } from '@/lib/retro/marginCode'
import { tools } from '@/lib/docs/tools'

const code = encodeMarginCode(
  tools.map((t) => t.name),
  4,
)

export function MarginCode({ className = '' }: { className?: string }) {
  return (
    <p
      aria-hidden="true"
      className={`pointer-events-none m-0 hidden select-none break-all font-mono text-caption tracking-widest min-[1400px]:block ${className}`}
      style={{ writingMode: 'vertical-rl' }}
    >
      {code}
    </p>
  )
}
