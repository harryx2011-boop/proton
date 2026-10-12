"""Pieces of the routing eval that need no model: intervals, arm comparison, disagreement view, snapshots, the
label-order permutation test and the adapter interface. Used by tests/routing_eval.py."""
import hashlib
import json
import math
import random
from typing import Protocol


def wilson(k, n, z=1.96):
    """95% Wilson score interval for k hits in n tries."""
    if n == 0:
        return 0.0, 1.0
    p, d = k / n, 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def overlap(a, b):
    return a[0] <= b[1] and b[0] <= a[1]


def compare(arms):
    """arms: {name: [bool per case]} -> {name: {k, n, acc, ci}} plus pairs whose intervals do not overlap."""
    stats = {}
    for name, hits in arms.items():
        k, n = sum(hits), len(hits)
        stats[name] = {"k": k, "n": n, "acc": k / n if n else 0.0, "ci": wilson(k, n)}
    names = list(stats)
    pairs = [{"a": a, "b": b, "significant": not overlap(stats[a]["ci"], stats[b]["ci"])}
             for i, a in enumerate(names) for b in names[i + 1:]]
    return stats, pairs


def disagreements(arms, cases):
    """Rows for every case where the arms do not all agree on hit or miss: {case, <arm>: hit}."""
    names = list(arms)
    return [{"case": cases[i], **{n: arms[n][i] for n in names}}
            for i in range(len(cases)) if len({arms[n][i] for n in names}) > 1]


def catalog_hash(names):
    return hashlib.sha256("\n".join(sorted(names)).encode("utf-8")).hexdigest()[:16]


def write_snapshot(path, meta, results):
    """Dated snapshot: who ran, on which catalog, every pick."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"meta": meta, "results": results}, f, indent=1)
        f.write("\n")


def permutation_agreement(classify, texts, labels, n=6, seed=7):
    """classify(text, labels) -> chosen label. Share of (text, shuffled label order) pairs whose answer equals the
    answer for the original order, and the same per text."""
    rng = random.Random(seed)
    per, same, total = [], 0, 0
    for t in texts:
        base, hit = classify(t, list(labels)), 0
        for _ in range(n):
            order = list(labels)
            rng.shuffle(order)
            hit += classify(t, order) == base
        per.append(hit / n)
        same, total = same + hit, total + n
    return same / total, per


def run_arm(adapter, cases, catalog):
    """Route every case through one adapter; each row keeps the picks and whether top-1 and top-3 hit."""
    out = []
    for c in cases:
        picks = list(adapter.route(c["query"], catalog))[:3]
        accept = set(c["accept"])
        out.append({"task": c["query"], "picks": picks, "top1": bool(picks) and picks[0] in accept,
                    "top3": any(p in accept for p in picks)})
    return out


class Adapter(Protocol):
    """One interface for every system under test. Returns skill names, best first (at least three if it can)."""

    name: str

    def route(self, task: str, catalog: dict) -> list: ...
