// Ports the 28-task routing gold set from ../tests/bench_tools.py into fixtures/routing-gold.json. Never edit that file by hand.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const src = readFileSync(here('../../tests/bench_tools.py'), 'utf8')
const block = src.match(/^GOLD = \[\r?\n([\s\S]*?)^\]/m)?.[1]
if (!block) throw new Error('GOLD list not found in bench_tools.py')

const gold = [...block.matchAll(/^\s*\("([^"]+)",\s*\{([^}]*)\}\),?\s*$/gm)].map((m) => ({
  query: m[1],
  accept: [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
}))
if (gold.length !== 28) throw new Error(`expected 28 gold tasks, parsed ${gold.length}`)

mkdirSync(here('../fixtures'), { recursive: true })
writeFileSync(here('../fixtures/routing-gold.json'), JSON.stringify({ source: 'tests/bench_tools.py (GOLD)', tasks: gold }, null, 2) + '\n')
console.log(`routing-gold.json: ${gold.length} tasks`)
