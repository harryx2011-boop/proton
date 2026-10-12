// Pure confidence formulas; a port of src/proton/confidence.py, pinned by tests/golden/confidence.json.
export type Probs = Record<string, number>;

/** (k * pTop - 1) / (k - 1): 0 for a uniform spread, 1 for certainty. One label has nothing to spread over. */
export const norm = (pTop: number, k: number): number => (k < 2 ? pTop : (k * pTop - 1) / (k - 1));

/** [pTop - pSecond, pSecond / pTop]; a single label has margin pTop and ratio 0. */
export function marginRatio(probs: Probs): [number, number] {
  const s = Object.values(probs).sort((a, b) => b - a);
  if (s.length < 2) return [s[0], 0];
  return [s[0] - s[1], s[0] > 0 ? s[1] / s[0] : 0];
}

/** Temperature scaling: p_i proportional to p_i ** (1 / t), label order kept. */
export function temper(probs: Probs, t: number): Probs {
  if (t === 1) return { ...probs };
  const z = Object.entries(probs).map(([k, p]) => [k, Math.log(Math.max(p, 1e-12)) / t] as const);
  const m = Math.max(...z.map(([, v]) => v));
  const e = z.map(([k, v]) => [k, Math.exp(v - m)] as const);
  const s = e.reduce((a, [, v]) => a + v, 0);
  return Object.fromEntries(e.map(([k, v]) => [k, v / s]));
}

export type Thresholds = { act: number; review: number };
export type ThresholdTable = { table: Record<string, Thresholds>; default: string };

/** act at or above th.act, confirm at or above th.review, else ask_person. */
export const gate = (value: number, th: Thresholds): string => (value >= th.act ? 'act' : value >= th.review ? 'confirm' : 'ask_person');

/** The caller's {act, review} if given, else the row for `risk` (default row when null). Bad input throws. */
export function thresholdsFor(risk: string | null | undefined, override: unknown, table: ThresholdTable): Thresholds {
  const rows = table.table;
  if (risk != null && !(risk in rows)) throw new Error(`unknown risk class '${risk}'; use one of ${Object.keys(rows).join(', ')}`);
  if (override != null) {
    const o = override as Record<string, unknown>;
    const act = Number(o.act);
    const review = Number(o.review);
    if (o.act == null || o.review == null || !Number.isFinite(act) || !Number.isFinite(review)) throw new Error('thresholds needs numeric act and review');
    if (!(review >= 0 && review <= act && act <= 1)) throw new Error('thresholds need 0 <= review <= act <= 1');
    return { act, review };
  }
  return { ...rows[risk ?? table.default] };
}

/** 1 - spread / spread of an even distribution, for probabilities over ordered levels; 1 when all mass sits on one level. */
export function ordinalConfidence(probs: number[]): number {
  const k = probs.length;
  const e = probs.reduce((a, p, i) => a + i * p, 0);
  const spread = Math.sqrt(probs.reduce((a, p, i) => a + p * (i - e) ** 2, 0));
  return Math.min(1, Math.max(0, 1 - spread / Math.sqrt((k * k - 1) / 12)));
}
