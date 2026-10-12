import { z } from 'zod';
import * as proto from '../proto';
import type { Tool } from './index';

export async function run(items: string[], labels: string[] | Record<string, string>) {
  const protos: Record<string, string> = Array.isArray(labels)
    ? Object.fromEntries(labels.map((x) => [String(x), String(x).replaceAll('_', ' ')]))
    : { ...labels };
  const names = Object.keys(protos);
  const sims = await proto.similarities(items, protos);
  const results = items.map((item, index) => {
    const p = proto.softmax(sims[index]);
    const r = names.map((n, j) => [n, p[j]] as [string, number]).sort((a, b) => b[1] - a[1]);
    return { index, item, label: r[0][0], score: r[0][1], ranked: r.slice(0, 3) };
  });
  return { results, buckets: Object.fromEntries(names.map((n) => [n, results.filter((r) => r.label === n).map((r) => r.index)])) };
}

export const tool: Tool = {
  name: 'triage',
  description: `Sort items into fixed buckets, one label each.

labels: a list of bucket names, or {bucket: short description} (descriptions sharpen the call).
Returns results (index, item, label, score, top-3 ranked) in input order, and buckets mapping
each label to the indexes of its items.`,
  schema: { items: z.array(z.string()), labels: z.union([z.array(z.string()), z.record(z.string())]) },
  run: (a) => run(a.items, a.labels),
};
