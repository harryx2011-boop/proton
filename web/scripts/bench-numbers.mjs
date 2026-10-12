// Turns fixtures/bench.json and (when present) fixtures/bench-llm.json into fixtures/bench-numbers.json and the
// '## Website Benchmarks' section of ../context.md. Run by the bench scripts; never edit either output by hand.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const read = (p) => (existsSync(here(p)) ? JSON.parse(readFileSync(here(p), 'utf8')) : null)

const HEADING = '## Website Benchmarks (2026-10-12)'
const num = (id, label, value, unit, measured, match) => ({ id, label, value, unit, measured, source: { file: 'context.md', match } })

export function build() {
  const out = []
  const lines = []

  const lat = read('../fixtures/bench.json')
  if (lat) {
    const tail = `${lat.calls} calls after ${lat.warmup} warm-up calls, ${lat.recordedAt}, ${lat.machine}`
    for (const t of lat.tools) {
      const [a, b, c] = [Math.round(t.p50), Math.round(t.p95), Math.round(t.p99)]
      const head = `Latency ${t.label}:`
      const l50 = `${head} p50 ${a} ms`
      const l95 = `${l50}, p95 ${b} ms`
      const l99 = `${l95}, p99 ${c} ms`
      lines.push(`- ${l99} (${tail}; scripts/bench-latency.mjs)`)
      out.push(num(`dist-${t.id}-p50`, `${t.label}, Median`, a, 'ms', lat.recordedAt, l50))
      out.push(num(`dist-${t.id}-p95`, `${t.label}, 95th Percentile`, b, 'ms', lat.recordedAt, l95))
      out.push(num(`dist-${t.id}-p99`, `${t.label}, 99th Percentile`, c, 'ms', lat.recordedAt, l99))
    }
  }

  const llm = read('../fixtures/bench-llm.json')
  if (llm) {
    const tail = `${llm.runs} runs per task after ${llm.warmup} warm-up call, ${llm.recordedAt}, Ollama ${llm.model}, ${llm.machine}`
    for (const t of llm.tasks) {
      const [p, q] = [Math.round(t.protonMs), Math.round(t.llmMs)]
      const l1 = `Time per decision, ${t.label}: Proton ${p} ms`
      const l2 = `${l1}, ${llm.model} ${q} ms`
      lines.push(`- ${l2} (${tail}; scripts/bench-llm.mjs)`)
      out.push(num(`llm-${t.id}-proton`, `${t.label}, Proton`, p, 'ms', llm.recordedAt, l1))
      out.push(num(`llm-${t.id}-model`, `${t.label}, ${llm.model}`, q, 'ms', llm.recordedAt, l2))
    }
    const g = llm.gold
    const gp = Math.round(g.protonMs)
    const gq = Math.round(g.llmMs)
    const a1 = `Routing gold set, ${g.size} tasks: Proton top-1 ${g.protonTop1}/${g.size} at median ${gp} ms per decision`
    const a2 = `${a1}; ${llm.model} top-1 ${g.llmTop1}/${g.size} at median ${gq} ms per decision`
    lines.push(`- ${a2} (${g.size} tasks from fixtures/routing-gold.json, the model chose among ${g.candidates} skills, ${llm.recordedAt}, ${llm.machine}; scripts/bench-llm.mjs)`)
    out.push(num('gold-proton-top1', 'Proton, Right Skill First', g.protonTop1, `of ${g.size}`, llm.recordedAt, `Proton top-1 ${g.protonTop1}/${g.size}`))
    out.push(num('gold-model-top1', `${llm.model}, Right Skill First`, g.llmTop1, `of ${g.size}`, llm.recordedAt, `${llm.model} top-1 ${g.llmTop1}/${g.size}`))
    out.push(num('gold-proton-ms', 'Proton, Time per Decision', gp, 'ms', llm.recordedAt, a1))
    out.push(num('gold-model-ms', `${llm.model}, Time per Decision`, gq, 'ms', llm.recordedAt, a2))
    if (llm.memory) {
      const gb = Number((llm.memory.loadedBytes / 1e9).toFixed(1))
      const vr = Number((llm.memory.vramBytes / 1e9).toFixed(1))
      const l = `Local model memory: ${llm.model} loaded in Ollama takes ${gb} GB, of which ${vr} GB on the graphics card`
      lines.push(`- ${l} (/api/ps during the run, ${llm.recordedAt}; the Ollama processes held ${(llm.memory.processPrivateBytes / 1e9).toFixed(2)} GB private system memory; scripts/bench-llm.mjs)`)
      out.push(num('llm-memory', `${llm.model}, Loaded`, gb, 'GB', llm.recordedAt, `${llm.model} loaded in Ollama takes ${gb} GB`))
    }
  }
  return { numbers: out, lines }
}

export function writeAll() {
  const { numbers, lines } = build()
  writeFileSync(here('../fixtures/bench-numbers.json'), JSON.stringify(numbers, null, 2) + '\n')

  const ctx = here('../../context.md')
  const text = readFileSync(ctx, 'utf8')
  const nl = text.includes('\r\n') ? '\r\n' : '\n'
  const body = [HEADING, '', 'Measured for the website by `web/scripts/bench-latency.mjs` and `web/scripts/bench-llm.mjs`; `web/scripts/bench-numbers.mjs` rewrites this section from `web/fixtures/bench*.json`. Do not edit by hand.', '', ...lines, '', ''].join(nl)
  const start = text.indexOf(HEADING)
  let next
  if (start >= 0) {
    const rest = text.indexOf(`${nl}## `, start + HEADING.length)
    next = text.slice(0, start) + body + (rest >= 0 ? text.slice(rest + nl.length) : '')
  } else {
    const hist = text.indexOf(`${nl}## History`)
    next = hist >= 0 ? text.slice(0, hist + nl.length) + body + nl + text.slice(hist + nl.length) : text.trimEnd() + nl + nl + body
  }
  writeFileSync(ctx, next)
  console.log(`bench-numbers: ${numbers.length} numbers, ${lines.length} lines in context.md`)
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) writeAll()
