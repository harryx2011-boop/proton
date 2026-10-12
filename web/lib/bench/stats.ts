export const median = (xs: number[]): number => percentile(xs, 0.5)

// Nearest-rank percentile: the smallest sample with at least q of the samples at or below it.
export function percentile(xs: number[], q: number): number {
  if (!xs.length) throw new Error('percentile of an empty list')
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]
}
