// ONNX Runtime int8 sessions for Proton's encoders; a port of src/proton/models.py.
// The model table is data/models.json; files live in MODEL_DIR/<key>/ (model.onnx, tokenizer.json, MANIFEST.md).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ort from 'onnxruntime-node';
import { Tokenizer } from '@huggingface/tokenizers';
import { defaultModelDir } from './modelFetch';

export const DATA_DIR = process.env.PROTON_DATA_DIR || join(__dirname, 'data');
// PROTON_MODEL_DIR, else a vsix that bundles models (dev build), else the cache the first run downloads into
const BUNDLED = join(__dirname, '..', 'models');
export const MODEL_DIR = process.env.PROTON_MODEL_DIR || (existsSync(BUNDLED) ? BUNDLED : defaultModelDir());

export const data = (name: string) => JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));

export type Spec = Record<string, any> & { max_len: number };
export const MODELS: Record<string, Spec> = Object.fromEntries(
  Object.entries(data('models.json')).filter(([k]) => !k.startsWith('_')),
) as Record<string, Spec>;

type Loaded = { sess: ort.InferenceSession; tok: Tokenizer; spec: Spec; typeIds: boolean };
const loaded = new Map<string, Promise<Loaded>>();

export function load(key: string): Promise<Loaded> {
  let p = loaded.get(key);
  if (!p) {
    p = (async () => {
      const spec = MODELS[key];
      const dir = join(MODEL_DIR, key);
      // the arena keeps the peak block for every input shape seen; off keeps memory flat under varied lengths
      const sess = await ort.InferenceSession.create(join(dir, 'model.onnx'), {
        executionProviders: ['cpu'],
        enableCpuMemArena: false,
        intraOpNumThreads: Number(process.env.PROTON_THREADS || 4),
      });
      const tok = new Tokenizer(JSON.parse(readFileSync(join(dir, 'tokenizer.json'), 'utf8')), {});
      return { sess, tok, spec, typeIds: sess.inputNames.includes('token_type_ids') };
    })();
    p.catch(() => loaded.delete(key));
    loaded.set(key, p);
  }
  return p;
}

// [CLS] text [SEP], cut at max_len like the Rust tokenizer's right truncation (both templates end in one special token)
function encode(tok: Tokenizer, text: string, max: number): number[] {
  const ids = tok.encode(text).ids;
  return ids.length > max ? [...ids.slice(0, max - 1), ids[ids.length - 1]] : ids;
}

async function run(m: Loaded, batch: number[][]) {
  const len = Math.max(...batch.map((b) => b.length));
  const ids = new BigInt64Array(batch.length * len);
  const mask = new BigInt64Array(batch.length * len);
  batch.forEach((b, i) => b.forEach((id, j) => { ids[i * len + j] = BigInt(id); mask[i * len + j] = 1n; }));
  const dims = [batch.length, len];
  const feed: Record<string, ort.Tensor> = {
    input_ids: new ort.Tensor('int64', ids, dims),
    attention_mask: new ort.Tensor('int64', mask, dims),
  };
  if (m.typeIds) feed.token_type_ids = new ort.Tensor('int64', new BigInt64Array(ids.length), dims);
  const out = await m.sess.run(feed);
  return { out: out[m.sess.outputNames[0]], len };
}

/** L2-normalised sentence vectors. Callers add the model's prefixes. */
export async function embed(key: string, texts: string[], batch = 16): Promise<Float32Array[]> {
  const m = await load(key);
  const vecs: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += batch) {
    const enc = texts.slice(i, i + batch).map((t) => encode(m.tok, t, m.spec.max_len));
    const { out, len } = await run(m, enc);
    const h = out.data as Float32Array;
    const dim = out.dims[2] as number;
    enc.forEach((ids, b) => {
      const v = new Float32Array(dim);
      if (m.spec.pooling === 'cls') v.set(h.subarray(b * len * dim, b * len * dim + dim));
      else {
        for (let t = 0; t < ids.length; t++) for (let d = 0; d < dim; d++) v[d] += h[(b * len + t) * dim + d];
        for (let d = 0; d < dim; d++) v[d] /= Math.max(ids.length, 1e-9);
      }
      let n = 0;
      for (let d = 0; d < dim; d++) n += v[d] * v[d];
      n = Math.sqrt(n);
      for (let d = 0; d < dim; d++) v[d] /= n;
      vecs.push(v);
    });
  }
  return vecs;
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** GLiClass uni-encoder logits for one text over its labels (prompt first: <<LABEL>>a<<LABEL>>b<<SEP>>text). */
export async function gliclassLogits(text: string, labels: string[]): Promise<number[]> {
  const m = await load('gliclass');
  const s = m.spec;
  if (labels.length > s.max_classes) throw new Error(`at most ${s.max_classes} labels per head (got ${labels.length})`);
  if (s.label_underscores_to_spaces) labels = labels.map((l) => l.replaceAll('_', ' '));
  const prompt = labels.map((l) => s.label_token + l).join('') + s.sep_token;
  const { out } = await run(m, [encode(m.tok, s.prompt_first ? prompt + text : text + prompt, s.max_len)]);
  return Array.from((out.data as Float32Array).subarray(0, labels.length));
}
