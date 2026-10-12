import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ask, buildPrompt, isHit, modelInstalled, parseVerdicts } from '@/lib/bench/llm'
import { median, percentile } from '@/lib/bench/stats'
import { charts } from '@/lib/bench/charts'
import { availableCharts, missingCharts, resolveChart } from '@/lib/bench/resolve'
import { numbers, type Measured } from '@/lib/numbers'
import gold from '@/fixtures/routing-gold.json'

describe('stats', () => {
  it('takes nearest-rank percentiles', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(xs, 0.5)).toBe(50)
    expect(percentile(xs, 0.95)).toBe(95)
    expect(percentile(xs, 0.99)).toBe(99)
    expect(median([3, 1, 2])).toBe(2)
  })
})

describe('local model prompts', () => {
  const labels = ['bug', 'feature', 'question']

  it('lists every label and asks for JSON', () => {
    const p = buildPrompt({ id: 't', instruction: 'Label it.', input: 'it crashes', labels })
    for (const l of labels) expect(p).toContain(`- ${l}`)
    expect(p).toContain('it crashes')
    expect(p).toContain('JSON only')
  })

  it('accepts a valid label, also inside a code fence, and clamps the confidence', () => {
    expect(parseVerdicts('{"label":"Bug","confidence":0.9}', labels)).toEqual([{ label: 'bug', confidence: 0.9 }])
    expect(parseVerdicts('```json\n{"label":"feature","confidence":3}\n```', labels)).toEqual([{ label: 'feature', confidence: 1 }])
  })

  it('rejects an unknown label, a missing confidence and bad JSON', () => {
    expect(parseVerdicts('{"label":"other","confidence":0.5}', labels)).toBeNull()
    expect(parseVerdicts('{"label":"bug"}', labels)).toBeNull()
    expect(parseVerdicts('not json', labels)).toBeNull()
  })

  it('needs exactly one verdict per input for a batch', () => {
    const two = '{"items":[{"label":"bug","confidence":0.9},{"label":"question","confidence":0.4}]}'
    expect(parseVerdicts(two, labels, 2)).toHaveLength(2)
    expect(parseVerdicts(two, labels, 3)).toBeNull()
  })
})

describe('local model client against a fake Ollama', () => {
  let server: Server
  let url = ''
  const seen: Record<string, unknown>[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json')
        if (req.url === '/api/tags') return void res.end(JSON.stringify({ models: [{ name: 'fake:1b' }] }))
        if (req.url === '/api/chat') {
          seen.push(JSON.parse(body))
          return void res.end(JSON.stringify({ message: { content: '{"label":"bug","confidence":0.8}' } }))
        }
        res.statusCode = 404
        res.end('{}')
      })
    })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((ok) => server.close(() => ok())))

  it('finds an installed model and not a missing one', async () => {
    expect(await modelInstalled(url, 'fake:1b')).toBe(true)
    expect(await modelInstalled(url, 'other:1b')).toBe(false)
  })

  it('reports a server that is not running as not installed', async () => {
    expect(await modelInstalled('http://127.0.0.1:1', 'fake:1b')).toBe(false)
  })

  it('sends a greedy, no-thinking JSON request and returns the timed reply', async () => {
    const r = await ask(url, 'fake:1b', 'hello', { keepAlive: 0 })
    expect(parseVerdicts(r.text, ['bug', 'feature'])).toEqual([{ label: 'bug', confidence: 0.8 }])
    expect(r.ms).toBeGreaterThanOrEqual(0)
    const sent = seen.at(-1) as { think: boolean; format: string; keep_alive: number; options: { temperature: number } }
    expect(sent.think).toBe(false)
    expect(sent.format).toBe('json')
    expect(sent.keep_alive).toBe(0)
    expect(sent.options.temperature).toBe(0)
  })
})

describe('routing gold set', () => {
  it('has the 28 ported tasks, each with accepted names', () => {
    expect(gold.tasks).toHaveLength(28)
    for (const g of gold.tasks) {
      expect(g.query).toBeTruthy()
      expect(g.accept.length).toBeGreaterThan(0)
    }
  })

  it('scores a hit only when the first choice is accepted', () => {
    const g = { query: 'commit these changes and push', accept: ['commit', 'caveman-commit'] }
    expect(isHit('commit', g)).toBe(true)
    expect(isHit('video', g)).toBe(false)
    expect(isHit(undefined, g)).toBe(false)
  })
})

describe('chart resolver', () => {
  const without = (prefixes: string[]): Measured[] => numbers.filter((n) => !prefixes.some((p) => n.id.startsWith(p)))

  it('draws nothing for a chart whose local-model numbers are absent, and lists it as missing', () => {
    const noLlm = without(['llm-', 'gold-'])
    expect(resolveChart(charts.find((c) => c.id === 'llm-time')!, noLlm)).toBeNull()
    expect(resolveChart(charts.find((c) => c.id === 'llm-accuracy')!, noLlm)).toBeNull()
    expect(availableCharts(noLlm).map((c) => c.id)).not.toContain('llm-time')
    expect(missingCharts(noLlm).map((c) => c.id)).toEqual(['llm-time', 'llm-accuracy'])
  })

  it('leaves the local model out of the memory chart when it was not measured', () => {
    const view = resolveChart(charts.find((c) => c.id === 'memory')!, without(['llm-', 'gold-']))
    expect(view?.kind === 'bars' && view.rows.map((r) => r.key)).toEqual(['memory-extension', 'memory-python', 'memory-earlier'])
  })

  it('gives every drawn chart a table, a spoken summary and dates', () => {
    for (const c of availableCharts()) {
      const view = resolveChart(c)!
      expect(view.table.rows.length, c.id).toBeGreaterThan(0)
      expect(view.speech, c.id).toContain(c.title)
      expect(view.dates.length, c.id).toBeGreaterThan(0)
    }
  })

  it('keeps every bar length between 0 and 1 and the range ordered', () => {
    for (const c of availableCharts()) {
      const view = resolveChart(c)!
      if (view.kind === 'bars') for (const r of view.rows) expect(r.frac).toBeGreaterThan(0), expect(r.frac).toBeLessThanOrEqual(1)
      if (view.kind === 'range') for (const r of view.rows) expect(r.f50 <= r.f95 && r.f95 <= r.f99, r.label).toBe(true)
    }
  })
})
