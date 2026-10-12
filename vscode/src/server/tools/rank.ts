import { z } from 'zod';
import * as proto from '../proto';
import type { Tool } from './index';

export async function run(texts: string[], criterion: string) {
  const s = (await proto.similarities(texts, { c: criterion })).map((r) => r[0]);
  const scored = texts.map((text, index) => ({ index, text, score: s[index] }));
  return { ranked: scored.sort((a, b) => b.score - a.score) };
}

export const tool: Tool = {
  name: 'rank',
  description: `Order texts by how well each fits one criterion, best first.

criterion is a short phrase ("urgent and needs a reply", "mentions pricing"). Each text gets an
independent score: the cosine between the text and the criterion (e5-base-v2, about 0.6-0.9).
Returns {"ranked": [{index, text, score}, ...]} sorted high to low. A relative order, not a probability.`,
  schema: { texts: z.array(z.string()), criterion: z.string() },
  run: (a) => run(a.texts, a.criterion),
};
