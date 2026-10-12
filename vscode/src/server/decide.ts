// decide(): per-head label probabilities, then the best joint assignment that satisfies the rules.
// A port of src/proton/decide.py: fixed heads (data/prototypes.json) go to e5 prototypes, any other head to
// GLiClass; rules are checked after scoring over each head's top labels.
import { gate, marginRatio, norm, temper, thresholdsFor, type ThresholdTable } from './confidence';
import { data, gliclassLogits } from './models';
import * as proto from './proto';

const TOP = 4; // labels per single-label head kept for the joint search
const FLIPS = 3; // labels nearest 0.5 a multi-label head may flip in the joint search
const TH: ThresholdTable = data('thresholds.json'); // per risk class {act, review}; a caller can override
const CAL: Record<string, { temperature?: number }> = data('calibration.json'); // written by scripts/calibrate.py

type HeadSpec = string[] | { labels: string[] | Record<string, string>; multi_label?: boolean };
type Probs = Record<string, number>;
type Option = [Set<string>, number];
type Rule = Record<string, any>;

function spec(s: HeadSpec): [string[], Record<string, string> | null, boolean] {
  if (Array.isArray(s)) return [s.map(String), null, false];
  const l = s.labels;
  if (!Array.isArray(l) && typeof l === 'object') {
    return [Object.keys(l), Object.fromEntries(Object.entries(l).map(([k, v]) => [k, String(v)])), !!s.multi_label];
  }
  return [(l as string[]).map(String), null, !!s.multi_label];
}

async function headProbs(text: string, labels: string[], desc: Record<string, string> | null, multi: boolean): Promise<Probs> {
  const protos = proto.head(labels);
  if (protos && !multi) return proto.classify(text, protos);
  const z = await gliclassLogits(text, desc ? labels.map((l) => desc[l]) : labels);
  let p: number[];
  if (multi) p = z.map((x) => 1 / (1 + Math.exp(-x)));
  else {
    const mx = Math.max(...z);
    const e = z.map((x) => Math.exp(x - mx));
    const t = e.reduce((a, b) => a + b, 0);
    p = e.map((x) => x / t);
  }
  return Object.fromEntries(labels.map((l, i) => [l, p[i]]));
}

// raw rule dicts ({"type": "Implies", "left": ..., "right": ...}); a new node type is one row here
const NODES: Record<string, (d: Rule, a: Record<string, Set<string>>) => boolean> = {
  LabelRef: (d, a) => {
    if (!(d.task in a)) throw new Error(`KeyError: '${d.task}'`);
    return a[d.task].has(d.label);
  },
  Not: (d, a) => !evaluate(d.child, a),
  And: (d, a) => d.children.every((c: Rule) => evaluate(c, a)),
  Or: (d, a) => d.children.some((c: Rule) => evaluate(c, a)),
  Implies: (d, a) => !evaluate(d.left, a) || evaluate(d.right, a),
  Iff: (d, a) => evaluate(d.left, a) === evaluate(d.right, a),
  Excludes: (d, a) => !(evaluate(d.left, a) && evaluate(d.right, a)),
};
const OPS: Record<string, string> = { implies: 'Implies', excludes: 'Excludes', iff: 'Iff' };

function evaluate(d: Rule, a: Record<string, Set<string>>): boolean {
  const f = NODES[d.type];
  if (!f) throw new Error(`KeyError: '${d.type}'`);
  return f(d, a);
}

function rule(r: Rule): Rule {
  for (const [op, type] of Object.entries(OPS)) {
    if (op in r) {
      const [left, right] = (r[op] as string[]).map((x) => {
        const i = x.indexOf('=');
        return { type: 'LabelRef', task: x.slice(0, i), label: x.slice(i + 1) };
      });
      return { type, left, right };
    }
  }
  return r;
}

const ln = (x: number) => Math.log(Math.max(x, 1e-12));

function combinations<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return xs.flatMap((x, i) => combinations(xs.slice(i + 1), k - 1).map((c) => [x, ...c]));
}

/** Candidate assignments for one head, best first. */
function options(probs: Probs, multi: boolean): Option[] {
  const labels = Object.keys(probs);
  if (!multi) {
    return [...labels].sort((a, b) => probs[b] - probs[a]).slice(0, TOP).map((l) => [new Set([l]), ln(probs[l])]);
  }
  const base = new Set(labels.filter((l) => probs[l] >= 0.5));
  const near = [...labels].sort((a, b) => Math.abs(probs[a] - 0.5) - Math.abs(probs[b] - 0.5)).slice(0, FLIPS);
  const out: Option[] = [];
  for (let k = 0; k <= near.length; k++) {
    for (const flips of combinations(near, k)) {
      const s = new Set(base);
      for (const f of flips) s.has(f) ? s.delete(f) : s.add(f);
      out.push([s, labels.reduce((acc, l) => acc + ln(s.has(l) ? probs[l] : 1 - probs[l]), 0)]);
    }
  }
  return out.sort((a, b) => b[1] - a[1]);
}

// Python's repr() of a rule dict, so `violations` reads the same as the Python server's
function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    const s = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    return s.includes("'") && !s.includes('"') ? `"${s}"` : `'${s.replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
  return '{' + Object.entries(v as object).map(([k, x]) => `${pyRepr(k)}: ${pyRepr(x)}`).join(', ') + '}';
}

function* product(lists: Option[][], i = 0, acc: Option[] = []): Generator<Option[]> {
  if (i === lists.length) return yield acc;
  for (const o of lists[i]) yield* product(lists, i + 1, [...acc, o]);
}

export async function decide(text: string, heads: Record<string, HeadSpec>, rules?: Rule[] | null, thresholds?: unknown, risk?: string | null) {
  const th = thresholdsFor(risk, thresholds, TH);
  const specs = Object.fromEntries(Object.entries(heads).map(([n, s]) => [n, spec(s)]));
  const names = Object.keys(specs);
  const probs: Record<string, Probs> = {};
  for (const n of names) probs[n] = await headProbs(text, ...specs[n]);
  const opts = Object.fromEntries(names.map((n) => [n, options(probs[n], specs[n][2])]));
  let best = Object.fromEntries(names.map((n) => [n, opts[n][0][0]]));
  let feasible = true;
  let violations: string[] = [];
  if (rules && rules.length) {
    const tree = rules.map(rule);
    let joint: Option[] | null = null;
    let top = -Infinity;
    for (const combo of product(names.map((n) => opts[n]))) {
      const a = Object.fromEntries(names.map((n, i) => [n, combo[i][0]]));
      if (!tree.every((t) => evaluate(t, a))) continue;
      const s = combo.reduce((acc, c) => acc + c[1], 0);
      if (s > top) [top, joint] = [s, combo];
    }
    if (!joint) {
      feasible = false;
      violations = rules.filter((_, i) => !evaluate(tree[i], best)).map(pyRepr);
    } else {
      const j = joint;
      best = Object.fromEntries(names.map((n, i) => [n, j[i][0]]));
    }
  }
  const decisions: Record<string, unknown> = {};
  for (const n of names) {
    const [labels, , multi] = specs[n];
    const p = probs[n];
    const chosen = best[n];
    const overrode = ![...chosen].every((l) => opts[n][0][0].has(l)) || chosen.size !== opts[n][0][0].size;
    if (multi) {
      const conf = Math.exp(labels.reduce((acc, l) => acc + ln(chosen.has(l) ? p[l] : 1 - p[l]), 0) / labels.length);
      decisions[n] = {
        labels: labels.filter((l) => chosen.has(l)), confidence: conf, probabilities: p,
        confidence_norm: null, margin: null, ratio: null, rule_overrode: overrode, calibrated: null,
      };
    } else {
      const [lab] = chosen;
      const [margin, ratio] = marginRatio(p);
      const name = proto.headName(labels);
      const t = name ? CAL[name]?.temperature : undefined;
      decisions[n] = {
        label: lab, confidence: p[lab], probabilities: p,
        confidence_norm: norm(p[lab], labels.length), margin, ratio, rule_overrode: overrode,
        calibrated: t ? temper(p, t)[lab] : null,
      };
    }
  }
  for (const d of Object.values(decisions) as Record<string, any>[]) {
    const raw = d.calibrated === null;
    d.gate_basis = raw ? 'raw' : 'calibrated';
    d.action = feasible ? gate(raw ? d.confidence : d.calibrated, th) : 'ask_person';
  }
  return { decisions, feasible, violations };
}

/** decide() over many texts with one schema; the prototype-scored heads read all texts in one batched e5 run. */
export async function decideMany(texts: string[], heads: Record<string, HeadSpec>, rules?: Rule[] | null, thresholds?: unknown, risk?: string | null) {
  if (Object.values(heads).some((s) => {
    const [labels, , multi] = spec(s);
    return !multi && proto.head(labels);
  })) await proto.queries(texts);
  const results = [];
  for (const t of texts) results.push(await decide(t, heads, rules, thresholds, risk));
  return results;
}
