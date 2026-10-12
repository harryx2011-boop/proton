import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { data, dot, embed, MODELS } from '../models';
import { skillCatalog, stateDir } from '../paths';
import type { Tool } from './index';

const CATALOG = skillCatalog();
const STATE = stateDir();
const CFG = data('locate.json');
const MODEL: string = CFG.model;
const FRONT = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/;
// Python's str.split() whitespace (JS \s also splits on U+FEFF and misses \x1c-\x1f, \x85)
const PY_SPACE = /[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;

type Item = Record<string, any> & { id: string; kind: string; name: string; description: string };
type Loaded = { items: Item[]; vecs: Map<string, Float32Array>; prior: Map<string, number> };
let cache: { key: string; p: Promise<Loaded> } | null = null;

const norm = (p: string) => String(p).replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const ident = (it: Item) => JSON.stringify([it.kind, it.name, it.description]);

/** Global items plus the given project's own; clones of one skill collapse to a single entry. */
export function pool(all: Item[], kinds?: string[] | null, project?: string | null): Item[] {
  const proj = project ? norm(project) : null;
  const out = new Map<string, Item>();
  for (const it of all) {
    if (kinds && kinds.length && !kinds.includes(it.kind)) continue;
    if (it.source === 'project' && !(proj && (proj === norm(it.project) || proj.startsWith(norm(it.project) + '/')))) continue;
    if (!out.has(ident(it))) out.set(ident(it), it);
  }
  return [...out.values()];
}

/** What the bi-encoder sees for an item: name, description, then the body; the tokenizer cuts it at 256 tokens. */
export function docFor(it: Item): string {
  const name = String(it.invocation).replace(/^\/+/, '') + (it.kind === 'agent' ? ' agent' : '');
  let body = '';
  try {
    if (typeof it.path === 'string') body = readFileSync(it.path, 'utf8').replace(FRONT, '');
  } catch {}
  return `${name}: ${it.description}\n${body}`.split(PY_SPACE).filter(Boolean).slice(0, CFG.doc_max_words).join(' ');
}

async function build(key: string): Promise<Loaded> {
  const items: Item[] = JSON.parse(readFileSync(CATALOG, 'utf8').replace(/^\uFEFF/, '')).items;
  const file = join(STATE, `locate-ts-${key}.json`);
  let ids: string[];
  let mat: Float32Array[];
  let pri: number[];
  try {
    const z = JSON.parse(readFileSync(file, 'utf8'));
    const all = new Float32Array(Buffer.from(z.vecs, 'base64').buffer.slice(0));
    ids = z.ids;
    pri = z.prior;
    mat = ids.map((_, i) => all.slice(i * z.dim, (i + 1) * z.dim));
  } catch {
    const uniq = new Map<string, Item>();
    for (const it of items) uniq.set(ident(it), it);
    ids = [...uniq.values()].map((it) => it.id);
    mat = await embed(MODEL, [...uniq.values()].map(docFor));
    const g = await embed(MODEL, CFG.generic_tasks);
    pri = mat.map((v) => g.reduce((s, q) => s + dot(q, v), 0) / g.length);
    try {
      mkdirSync(STATE, { recursive: true });
      for (const f of readdirSync(STATE)) if (/^locate-ts-.*\.json$/.test(f)) unlinkSync(join(STATE, f)); // one catalog state at a time
      const all = new Float32Array(mat.length * (mat[0]?.length ?? 0));
      mat.forEach((v, i) => all.set(v, i * v.length));
      writeFileSync(file, JSON.stringify({ ids, prior: pri, dim: mat[0]?.length ?? 0, vecs: Buffer.from(all.buffer).toString('base64') }));
    } catch {}
  }
  const vecs = new Map(ids.map((id, i) => [id, mat[i]]));
  const prior = new Map(ids.map((id, i) => [id, pri[i]]));
  // clones share the vector of the item kept for their (kind, name, description)
  const keep = new Map<string, string>();
  for (const it of items) if (vecs.has(it.id)) keep.set(ident(it), it.id);
  for (const it of items) {
    const k = keep.get(ident(it));
    if (!vecs.has(it.id) && k) {
      vecs.set(it.id, vecs.get(k)!);
      prior.set(it.id, prior.get(k)!);
    }
  }
  return { items, vecs, prior };
}

/** Catalog items, one vector per distinct item and its prior, cached on disk by catalog mtime plus model id. */
export function load(): Promise<Loaded> {
  let m: number;
  try {
    m = statSync(CATALOG).mtimeMs;
  } catch {
    return Promise.resolve({ items: [], vecs: new Map(), prior: new Map() });
  }
  const key = createHash('sha1').update(`${CATALOG}|${m}|${MODELS[MODEL].repo}|${JSON.stringify(CFG)}`).digest('hex').slice(0, 16);
  if (cache?.key !== key) {
    const p = build(key);
    p.catch(() => (cache = null));
    cache = { key, p };
  }
  return cache.p;
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

export async function run(task: string, topK = 3, kinds?: string[] | null, project?: string | null) {
  const { items, vecs, prior } = await load();
  const cand = pool(items, kinds, project).filter((it) => vecs.has(it.id));
  if (!cand.length) return { picks: [], pool: 0, error: existsSync(CATALOG) ? 'empty pool' : `no catalog at ${CATALOG}` };
  const [q] = await embed(MODEL, [task]); // bare: the card's query contract has no prefix
  const raw = cand.map((it) => dot(vecs.get(it.id)!, q));
  const score = raw.map((r, i) => r - prior.get(cand[i].id)!);
  const best = score.map((_, i) => i).sort((a, b) => score[b] - score[a]).slice(0, Math.max(topK, 0)).filter((i) => score[i] >= CFG.floor);
  const picks = best.map((i) => ({
    id: cand[i].id, kind: cand[i].kind, name: cand[i].name, invocation: cand[i].invocation,
    category: cand[i].category, score: round4(score[i]), raw: round4(raw[i]),
    description: Array.from(String(cand[i].description)).slice(0, 200).join(''),
  }));
  return { picks, pool: cand.length };
}

export const tool: Tool = {
  name: 'locate_skill',
  description: `Find the skills and agents that best fit a task, from the machine's skill catalog.

task: what the user wants, in their words. top_k: how many picks. kinds: restrict to "skill"
and/or "agent". project: the working folder; that project's own skills and agents join the
global ones. Returns picks (invocation, category, score, raw, short description) best first.
raw is the cosine between the task and the item's name, description and body under
SKILLRET-Edge-109M; score is raw minus the item's mean cosine over generic task phrases (hub
correction), so about 0 means no better than a vague request and 0.15 or more is a likely fit. Reads the skill catalog JSON (env PROTON_SKILL_CATALOG, default
skill-catalog.json in the state folder); regenerate that file to refresh it. The first call after a catalog change embeds the whole catalog once (cached on disk).`,
  schema: {
    task: z.string(),
    top_k: z.number().int().default(3),
    kinds: z.array(z.string()).nullable().optional(),
    project: z.string().nullable().optional(),
  },
  run: (a) => run(a.task, a.top_k ?? 3, a.kinds, a.project),
};
