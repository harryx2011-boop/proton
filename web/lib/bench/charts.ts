import type { BrandSlug } from '@/lib/brands'

// One entry per chart. Adding a chart is one entry here; lib/bench/resolve.ts turns it into drawable rows and RetroChart draws it.
// A chart whose measured numbers are not all present is not drawn (see isAvailable), so a missing fixture never shows a gap.

interface Base {
  id: string
  file: string
  title: string
  summary: string
  unit: string
  test: string
  machine: string
  source: string
  // What a missing measurement needs before this chart can be drawn.
  needs?: string
}

export interface BarSeries {
  numberId: string
  baseline?: boolean
  brand?: BrandSlug
  // Replaces the number's own label on this chart.
  label?: string
  // Left out quietly when the number does not exist yet (for example a model that has not been measured).
  optional?: boolean
}

export interface BarsChart extends Base {
  kind: 'bars'
  max: number
  series: BarSeries[]
  threshold?: { value: number; label: string }
}

export interface RangeChart extends Base {
  kind: 'range'
  rows: { label: string; p50: string; p95: string; p99: string }[]
}

export interface ScatterPoint {
  label: string
  xId: string
  yId: string
  baseline?: boolean
  brand?: BrandSlug
}

export interface ScatterChart extends Base {
  kind: 'scatter'
  points: ScatterPoint[]
  xLabel: string
  yLabel: string
  yMax: number
}

export interface BeforeAfterChart extends Base {
  kind: 'before-after'
  beforeLabel: string
  afterLabel: string
  beforeBrand?: BrandSlug
  pairs: { label: string; beforeId: string; afterId: string }[]
}

export type Chart = BarsChart | RangeChart | ScatterChart | BeforeAfterChart

const cur = (ids: string[]): BarSeries[] => ids.map((numberId) => ({ numberId }))
const base = (ids: string[]): BarSeries[] => ids.map((numberId) => ({ numberId, baseline: true }))

const PC = 'Busy desktop PC, other sessions running'
const DEV = 'Development desktop PC'
const CONTEXT = 'Gate runs recorded in context.md'

const tools = [
  ['Decide', 'decide'],
  ['Locate Skill', 'locate'],
  ['Rank', 'rank'],
  ['Triage', 'triage'],
  ['Risk', 'risk'],
] as const

export const charts: Chart[] = [
  {
    id: 'speed',
    kind: 'bars',
    file: 'Speed.chart',
    title: 'Speed per Tool',
    summary: 'Median time for one call over local HTTP. Lower is better.',
    unit: 'ms',
    max: 100,
    series: cur(['latency-decide', 'latency-locate', 'latency-rank', 'latency-triage', 'latency-risk']),
    test: 'Median of repeated calls to the running server.',
    machine: DEV,
    source: CONTEXT,
  },
  {
    id: 'latency',
    kind: 'range',
    file: 'Latency.chart',
    title: 'Latency Distribution',
    summary: 'Most calls are quick; a few are slow when the PC is busy. Lower is better.',
    unit: 'ms',
    rows: [
      ...tools.map(([label, id]) => ({ label, p50: `dist-${id}-p50`, p95: `dist-${id}-p95`, p99: `dist-${id}-p99` })),
      { label: 'Decide Batch', p50: 'dist-batch-p50', p95: 'dist-batch-p95', p99: 'dist-batch-p99' },
    ],
    test: '200 calls per tool, one after another, after 10 warm-up calls, while the PC was in normal use.',
    machine: PC,
    source: 'fixtures/bench.json, written by scripts/bench-latency.mjs',
  },
  {
    id: 'before-after',
    kind: 'before-after',
    file: 'Before-After.chart',
    title: 'Before and After',
    summary: 'Median time per call: the earlier build on the graphics card, and this release on the processor. Lower is better.',
    unit: 'ms',
    beforeLabel: 'Earlier Build',
    afterLabel: 'This Release',
    pairs: tools.map(([label, id]) => ({ label, beforeId: `gpu-${id}`, afterId: `latency-${id}` })),
    test: 'The same benchmark script on both builds, over local HTTP. The earlier build was timed on 2026-10-05 with a free graphics card; this release on 2026-10-07.',
    machine: DEV,
    source: CONTEXT,
  },
  {
    id: 'memory',
    kind: 'bars',
    file: 'Memory.chart',
    title: 'Memory Use',
    summary: 'Memory held by the running program. Lower is better.',
    unit: 'GB',
    max: 12,
    series: [...cur(['memory-extension']), ...base(['memory-python', 'memory-earlier']), { numberId: 'llm-memory', baseline: true, brand: 'qwen', label: 'Qwen3.5 2B, Loaded', optional: true }],
    test: 'Private memory of the running server. The earlier build grew over time, so its figure is the highest seen. The local model sits on the graphics card, so its bar is video memory.',
    machine: `${DEV}; the local model was measured on the ${PC.toLowerCase()}`,
    source: `${CONTEXT}; the local model from fixtures/bench-llm.json`,
  },
  {
    id: 'routing',
    kind: 'bars',
    file: 'Routing.chart',
    title: 'Skill Routing Accuracy',
    summary: 'Tasks out of 28 where the right skill came first or in the top three. Higher is better.',
    unit: 'of 28',
    max: 28,
    series: [...cur(['routing-top1', 'routing-top3']), ...base(['routing-old-top1', 'routing-old-top3'])],
    test: 'A hand-written set of 28 tasks, each with the skills that count as correct. Compared with the earlier model.',
    machine: DEV,
    source: CONTEXT,
  },
  {
    id: 'injection',
    kind: 'bars',
    file: 'Injection.chart',
    title: 'Hidden Instruction Scores',
    summary: 'Scores from 0 to 1. A score above 0.8 counts as hidden instructions.',
    unit: 'score',
    max: 1,
    series: [...cur(['injection-high', 'injection-second']), ...base(['injection-docs'])],
    threshold: { value: 0.8, label: 'Threshold 0.8' },
    test: 'A small sample: two attempts to hide orders in text, and the highest score among normal documents.',
    machine: DEV,
    source: CONTEXT,
  },
  {
    id: 'llm-time',
    kind: 'before-after',
    file: 'Local-Model.chart',
    title: 'Time per Decision',
    summary: 'Proton against a small local language model on the same four tasks. Lower is better.',
    unit: 'ms',
    beforeLabel: 'Qwen3.5 2B',
    afterLabel: 'Proton',
    beforeBrand: 'qwen',
    pairs: [
      { label: 'Hidden Instructions', beforeId: 'llm-injection-model', afterId: 'llm-injection-proton' },
      { label: 'Pick a Skill', beforeId: 'llm-routing-model', afterId: 'llm-routing-proton' },
      { label: 'Rate an Action', beforeId: 'llm-risk-model', afterId: 'llm-risk-proton' },
      { label: 'Sort 5 Issues', beforeId: 'llm-triage-model', afterId: 'llm-triage-proton' },
    ],
    test: 'Median of 10 runs per task after a warm-up call, tasks taken in turn. Both answered with a label from the same list; the model was asked for a label and a 0 to 1 confidence as JSON, at temperature 0.',
    machine: PC,
    source: 'fixtures/bench-llm.json, written by scripts/bench-llm.mjs',
    needs: 'a local model server running',
  },
  {
    id: 'llm-accuracy',
    kind: 'scatter',
    file: 'Accuracy.chart',
    title: 'Accuracy Against Time',
    summary: 'Picking the right skill on 28 tasks, against time per decision. Best is up and to the left.',
    unit: 'of 28',
    xLabel: 'Median ms per decision (log scale)',
    yLabel: 'Right skill first, of 28',
    yMax: 28,
    points: [
      { label: 'Proton', xId: 'gold-proton-ms', yId: 'gold-proton-top1' },
      { label: 'Qwen3.5 2B', xId: 'gold-model-ms', yId: 'gold-model-top1', baseline: true, brand: 'qwen' },
    ],
    test: 'The 28-task routing set. The model chose among the same list of skills Proton drew from, one call per task, and the first choice was scored.',
    machine: PC,
    source: 'fixtures/bench-llm.json and fixtures/routing-gold.json',
    needs: 'a local model server running',
  },
]

export const chartIds = (c: Chart): { id: string; optional: boolean }[] => {
  switch (c.kind) {
    case 'bars':
      return c.series.map((s) => ({ id: s.numberId, optional: !!s.optional }))
    case 'range':
      return c.rows.flatMap((r) => [r.p50, r.p95, r.p99].map((id) => ({ id, optional: false })))
    case 'scatter':
      return c.points.flatMap((p) => [p.xId, p.yId].map((id) => ({ id, optional: false })))
    case 'before-after':
      return c.pairs.flatMap((p) => [p.beforeId, p.afterId].map((id) => ({ id, optional: false })))
  }
}

export const isAvailable = (c: Chart, known: ReadonlySet<string>): boolean => chartIds(c).every((x) => x.optional || known.has(x.id))
