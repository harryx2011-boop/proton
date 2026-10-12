import Link from 'next/link'
import { byId } from '@/lib/numbers'

const shown = [
  { id: 'latency-decide', caption: 'Typical time for one decision' },
  { id: 'memory-extension', caption: 'Memory while running' },
  { id: 'routing-top3', caption: 'Tasks where the right skill was in the top three' },
]

export function KeyNumbers() {
  return (
    <div>
      <dl className="grid gap-4 md:grid-cols-3">
        {shown.map(({ id, caption }) => {
          const n = byId(id)
          return (
            <div key={id} className="rounded-panel border border-line bg-surface p-6">
              <dt className="sr-only">{caption}</dt>
              <dd className="m-0">
                <span className="font-mono text-heading font-medium tracking-tight">{n.value}</span>
                <span className="ml-2 font-mono text-body text-fg-muted">{n.unit}</span>
                <p className="mt-2 text-body text-fg">{caption}</p>
                <p className="mt-1 text-caption text-fg-muted">Measured {n.measured}</p>
              </dd>
            </div>
          )
        })}
      </dl>
      <Link
        href="/benchmarks"
        className="mt-6 inline-flex min-h-11 items-center rounded-control border border-line-strong px-5 text-body font-medium transition-[transform,background-color] duration-[var(--duration-control)] ease-standard hover:-translate-y-0.5 hover:bg-raised"
      >
        See All Benchmarks
      </Link>
    </div>
  )
}
