export interface ChartSeries {
  numberId: string
  baseline?: boolean
}

export interface Chart {
  id: 'speed' | 'memory' | 'routing' | 'injection'
  title: string
  summary: string
  unit: string
  max: number
  series: ChartSeries[]
  threshold?: { value: number; label: string }
  test: string
}

const cur = (ids: string[]): ChartSeries[] => ids.map((numberId) => ({ numberId }))
const base = (ids: string[]): ChartSeries[] => ids.map((numberId) => ({ numberId, baseline: true }))

export const charts: Chart[] = [
  {
    id: 'speed',
    title: 'Speed per Tool',
    summary: 'Median time for one call over local HTTP. Lower is better.',
    unit: 'ms',
    max: 100,
    series: cur(['latency-decide', 'latency-locate', 'latency-rank', 'latency-triage', 'latency-risk']),
    test: 'Median of repeated calls to the running server, 2026-10-07, on the development desktop.',
  },
  {
    id: 'memory',
    title: 'Memory Use',
    summary: 'Private memory of the running server. Lower is better.',
    unit: 'GB',
    max: 12,
    series: [...cur(['memory-extension']), ...base(['memory-python', 'memory-earlier'])],
    test: 'Measured 2026-10-06 and 2026-10-07. The earlier build ran on the graphics card and grew over time; its figure is the highest we saw.',
  },
  {
    id: 'routing',
    title: 'Skill Routing Accuracy',
    summary: 'Tasks out of 28 where the right skill came first or in the top three. Higher is better.',
    unit: 'of 28',
    max: 28,
    series: [...cur(['routing-top1', 'routing-top3']), ...base(['routing-old-top1', 'routing-old-top3'])],
    test: 'A hand-written set of 28 tasks, each with the skills that count as correct. Measured 2026-10-06 against the earlier model.',
  },
  {
    id: 'injection',
    title: 'Hidden Instruction Scores',
    summary: 'Scores from 0 to 1. A score above 0.8 counts as hidden instructions.',
    unit: 'score',
    max: 1,
    series: [...cur(['injection-high', 'injection-second']), ...base(['injection-docs'])],
    threshold: { value: 0.8, label: 'Threshold 0.8' },
    test: 'A small sample: two attempts to hide orders in text, and the highest score among normal documents. Measured 2026-10-06.',
  },
]
