// Measures the live Proton server (http://127.0.0.1:9400/mcp): 200 sequential calls per tool after 10 warm-up calls.
// Writes fixtures/bench.json. Never edit that file by hand. Calls run one at a time to keep the PC responsive.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { examples } from '../lib/demo/examples.ts'
import { percentile } from '../lib/bench/stats.ts'
import { Proton } from '../../clients/ts/proton.ts'
import { writeAll } from './bench-numbers.mjs'

const CALLS = 200
const WARMUP = 10
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const ex = (id) => examples.find((e) => e.id === id)

const injection = ex('injection')
const tools = [
  { id: 'decide', label: 'Decide', tool: 'decide', args: injection.args },
  { id: 'locate', label: 'Locate Skill', tool: 'locate_skill', args: ex('routing').args },
  {
    id: 'rank',
    label: 'Rank',
    tool: 'rank',
    args: { texts: ['The cat sat.', 'Invoice 4411 is overdue, pay today.', 'Lunch at noon.'], criterion: 'urgent request about money' },
  },
  { id: 'triage', label: 'Triage', tool: 'triage', args: ex('triage').args },
  { id: 'risk', label: 'Risk', tool: 'risk', args: ex('risk').args },
  {
    id: 'batch',
    label: 'Decide Batch',
    tool: 'decide_batch',
    args: { texts: [injection.prompt, 'Install the package with npm and run the build.'], heads: injection.args.heads },
  },
]

const p = await Proton.connect()
const out = []
for (const t of tools) {
  for (let i = 0; i < WARMUP; i++) await p.call(t.tool, t.args)
  const times = []
  for (let i = 0; i < CALLS; i++) {
    const t0 = performance.now()
    await p.call(t.tool, t.args)
    times.push(performance.now() - t0)
  }
  const row = { id: t.id, label: t.label, tool: t.tool, p50: percentile(times, 0.5), p95: percentile(times, 0.95), p99: percentile(times, 0.99), max: Math.max(...times) }
  out.push(row)
  console.log(t.id.padEnd(8), `p50 ${row.p50.toFixed(1)}  p95 ${row.p95.toFixed(1)}  p99 ${row.p99.toFixed(1)}  max ${row.max.toFixed(1)} ms`)
}

mkdirSync(here('../fixtures'), { recursive: true })
writeFileSync(
  here('../fixtures/bench.json'),
  JSON.stringify(
    {
      recordedAt: new Date().toISOString().slice(0, 10),
      machine: 'busy desktop PC, other sessions running',
      server: 'http://127.0.0.1:9400/mcp',
      calls: CALLS,
      warmup: WARMUP,
      tools: out,
    },
    null,
    2,
  ) + '\n',
)
writeAll()
