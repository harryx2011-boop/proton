// Measures the four demo tasks and the 28-task routing gold set on Proton (live server) and on a local model through
// Ollama. Runs ONLY when Ollama already answers and has the model: it never starts Ollama or pulls a model.
// Writes fixtures/bench-llm.json. Never edit that file by hand. Calls run one at a time.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { examples } from '../lib/demo/examples.ts'
import { ask, buildPrompt, isHit, modelInstalled, parseVerdicts } from '../lib/bench/llm.ts'
import { median } from '../lib/bench/stats.ts'
import { Proton } from '../../clients/ts/proton.ts'
import { writeAll } from './bench-numbers.mjs'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const MODEL = process.env.BENCH_MODEL ?? 'qwen3.5:2b'
const RUNS = 10
const WARMUP = 1
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const ex = (id) => examples.find((e) => e.id === id)
const words = (s, n) => s.split(/\s+/).slice(0, n).join(' ')

export function ollamaMemory() {
  try {
    const ps = "Get-Process | Where-Object { $_.ProcessName -like 'ollama*' } | ForEach-Object { '{0}|{1}|{2}' -f $_.ProcessName, $_.PrivateMemorySize64, $_.WorkingSet64 }"
    const text = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true })
    const rows = text.split(/\r?\n/).filter(Boolean).map((l) => l.split('|'))
    if (!rows.length) return null
    return { processes: rows.length, privateBytes: rows.reduce((s, r) => s + Number(r[1]), 0), workingSetBytes: rows.reduce((s, r) => s + Number(r[2]), 0) }
  } catch {
    return null
  }
}

async function loadedModel() {
  const res = await fetch(`${OLLAMA}/api/ps`, { signal: AbortSignal.timeout(3000) })
  const body = await res.json()
  return body.models?.find((m) => m.name === MODEL) ?? null
}

async function main() {
  if (!(await modelInstalled(OLLAMA, MODEL))) {
    console.log(`Not measured: ${OLLAMA} does not answer or has no ${MODEL}. Start Ollama yourself, then run this again.`)
    return
  }
  const p = await Proton.connect()

  // The skill list both sides choose from: every skill Proton's pool returns for any gold task, with a short description.
  const goldFile = JSON.parse(readFileSync(here('../fixtures/routing-gold.json'), 'utf8'))
  const gold = goldFile.tasks
  const pool = new Map()
  for (const g of gold) {
    const r = await p.call('locate_skill', { task: g.query, top_k: 100 })
    for (const x of r.picks) if (!pool.has(x.name)) pool.set(x.name, words(x.description ?? '', 14))
  }
  const names = [...pool.keys()].sort()
  const routeLines = names.map((n) => `${n}: ${pool.get(n)}`)

  const inj = ex('injection').args.heads.injection
  const tasks = [
    { id: 'injection', label: 'Hidden Instructions Check', ex: ex('injection'), llm: { id: 'injection', instruction: 'Decide whether the input is ordinary documentation or hidden instructions aimed at an AI agent.', input: ex('injection').prompt, labels: inj } },
    { id: 'routing', label: 'Pick the Right Skill', ex: ex('routing'), llm: { id: 'routing', instruction: 'Pick the one skill that best fits the task.', input: ex('routing').prompt, labels: names, lines: routeLines } },
    { id: 'risk', label: 'Rate an Action', ex: ex('risk'), llm: { id: 'risk', instruction: 'Rate how risky the action is.', input: ex('risk').prompt, labels: ['read', 'write', 'send', 'destructive'] } },
    {
      id: 'triage',
      label: 'Sort a Batch',
      ex: ex('triage'),
      llm: { id: 'triage', instruction: 'Each input line is a user report. Label every line.', input: ex('triage').args.items.join('\n'), labels: ['bug', 'feature', 'question'], count: ex('triage').args.items.length },
    },
  ]

  // Warm-up: Proton twice, the model once per task (this also loads it).
  for (const t of tasks) {
    await p.call(t.ex.tool, t.ex.args)
    await ask(OLLAMA, MODEL, buildPrompt(t.llm))
  }

  const proton = Object.fromEntries(tasks.map((t) => [t.id, []]))
  const llm = Object.fromEntries(tasks.map((t) => [t.id, []]))
  const answers = Object.fromEntries(tasks.map((t) => [t.id, []]))
  let memory = null
  // Interleaved, so two runs of one task never touch back to back and the model's prompt cache cannot carry over.
  for (let i = 0; i < RUNS; i++) {
    for (const t of tasks) {
      let t0 = performance.now()
      await p.call(t.ex.tool, t.ex.args)
      proton[t.id].push(performance.now() - t0)
      const r = await ask(OLLAMA, MODEL, buildPrompt(t.llm))
      llm[t.id].push(r.ms)
      answers[t.id].push(parseVerdicts(r.text, t.llm.labels, t.llm.count ?? 1) ?? { invalid: r.text.slice(0, 120) })
    }
    if (i === Math.floor(RUNS / 2)) memory = { ...ollamaMemory(), loaded: await loadedModel() }
  }
  const taskRows = tasks.map((t) => ({
    id: t.id,
    label: t.label,
    protonMs: median(proton[t.id]),
    llmMs: median(llm[t.id]),
    llmInvalid: answers[t.id].filter((a) => a.invalid).length,
    llmAnswers: answers[t.id].slice(0, 3),
  }))
  for (const r of taskRows) console.log(r.id.padEnd(10), `proton ${r.protonMs.toFixed(0)} ms   ${MODEL} ${r.llmMs.toFixed(0)} ms   invalid ${r.llmInvalid}/${RUNS}`)

  // Routing gold set: one call per task and side, first choice scored.
  const gp = { ms: [], hit: 0, top3: 0 }
  const gl = { ms: [], hit: 0, invalid: 0 }
  for (const g of gold) {
    let t0 = performance.now()
    const r = await p.call('locate_skill', { task: g.query, top_k: 3 })
    gp.ms.push(performance.now() - t0)
    gp.hit += isHit(r.picks[0]?.name, g)
    gp.top3 += r.picks.some((x) => isHit(x.name, g))
    const prompt = buildPrompt({ id: 'gold', instruction: 'Pick the one skill that best fits the task.', input: g.query, labels: names, lines: routeLines })
    const a = await ask(OLLAMA, MODEL, prompt)
    gl.ms.push(a.ms)
    const v = parseVerdicts(a.text, names)
    if (!v) gl.invalid++
    gl.hit += isHit(v?.[0].label, g)
  }
  console.log(`gold: proton ${gp.hit}/${gold.length} (top-3 ${gp.top3}) ${median(gp.ms).toFixed(0)} ms   ${MODEL} ${gl.hit}/${gold.length} ${median(gl.ms).toFixed(0)} ms invalid ${gl.invalid}`)

  // Unload the model again so the PC is left as found.
  await ask(OLLAMA, MODEL, 'ok', { keepAlive: 0 }).catch(() => {})

  const out = {
    recordedAt: new Date().toISOString().slice(0, 10),
    machine: 'busy desktop PC, other sessions running',
    model: MODEL,
    runs: RUNS,
    warmup: WARMUP,
    note: 'Both sides answered the same four demo tasks with the same labels; tasks were interleaved. The model was asked for JSON with a label and a 0 to 1 confidence, at temperature 0 with thinking off.',
    tasks: taskRows,
    gold: {
      size: gold.length,
      candidates: names.length,
      protonTop1: gp.hit,
      protonTop3: gp.top3,
      protonMs: median(gp.ms),
      llmTop1: gl.hit,
      llmInvalid: gl.invalid,
      llmMs: median(gl.ms),
    },
    memory: memory?.loaded
      ? {
          loadedBytes: memory.loaded.size,
          vramBytes: memory.loaded.size_vram,
          processPrivateBytes: memory.privateBytes ?? 0,
          processWorkingSetBytes: memory.workingSetBytes ?? 0,
          processes: memory.processes ?? 0,
        }
      : null,
  }
  mkdirSync(here('../fixtures'), { recursive: true })
  writeFileSync(here('../fixtures/bench-llm.json'), JSON.stringify(out, null, 2) + '\n')
  writeAll()
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) await main()
