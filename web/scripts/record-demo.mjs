// Records real replies from the live Proton server into fixtures/demo.json. Never edit that file by hand.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { examples } from '../lib/demo/examples.ts'
import { docCalls } from '../lib/docs/calls.ts'
import { Proton } from '../../clients/ts/proton.ts'

const RUNS = 5
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const p = await Proton.connect()
for (const e of examples) await p.call(e.tool, e.args)

const out = []
for (const e of examples) {
  const times = []
  let reply
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now()
    reply = await p.call(e.tool, e.args)
    times.push(performance.now() - t)
  }
  if (reply.picks) reply.picks = reply.picks.map(({ description, ...rest }) => rest)
  out.push({ id: e.id, ms: Math.round(median(times)), reply })
  console.log(e.id, 'median ms', Math.round(median(times)))
}

const docs = {}
for (const [tool, args] of Object.entries(docCalls)) docs[tool] = await p.call(tool, args)

mkdirSync(here('../fixtures'), { recursive: true })
writeFileSync(
  here('../fixtures/demo.json'),
  JSON.stringify({ recordedAt: new Date().toISOString().slice(0, 10), runs: RUNS, note: 'Median time of 5 calls to the local server on a busy desktop PC. Skill descriptions are removed from the routing reply; nothing else is edited.', examples: out, docs }, null, 2) + '\n',
)
