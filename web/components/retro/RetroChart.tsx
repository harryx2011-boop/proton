import type { CSSProperties, ReactNode } from 'react'
import { Window } from '@/components/retro/Window'
import { ChartGrow } from '@/components/retro/ChartGrow'
import { BrandMark } from '@/components/BrandMark'
import { Cpu, Gauge, MemoryStick, Route, ShieldAlert, Timer } from '@/components/icons/generated'
import type { BrandSlug } from '@/lib/brands'
import type { Chart } from '@/lib/bench/charts'
import { resolveChart, type BarRow, type View } from '@/lib/bench/resolve'

const icons: Record<string, ReactNode> = {
  speed: <Timer />,
  latency: <Timer />,
  'before-after': <Timer />,
  memory: <MemoryStick />,
  routing: <Route />,
  injection: <ShieldAlert />,
  'llm-time': <Cpu />,
  'llm-accuracy': <Gauge />,
}

// Bars are drawn at their final width; they grow from zero through ChartGrow, one step later per row.
const GROW =
  'origin-left motion-safe:transition-transform motion-safe:duration-[var(--duration-state)] motion-safe:ease-settle motion-safe:delay-[calc(var(--stagger)*var(--i))] group-data-[g=hide]/plot:scale-x-0 group-data-[g=hide]/plot:duration-0 group-data-[g=hide]/plot:delay-0'

const step = (i: number) => ({ '--i': i }) as CSSProperties

function Name({ label, brand, className = '' }: { label: string; brand?: BrandSlug; className?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      {brand ? <BrandMark slug={brand} size={16} /> : null}
      <span className="truncate" title={label}>
        {label}
      </span>
    </span>
  )
}

function Fill({ frac, baseline, i }: { frac: number; baseline: boolean; i: number }) {
  return <span className={`block h-full ${GROW} ${baseline ? 'dotgrid' : 'bg-ink'}`} style={{ width: `${frac * 100}%`, ...step(i) }} />
}

function Track({ frac, baseline, i, children }: { frac: number; baseline: boolean; i: number; children?: ReactNode }) {
  return (
    <span aria-hidden="true" className="relative block h-4 border border-ink bg-paper">
      <Fill frac={frac} baseline={baseline} i={i} />
      {children}
    </span>
  )
}

function Bars({ rows, threshold }: { rows: BarRow[]; threshold?: { frac: number; label: string } }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-1">
          <Name label={r.label} brand={r.brand} className="text-caption" />
          <span className="font-pixel text-pixel">{r.text}</span>
          <span className="col-span-2">
            <Track frac={r.frac} baseline={r.baseline} i={i}>
              {threshold ? <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-ink" style={{ left: `${threshold.frac * 100}%` }} /> : null}
            </Track>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Swatch({ baseline }: { baseline: boolean }) {
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 border border-ink ${baseline ? 'dotgrid' : 'bg-ink'}`} />
}

function Pairs({ view }: { view: Extract<View, { kind: 'pairs' }> }) {
  const valueGrid = 'grid grid-cols-[minmax(0,1fr)_calc(var(--spacing)*20)] items-center gap-x-3'
  return (
    <div>
      <p className="m-0 mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption">
        <span className="inline-flex items-center gap-2">
          <Swatch baseline />
          {view.before.brand ? <BrandMark slug={view.before.brand} size={16} /> : null}
          {view.before.label}
        </span>
        <span className="inline-flex items-center gap-2">
          <Swatch baseline={false} />
          {view.after.label}
        </span>
      </p>
      <ul className="m-0 flex list-none flex-col gap-5 p-0">
        {view.rows.map((r, i) => (
          <li key={r.label}>
            <p className="m-0 mb-1 truncate text-caption font-medium" title={r.label}>
              {r.label}
            </p>
            {[r.before, r.after].map((b, j) => (
              <div key={b.key} className={`${valueGrid} ${j ? 'mt-1' : ''}`}>
                <Track frac={b.frac} baseline={b.baseline} i={i * 2 + j} />
                <span className="text-right font-pixel text-pixel">{b.text}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Range({ view }: { view: Extract<View, { kind: 'range' }> }) {
  return (
    <div>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {view.rows.map((r, i) => (
          <li key={r.label}>
            <div className="flex items-end justify-between gap-3">
              <span className="min-w-0 truncate text-caption" title={r.label}>
                {r.label}
              </span>
              <span className="shrink-0 font-pixel text-pixel">
                {r.p50} to {r.p99}
              </span>
            </div>
            <span aria-hidden="true" className="relative mt-1 block h-4 border border-ink bg-paper">
              <span className={`dotgrid absolute inset-y-0 ${GROW}`} style={{ left: `${r.f50 * 100}%`, width: `${Math.max(0, r.f99 - r.f50) * 100}%`, ...step(i) }} />
              <span className="absolute inset-y-0 w-2 bg-ink" style={{ left: `${r.f50 * 100}%` }} />
              <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${r.f95 * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="relative mt-2 h-6 border-t border-ink">
        {view.ticks.map((t, i) => (
          <span
            key={t.text}
            className={`absolute top-0 flex flex-col font-pixel text-pixel ${i === 0 ? 'items-start' : i === view.ticks.length - 1 ? 'items-end -translate-x-full' : 'items-center -translate-x-1/2'}`}
            style={{ left: `${t.frac * 100}%` }}
          >
            <span className="block h-1.5 w-px bg-ink" />
            {t.text}
          </span>
        ))}
      </div>
      <p className="m-0 mt-1 text-center font-pixel text-pixel">Milliseconds, log scale</p>
      <p className="m-0 mt-3 text-caption">Block: median. Tick: 95th percentile. Dotted bar: reaches the 99th percentile. Each row also lists median to 99th percentile.</p>
    </div>
  )
}

const HALO = 'fill-ink stroke-paper font-pixel text-pixel [paint-order:stroke]'
const W = 360
const H = 250
const M = { l: 40, r: 20, t: 38, b: 54 }

function Scatter({ view, speech }: { view: Extract<View, { kind: 'scatter' }>; speech: string }) {
  const pw = W - M.l - M.r
  const ph = H - M.t - M.b
  const X = (f: number) => M.l + f * pw
  const Y = (f: number) => M.t + (1 - f) * ph
  const half = 6
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={speech} className="mx-auto block h-auto w-full overflow-visible" style={{ maxWidth: W }}>
        {view.yTicks.map((t) => (
          <g key={`y${t.text}`}>
            <line x1={M.l} x2={W - M.r} y1={Y(t.frac)} y2={Y(t.frac)} className="stroke-ink" strokeWidth={1} strokeDasharray="1 4" />
            <text x={M.l - 6} y={Y(t.frac)} textAnchor="end" dominantBaseline="central" className="fill-ink font-pixel text-pixel">
              {t.text}
            </text>
          </g>
        ))}
        {view.xTicks.map((t) => (
          <g key={`x${t.text}`}>
            <line x1={X(t.frac)} x2={X(t.frac)} y1={M.t} y2={H - M.b} className="stroke-ink" strokeWidth={1} strokeDasharray="1 4" />
            <text x={X(t.frac)} y={H - M.b + 22} textAnchor="middle" className="fill-ink font-pixel text-pixel">
              {t.text}
            </text>
          </g>
        ))}
        <path d={`M${M.l} ${M.t}V${H - M.b}H${W - M.r}`} className="fill-none stroke-ink" strokeWidth={1} />
        <text x={M.l + pw / 2} y={H - 8} textAnchor="middle" className="fill-ink font-pixel text-pixel">
          {view.xLabel}
        </text>
        <text x={M.l - 30} y={M.t - 20} className="fill-ink font-pixel text-pixel">
          {view.yLabel}
        </text>
        {view.points.map((p) => {
          const left = p.x > 0.55
          const top = p.y === Math.max(...view.points.map((q) => q.y))
          const tx = top ? (left ? X(p.x) - half - 8 : X(p.x) + half + 8) : left ? X(p.x) + half : X(p.x) - half
          const mark = p.brand ? 16 : 0
          const nameY = top ? Y(p.y) - 16 : Y(p.y) + 30
          const textY = top ? Y(p.y) + 4 : Y(p.y) + 50
          return (
            <g key={p.key}>
              <rect x={X(p.x) - half} y={Y(p.y) - half} width={half * 2} height={half * 2} className={p.baseline ? 'fill-paper stroke-ink' : 'fill-ink stroke-ink'} strokeWidth={2} />
              {p.brand ? <image href={`/brands/${p.brand}.svg`} x={left ? tx - mark : tx} y={nameY - 14} width={mark} height={mark} /> : null}
              <text x={left ? tx - (mark ? mark + 4 : 0) : tx + (mark ? mark + 4 : 0)} y={nameY} textAnchor={left ? 'end' : 'start'} className={HALO} strokeWidth={4} strokeLinejoin="round">
                {p.label}
              </text>
              <text x={tx} y={textY} textAnchor={left ? 'end' : 'start'} className={HALO} strokeWidth={4} strokeLinejoin="round">
                {p.text}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="m-0 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption">
        <span className="inline-flex items-center gap-2">
          <Swatch baseline={false} />
          This release
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-3 shrink-0 border-2 border-ink bg-paper" />
          Local model
        </span>
      </p>
    </div>
  )
}

function Plot({ view, speech }: { view: View; speech: string }) {
  switch (view.kind) {
    case 'bars':
      return <Bars rows={view.rows} threshold={view.threshold} />
    case 'range':
      return <Range view={view} />
    case 'pairs':
      return <Pairs view={view} />
    case 'scatter':
      return <Scatter view={view} speech={speech} />
  }
}

export function RetroChart({ chart, as: H2 = 'h3' }: { chart: Chart; as?: 'h2' | 'h3' }) {
  const view = resolveChart(chart)
  if (!view) return null
  const headingId = `chart-${chart.id}`
  const legend =
    view.kind === 'bars' && view.rows.some((r) => r.baseline) ? (
      <p className="m-0 mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption">
        <span className="inline-flex items-center gap-2">
          <Swatch baseline={false} />
          This release
        </span>
        <span className="inline-flex items-center gap-2">
          <Swatch baseline />
          Earlier or other
        </span>
        {view.threshold ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-3 w-0.5 shrink-0 bg-ink" />
            {view.threshold.label}
          </span>
        ) : null}
      </p>
    ) : null

  return (
    <Window title={chart.file} icon={icons[chart.id]} bodyClassName="p-4 md:p-5" className="h-full">
      <figure aria-labelledby={headingId} className="m-0">
        <H2 id={headingId} className="m-0 font-pixel text-pixel-lg font-normal">
          {chart.title}
        </H2>
        <p className="m-0 mt-1 text-caption">{chart.summary}</p>
        <p className="sr-only">{view.speech}</p>

        <ChartGrow className="mt-4">
          <div aria-hidden={view.kind === 'scatter' ? undefined : 'true'}>
            <Plot view={view} speech={view.speech} />
          </div>
        </ChartGrow>
        {legend}

        <details className="mt-4 border border-ink">
          <summary className="flip flex min-h-11 cursor-pointer items-center px-3 text-caption font-medium">Table View</summary>
          <div className="overflow-x-auto border-t border-ink" tabIndex={0} role="region" aria-label={`${chart.title} as a table`}>
            <table className="w-full text-left text-caption">
              <caption className="sr-only">{chart.title}</caption>
              <thead>
                <tr>
                  {view.table.head.map((h) => (
                    <th key={h} scope="col" className="border-b border-ink px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.table.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="border-b border-ink px-3 py-2 font-normal">
                          {cell}
                        </th>
                      ) : (
                        <td key={i} className="border-b border-ink px-3 py-2 font-mono">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <figcaption className="mt-4 text-caption">
          <span className="block">{chart.test}</span>
          <span className="mt-1 block">
            Measured {new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(view.dates)}. Machine: {chart.machine}.
          </span>
          <span className="mt-1 block font-mono">Source: {chart.source}</span>
        </figcaption>
      </figure>
    </Window>
  )
}
