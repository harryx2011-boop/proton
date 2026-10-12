import { describe, expect, it } from 'vitest'
import { examples } from '@/lib/demo/examples'
import { tools } from '@/lib/docs/tools'
import { faq } from '@/lib/faq'
import { credits } from '@/lib/credits'
import { BRANDS } from '@/lib/brands'
import { charts, chartIds, isAvailable } from '@/lib/bench/charts'
import { availableCharts } from '@/lib/bench/resolve'
import { numbers } from '@/lib/numbers'
import { isTitleCase } from '@/lib/titleCase'
import fixture from '@/fixtures/demo.json'

const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('title case helper', () => {
  it('accepts Title Case and rejects sentence case', () => {
    expect(isTitleCase('Fast Local Judgment for Your AI')).toBe(true)
    expect(isTitleCase('How It Works')).toBe(true)
    expect(isTitleCase('Fast local judgment')).toBe(false)
  })
})

describe('demo examples', () => {
  it('has the four agreed examples with unique ids', () => {
    expect(examples.map((e) => e.id)).toEqual(['injection', 'routing', 'risk', 'triage'])
    expect(unique(examples.map((e) => e.id))).toBe(true)
  })

  it('has a recorded reply and a call time for each example', () => {
    for (const e of examples) {
      const rec = fixture.examples.find((x) => x.id === e.id)
      expect(rec, e.id).toBeTruthy()
      expect(rec!.ms).toBeGreaterThan(0)
      expect(rec!.reply).toBeTruthy()
    }
  })

  it('titles are Title Case', () => {
    for (const e of examples) expect(isTitleCase(e.title), e.title).toBe(true)
  })
})

describe('docs tools', () => {
  it('documents exactly the six server tools', () => {
    expect(tools.map((t) => t.name)).toEqual(['decide', 'decide_batch', 'locate_skill', 'rank', 'triage', 'risk'])
  })

  it('every tool has arguments, an example call and an example reply', () => {
    for (const t of tools) {
      expect(t.args.length, t.name).toBeGreaterThan(0)
      expect(t.exampleCall, t.name).toBeTruthy()
      expect(t.exampleReply, t.name).toBeTruthy()
    }
  })
})

describe('faq', () => {
  it('has unique ids and Title Case questions', () => {
    expect(unique(faq.map((f) => f.id))).toBe(true)
    for (const f of faq) expect(isTitleCase(f.question), f.question).toBe(true)
  })
})

describe('credits', () => {
  it('credits the three models, each linked to its page and any author mark registered', () => {
    expect(credits.map((c) => c.name)).toEqual(['SKILLRET-Edge-109M', 'e5-base-v2', 'gliclass-base-v3.0'])
    for (const c of credits) {
      expect(c.href, c.name).toMatch(/^https:\/\/huggingface\.co\//)
      if (c.byMark) expect(c.byMark in BRANDS, c.byMark).toBe(true)
    }
  })
})

describe('benchmark charts', () => {
  it('has the eight agreed charts, Title Case titles, unique ids', () => {
    expect(charts.map((c) => c.id)).toEqual(['speed', 'latency', 'before-after', 'memory', 'routing', 'injection', 'llm-time', 'llm-accuracy'])
    expect(unique(charts.map((c) => c.id))).toBe(true)
    for (const c of charts) expect(isTitleCase(c.title), c.title).toBe(true)
  })

  it('every plotted value is one of the measured numbers', () => {
    const known = new Set(numbers.map((n) => n.id))
    for (const c of charts) for (const x of chartIds(c)) if (!x.optional) expect(known.has(x.id) || !isAvailable(c, known), x.id).toBe(true)
    for (const c of availableCharts()) for (const x of chartIds(c)) if (!x.optional) expect(known.has(x.id), x.id).toBe(true)
  })

  it('every chart names its test, machine and source', () => {
    for (const c of charts) {
      expect(c.test, c.id).toBeTruthy()
      expect(c.machine, c.id).toBeTruthy()
      expect(c.source, c.id).toBeTruthy()
    }
  })
})
