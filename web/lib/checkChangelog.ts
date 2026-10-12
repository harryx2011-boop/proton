import type { ChangelogEntry } from './changelog'

export interface FoundVersion {
  version: string
  source: string
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const SEMVER = /^\d+\.\d+\.\d+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function checkChangelog(entries: ChangelogEntry[], found: FoundVersion[]): string[] {
  const errors: string[] = []
  const have = new Set(entries.map((e) => e.version))

  for (const f of found) {
    if (!have.has(f.version)) errors.push(`missing: ${f.version} (found in ${f.source}) has no changelog entry`)
  }

  entries.forEach((e, i) => {
    const at = `entry ${e.version || `#${i}`}`
    if (!SEMVER.test(e.version)) errors.push(`${at}: version is not MAJOR.MINOR.PATCH`)
    if (!ISO_DATE.test(e.date) || Number.isNaN(Date.parse(e.date))) errors.push(`${at}: date "${e.date}" is not a real YYYY-MM-DD date`)
    if (!e.title.trim()) errors.push(`${at}: empty title`)
    if (!e.summary.trim()) errors.push(`${at}: empty summary`)
    if (e.notes.length === 0) errors.push(`${at}: no notes (write "No notes were kept for this version." if nothing is known)`)
    for (const n of e.notes) if (!n.lead.trim() || !n.text.trim()) errors.push(`${at}: a note has an empty lead or text`)
    if (e.sources.length === 0) errors.push(`${at}: no sources`)
    if (i > 0) {
      const prev = entries[i - 1]
      if (e.version === prev.version) errors.push(`${at}: listed twice`)
      else if (SEMVER.test(e.version) && SEMVER.test(prev.version) && compareSemver(prev.version, e.version) < 0) {
        errors.push(`order: ${prev.version} comes before ${e.version}, but the list must run newest first`)
      }
      if (ISO_DATE.test(e.date) && ISO_DATE.test(prev.date) && e.date > prev.date) {
        errors.push(`order: ${e.version} is dated ${e.date}, after ${prev.version} dated ${prev.date}`)
      }
    }
  })

  return errors
}
