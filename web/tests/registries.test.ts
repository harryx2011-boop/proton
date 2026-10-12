import { describe, expect, it } from 'vitest'
import { examples } from '@/lib/demo/examples'
import { tools } from '@/lib/docs/tools'
import { faq } from '@/lib/faq'
import { charts } from '@/lib/bench/charts'
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

describe('benchmark charts', () => {
  it('has the four agreed charts, Title Case titles', () => {
    expect(charts.map((c) => c.id)).toEqual(['speed', 'memory', 'routing', 'injection'])
    for (const c of charts) expect(isTitleCase(c.title), c.title).toBe(true)
  })

  it('every plotted value is one of the measured numbers', () => {
    const known = new Set(numbers.map((n) => n.id))
    for (const c of charts) for (const s of c.series) expect(known.has(s.numberId), s.numberId).toBe(true)
  })
})
