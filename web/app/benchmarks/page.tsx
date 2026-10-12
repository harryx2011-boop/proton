import type { Metadata } from 'next'
import { charts } from '@/lib/bench/charts'
import { BarChart } from '@/components/charts/BarChart'
import { Reveal } from '@/components/Reveal'

export const metadata: Metadata = { title: 'Benchmarks', description: 'Measured speed, memory, skill routing accuracy and hidden-instruction scores for Proton.' }

export default function Benchmarks() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <Reveal>
        <h1 className="text-heading font-semibold tracking-tight">Benchmarks</h1>
        <p className="mt-4 max-w-prose text-lead text-fg-muted">
          Every number here was measured on one desktop PC and comes with its date. They show what Proton does on that machine, not a promise for yours.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {charts.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.06}>
            <BarChart chart={c} />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
