import type { Chart } from '@/lib/bench/charts'
import { byId } from '@/lib/numbers'

export function BarChart({ chart }: { chart: Chart }) {
  const rows = chart.series.map((s) => ({ ...s, n: byId(s.numberId) }))
  const pct = (v: number) => `${Math.min(100, (v / chart.max) * 100)}%`
  return (
    <figure className="rounded-panel border border-line bg-surface p-5 md:p-6" aria-labelledby={`chart-${chart.id}`}>
      <h2 id={`chart-${chart.id}`} className="text-title font-semibold tracking-tight">
        {chart.title}
      </h2>
      <p className="mt-1 text-caption text-fg-muted">{chart.summary}</p>

      <ul className="mt-6 flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.numberId} className="grid grid-cols-[8rem_minmax(0,1fr)_3.5rem] items-center gap-3 md:grid-cols-[11.5rem_minmax(0,1fr)_4rem]">
            <span className="text-caption text-fg">{r.n.label}</span>
            <span className="relative h-3 rounded-pill bg-raised" aria-hidden="true">
              <span className={`block h-full rounded-pill ${r.baseline ? 'bg-line-strong' : 'bg-accent'}`} style={{ width: pct(r.n.value) }} />
              {chart.threshold && <span className="absolute -inset-y-1 w-px bg-fg" style={{ left: pct(chart.threshold.value) }} />}
            </span>
            <span className="text-right font-mono text-caption text-fg">
              {r.n.value}
              <span className="sr-only"> {chart.unit}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-caption text-fg-muted">
        Unit: {chart.unit}.{chart.threshold ? ` White tick: ${chart.threshold.label}.` : ''}
      </p>

      <details className="mt-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-caption font-medium text-accent">Table View</summary>
        <table className="mt-2 w-full text-left text-caption">
          <caption className="sr-only">{chart.title}</caption>
          <thead>
            <tr className="border-b border-line text-fg-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Measure</th>
              <th scope="col" className="py-2 pr-4 font-medium">Value ({chart.unit})</th>
              <th scope="col" className="py-2 font-medium">Measured</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.numberId} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 font-normal">{r.n.label}</th>
                <td className="py-2 pr-4 font-mono">{r.n.value}</td>
                <td className="py-2 font-mono text-fg-muted">{r.n.measured}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <figcaption className="mt-4 text-caption text-fg-muted">{chart.test}</figcaption>
    </figure>
  )
}
