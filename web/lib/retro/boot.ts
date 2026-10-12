export const BOOT_MIN_MS = 250

export function bootProgress(done: number, total: number): number {
  if (total <= 0) return 100
  return Math.min(100, Math.round((done / total) * 100))
}

export function shouldShowBoot(s: { elapsedMs: number; seen: boolean; reduced: boolean; done: boolean }): boolean {
  return !s.seen && !s.reduced && !s.done && s.elapsedMs >= BOOT_MIN_MS
}
