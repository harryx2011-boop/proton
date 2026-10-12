import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BRANDS, brandFile, type BrandSlug } from '@/lib/brands'

const file = (slug: string) => new URL(`../public/brands/${brandFile(slug as BrandSlug)}`, import.meta.url)

describe('brand registry', () => {
  it('every brand has a bundled mark file', () => {
    for (const slug of Object.keys(BRANDS)) expect(existsSync(file(slug)), slug).toBe(true)
  })

  it('every mark is drawn with paths or shapes, never text', () => {
    for (const slug of Object.keys(BRANDS).filter((s) => brandFile(s as BrandSlug).endsWith('.svg'))) {
      const svg = readFileSync(file(slug), 'utf8')
      expect(svg, slug).toMatch(/<(path|circle|rect|polygon|g)\b/)
      expect(svg, slug).not.toMatch(/<text\b/)
    }
  })

  it('slugs are lowercase with no spaces and names are set', () => {
    for (const [slug, b] of Object.entries(BRANDS)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(b.name.length).toBeGreaterThan(1)
    }
  })
})
