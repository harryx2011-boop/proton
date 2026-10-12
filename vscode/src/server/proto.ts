// Label prototypes on e5-base-v2; a port of src/proton/proto.py.
import { data, dot, embed } from './models';

const DATA = data('prototypes.json');
const TEXT: string = DATA.text_prefix;
const EXAMPLE: string = DATA.example_prefix;
export const TEMP = Number(process.env.PROTON_PROTO_TEMP || DATA.temperature);
export const HEADS: Record<string, string[]>[] = Object.values(DATA.heads);
export const RISK: Record<string, string[]> = DATA.risk;
export type Protos = Record<string, string | string[]>;

// ponytail: label vectors cached per string (4096, oldest evicted); a long-lived server with endless new labels just evicts
const cache = new Map<string, Promise<Float32Array>>();
function vec(text: string): Promise<Float32Array> {
  let v = cache.get(text);
  if (!v) {
    v = embed('e5', [text]).then((r) => r[0]);
    v.catch(() => cache.delete(text));
    cache.set(text, v);
    if (cache.size > 4096) cache.delete(cache.keys().next().value!);
  }
  return v;
}

async function prototype(examples: string[]): Promise<Float32Array> {
  const vs = await Promise.all(examples.map((e) => vec(EXAMPLE + e)));
  const m = new Float32Array(vs[0].length);
  for (const v of vs) for (let i = 0; i < m.length; i++) m[i] += v[i];
  for (let i = 0; i < m.length; i++) m[i] /= vs.length;
  const n = Math.sqrt(dot(m, m));
  return m.map((x) => x / n);
}

/** Cosine of each text (rows) to each label prototype (columns). */
export async function similarities(texts: string[], protos: Protos): Promise<number[][]> {
  const q = await embed('e5', texts.map((t) => TEXT + String(t)));
  const p = await Promise.all(Object.values(protos).map((ex) => prototype(Array.isArray(ex) ? ex : [ex])));
  return q.map((v) => p.map((w) => dot(v, w)));
}

export function softmax(s: number[], temp = TEMP): number[] {
  const mx = Math.max(...s);
  const z = s.map((x) => Math.exp((x - mx) / temp));
  const t = z.reduce((a, b) => a + b, 0);
  return z.map((x) => x / t);
}

/** {label: probability} for one text; protos is {label: [examples]} or {label: description}. */
export async function classify(text: string, protos: Protos, temp = TEMP): Promise<Record<string, number>> {
  const p = softmax((await similarities([text], protos))[0], temp);
  return Object.fromEntries(Object.keys(protos).map((k, i) => [k, p[i]]));
}

/** The fixed head whose label set equals these labels, if any. */
export function head(labels: string[]): Record<string, string[]> | undefined {
  const want = new Set(labels);
  return HEADS.find((h) => {
    const ks = Object.keys(h);
    return ks.length === want.size && ks.every((k) => want.has(k));
  });
}
