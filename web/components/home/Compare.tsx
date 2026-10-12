import Link from 'next/link'
import { Section } from '@/components/Section'
import { RetroChart } from '@/components/retro/RetroChart'
import { charts, type Chart } from '@/lib/bench/charts'
import { availableCharts } from '@/lib/bench/resolve'

// Which charts the home page shows: the local-model comparison when it was measured, otherwise speed, memory and routing.
const SETS = [
  ['llm-time', 'llm-accuracy', 'memory'],
  ['speed', 'memory', 'routing'],
]

export function Compare() {
  const ready = new Set(availableCharts().map((c) => c.id))
  const ids = SETS.find((set) => set.every((id) => ready.has(id))) ?? SETS[1]
  const picked = ids.map((id) => charts.find((c) => c.id === id)).filter((c): c is Chart => !!c && ready.has(c.id))
  if (!picked.length) return null
  return (
    <Section id="compare" title="How It Compares" intro="Each chart comes with its date, its test and the machine it ran on. Open the table under a chart for the exact numbers." crop>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {picked.map((c) => (
          <RetroChart key={c.id} chart={c} />
        ))}
      </div>
      <p className="m-0 mt-8">
        <Link href="/benchmarks" className="flip biglink inline-flex min-h-11 items-center px-1 text-title font-medium">
          See All Benchmarks
        </Link>
      </p>
    </Section>
  )
}
