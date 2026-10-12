import { numbers as allNumbers, type Measured } from '@/lib/numbers'
import type { BrandSlug } from '@/lib/brands'
import { charts, chartIds, isAvailable, type Chart } from './charts'

// Turns a registry entry plus the measured numbers into rows a chart can draw. Every drawn value is looked up by id,
// so nothing on a chart can be a number that is not in lib/numbers.ts.

export interface Table {
  head: string[]
  rows: string[][]
}

export interface BarRow {
  key: string
  label: string
  brand?: BrandSlug
  text: string
  frac: number
  baseline: boolean
}

export interface Common {
  table: Table
  speech: string
  dates: string[]
}

export type View = Common &
  (
    | { kind: 'bars'; rows: BarRow[]; threshold?: { frac: number; label: string } }
    | { kind: 'range'; rows: { label: string; p50: string; p95: string; p99: string; f50: number; f95: number; f99: number }[]; ticks: { frac: number; text: string }[] }
    | { kind: 'pairs'; before: { label: string; brand?: BrandSlug }; after: { label: string }; rows: { label: string; before: BarRow; after: BarRow }[] }
    | {
        kind: 'scatter'
        points: { key: string; label: string; brand?: BrandSlug; baseline: boolean; x: number; y: number; text: string }[]
        xTicks: { frac: number; text: string }[]
        yTicks: { frac: number; text: string }[]
        xLabel: string
        yLabel: string
      }
  )

const unitText = (n: Measured, dense = false): string => {
  if (n.unit.startsWith('of ')) return dense ? `${n.value}/${n.unit.slice(3)}` : `${n.value} ${n.unit}`
  if (n.unit === 'score') return String(n.value)
  return `${n.value} ${n.unit}`
}

const byIdIn = (list: Measured[]) => {
  const map = new Map(list.map((n) => [n.id, n]))
  return (id: string): Measured => {
    const n = map.get(id)
    if (!n) throw new Error(`unknown number: ${id}`)
    return n
  }
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const MIN_BAR = 0.015

const dateList = (ns: Measured[]): string[] => [...new Set(ns.map((n) => n.measured))].sort()

function logDomain(values: number[]) {
  const lo = 10 ** Math.floor(Math.log10(Math.min(...values)))
  const hi = 10 ** Math.ceil(Math.log10(Math.max(...values)))
  const span = Math.log10(hi) - Math.log10(lo)
  const at = (v: number) => clamp((Math.log10(v) - Math.log10(lo)) / span)
  const ticks: { frac: number; text: string }[] = []
  for (let p = Math.log10(lo); p <= Math.log10(hi); p++) ticks.push({ frac: at(10 ** p), text: String(10 ** p) })
  return { at, ticks }
}

export function resolveChart(chart: Chart, list: Measured[] = allNumbers): View | null {
  const known = new Set(list.map((n) => n.id))
  if (!isAvailable(chart, known)) return null
  const get = byIdIn(list)
  const used = chartIds(chart).filter((x) => known.has(x.id)).map((x) => get(x.id))
  const dates = dateList(used)

  switch (chart.kind) {
    case 'bars': {
      const rows: BarRow[] = chart.series
        .filter((s) => known.has(s.numberId))
        .map((s) => {
          const n = get(s.numberId)
          return { key: s.numberId, label: s.label ?? n.label, brand: s.brand, text: unitText(n, true), frac: Math.max(MIN_BAR, clamp(n.value / chart.max)), baseline: !!s.baseline }
        })
      const nums = chart.series.filter((s) => known.has(s.numberId)).map((s) => ({ ...get(s.numberId), label: s.label ?? get(s.numberId).label }))
      return {
        kind: 'bars',
        rows,
        threshold: chart.threshold ? { frac: clamp(chart.threshold.value / chart.max), label: chart.threshold.label } : undefined,
        table: { head: ['Measure', `Value (${chart.unit})`, 'Measured'], rows: nums.map((n) => [n.label, String(n.value), n.measured]) },
        speech: `${chart.title}. ${nums.map((n) => `${n.label}: ${unitText(n)}`).join('; ')}.${chart.threshold ? ` ${chart.threshold.label}.` : ''}`,
        dates,
      }
    }
    case 'range': {
      const triples = chart.rows.map((r) => ({ label: r.label, a: get(r.p50), b: get(r.p95), c: get(r.p99) }))
      const { at, ticks } = logDomain(triples.flatMap((t) => [t.a.value, t.c.value]))
      return {
        kind: 'range',
        rows: triples.map((t) => ({ label: t.label, p50: unitText(t.a), p95: unitText(t.b), p99: unitText(t.c), f50: at(t.a.value), f95: at(t.b.value), f99: at(t.c.value) })),
        ticks,
        table: { head: ['Tool', 'Median (ms)', '95th Percentile (ms)', '99th Percentile (ms)'], rows: triples.map((t) => [t.label, String(t.a.value), String(t.b.value), String(t.c.value)]) },
        speech: `${chart.title}, milliseconds, median then 95th then 99th percentile. ${triples.map((t) => `${t.label}: ${t.a.value}, ${t.b.value}, ${t.c.value}`).join('; ')}.`,
        dates,
      }
    }
    case 'before-after': {
      const max = Math.max(...used.map((n) => n.value))
      const bar = (id: string, baseline: boolean): BarRow => {
        const n = get(id)
        return { key: id, label: n.label, text: unitText(n, true), frac: Math.max(MIN_BAR, clamp(n.value / max)), baseline }
      }
      const pairs = chart.pairs.map((p) => ({ p, b: get(p.beforeId), a: get(p.afterId) }))
      return {
        kind: 'pairs',
        before: { label: chart.beforeLabel, brand: chart.beforeBrand },
        after: { label: chart.afterLabel },
        rows: pairs.map(({ p }) => ({ label: p.label, before: bar(p.beforeId, true), after: bar(p.afterId, false) })),
        table: { head: ['Task', `${chart.beforeLabel} (${chart.unit})`, `${chart.afterLabel} (${chart.unit})`, 'Measured'], rows: pairs.map(({ p, b, a }) => [p.label, String(b.value), String(a.value), dateList([b, a]).join(' and ')]) },
        speech: `${chart.title}, ${chart.unit}. ${pairs.map(({ p, b, a }) => `${p.label}: ${chart.beforeLabel} ${b.value}, ${chart.afterLabel} ${a.value}`).join('; ')}.`,
        dates,
      }
    }
    case 'scatter': {
      const pts = chart.points.map((p) => ({ p, x: get(p.xId), y: get(p.yId) }))
      const { at, ticks } = logDomain(pts.map(({ x }) => x.value))
      const yTicks = [0, 0.5, 1].map((f) => ({ frac: f, text: String(Math.round(f * chart.yMax)) }))
      return {
        kind: 'scatter',
        points: pts.map(({ p, x, y }) => ({ key: p.label, label: p.label, brand: p.brand, baseline: !!p.baseline, x: at(x.value), y: clamp(y.value / chart.yMax), text: `${y.value}/${chart.yMax} in ${x.value} ms` })),
        xTicks: ticks,
        yTicks,
        xLabel: chart.xLabel,
        yLabel: chart.yLabel,
        table: { head: ['System', 'Time per Decision (ms)', `Right Skill First (of ${chart.yMax})`, 'Measured'], rows: pts.map(({ p, x, y }) => [p.label, String(x.value), String(y.value), dateList([x, y]).join(' and ')]) },
        speech: `${chart.title}. ${pts.map(({ p, x, y }) => `${p.label}: ${y.value} of ${chart.yMax} right, median ${x.value} milliseconds`).join('; ')}.`,
        dates,
      }
    }
  }
}

export const availableCharts = (list: Measured[] = allNumbers): Chart[] => {
  const known = new Set(list.map((n) => n.id))
  return charts.filter((c) => isAvailable(c, known))
}

export const missingCharts = (list: Measured[] = allNumbers): Chart[] => {
  const known = new Set(list.map((n) => n.id))
  return charts.filter((c) => !isAvailable(c, known))
}
