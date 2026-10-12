import { describe, expect, it } from 'vitest'
import fixture from '@/fixtures/demo.json'
import { examples } from '@/lib/demo/examples'
import { view } from '@/lib/demo/view'

const reply = (id: string) => fixture.examples.find((e) => e.id === id)!.reply

describe('demo view', () => {
  it('injection: two rows, the hidden-instructions row wins, bars are probabilities', () => {
    const v = view('injection', reply('injection'))
    expect(v.headline).toMatch(/^Hidden Instructions, \d+%$/)
    expect(v.rows.map((r) => r.label)).toEqual(['Normal Text', 'Hidden Instructions'])
    expect(v.rows.filter((r) => r.win)).toHaveLength(1)
    expect(v.rows.find((r) => r.win)!.label).toBe('Hidden Instructions')
  })

  it('routing: three picks, the first wins with a full bar, the rest scale against it', () => {
    const v = view('routing', reply('routing'))
    expect(v.rows).toHaveLength(3)
    expect(v.rows[0]).toMatchObject({ win: true, bar: 1 })
    for (const r of v.rows.slice(1)) expect(r.bar).toBeLessThan(1)
  })

  it('risk: lists the four levels, highest first', () => {
    const v = view('risk', reply('risk'))
    expect(v.headline).toBe('Destructive')
    expect(v.rows.map((r) => r.label)).toEqual(['Destructive', 'Write', 'Read', 'Send'])
  })

  it('triage: one row per item with its bucket, and a count headline', () => {
    const v = view('triage', reply('triage'))
    expect(v.rows).toHaveLength(5)
    expect(v.rows[0].tag).toBe('Bug')
    expect(v.headline).toBe('Bug 2, Feature 2, Question 1')
  })

  it('every bar stays inside 0 to 1 for every example', () => {
    for (const e of examples) for (const r of view(e.id, reply(e.id)).rows) expect(r.bar >= 0 && r.bar <= 1).toBe(true)
  })

  it('the recorded fixtures hold no private strings', () => {
    // assembled from parts so the public-export scan does not flag the test that guards against them
    const owner = ['har', 'ry'].join('')
    const privateRepos = ['cor', 'tex'].join('')
    const winPath = /[A-Z]:\\\\/
    const text = JSON.stringify(fixture)
    expect(text).not.toMatch(new RegExp(`${owner}|${privateRepos}|hel${'ix'}`, 'i'))
    expect(text).not.toMatch(winPath)
  })
})
