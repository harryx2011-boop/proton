import { describe, expect, it } from 'vitest'
import { changelog, formatDate } from '@/lib/changelog'
import { checkChangelog, compareSemver } from '@/lib/checkChangelog'
import { isTitleCase } from '@/lib/titleCase'
import { site } from '@/site.config'

const prose = changelog.flatMap((e) => [e.summary, ...e.notes.map((n) => n.text)]).join(' ')

describe('changelog data', () => {
  it('has no check errors against its own versions', () => {
    expect(checkChangelog(changelog, changelog.map((e) => ({ version: e.version, source: 'self' })))).toEqual([])
  })

  it('runs newest first by version and by date', () => {
    for (let i = 1; i < changelog.length; i++) {
      expect(compareSemver(changelog[i - 1].version, changelog[i].version), changelog[i].version).toBeGreaterThan(0)
      expect(changelog[i - 1].date >= changelog[i].date, changelog[i].version).toBe(true)
    }
  })

  it('has the site version as its newest entry', () => {
    expect(changelog[0].version).toBe(site.version)
  })

  it('titles are Title Case and every entry has a source', () => {
    for (const e of changelog) {
      expect(isTitleCase(e.title), e.title).toBe(true)
      expect(e.sources.length, e.version).toBeGreaterThan(0)
    }
  })
})

describe('changelog voice', () => {
  it('uses no exclamation marks, emoji or hype words', () => {
    expect(prose).not.toMatch(/!/)
    expect(prose).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(prose).not.toMatch(/revolutionary|game-changing|seamless|unlock|supercharge|empower|cutting-edge|magical|excited|thrilled|journey|blazing/i)
  })

  it('keeps jargon out of the reader text', () => {
    expect(prose).not.toMatch(/quantiz|quantis|\bONNX\b|tokenizer|SHA-256|\bint8\b|embedding/i)
  })

  it('uses em dashes without spaces and at most 3 per 1,000 words', () => {
    expect(prose).not.toMatch(/ — | – /)
    const words = prose.split(/\s+/).length
    const dashes = (prose.match(/—/g) ?? []).length
    expect(dashes / (words / 1000)).toBeLessThanOrEqual(3)
  })

  it('stays near 18 words per sentence at the median', () => {
    const lengths = prose
      .split(/(?<=[.?])\s+/)
      .map((s) => s.split(/\s+/).length)
      .sort((a, b) => a - b)
    const median = lengths[Math.floor(lengths.length / 2)]
    expect(median).toBeGreaterThanOrEqual(10)
    expect(median).toBeLessThanOrEqual(24)
  })
})

describe('checkChangelog', () => {
  const entry = changelog[0]

  it('reports a version that has no entry', () => {
    const errors = checkChangelog(changelog, [{ version: '9.9.9', source: 'git tag v9.9.9' }])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('9.9.9')
  })

  it('reports an entry that is out of order', () => {
    const errors = checkChangelog([changelog[1], changelog[0]], [])
    expect(errors.some((e) => e.startsWith('order:'))).toBe(true)
  })

  it('reports a duplicate version, a bad date and empty notes', () => {
    const bad = [entry, { ...entry, date: '2026-13-40', notes: [] }]
    const errors = checkChangelog(bad, [])
    expect(errors.some((e) => e.includes('listed twice'))).toBe(true)
    expect(errors.some((e) => e.includes('not a real'))).toBe(true)
    expect(errors.some((e) => e.includes('no notes'))).toBe(true)
  })
})

describe('formatDate', () => {
  it('writes the month in full without an ordinal', () => {
    expect(formatDate('2026-10-02')).toBe('October 2, 2026')
  })
})
