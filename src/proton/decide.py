"""decide(): per-head label probabilities, then the best joint assignment that satisfies the rules.

A head whose label set matches one in data/prototypes.json "heads" (the injection and complexity heads
the hooks send) is scored by e5-base-v2 prototypes; any other head goes to GLiClass. Rules are checked after scoring by
enumerating the top labels of each head (GLiClass has no constrained decoding).
"""
import itertools
import math

import numpy as np

from . import models, proto

TOP = 4  # labels per single-label head kept for the joint search
FLIPS = 3  # labels nearest 0.5 a multi-label head may flip in the joint search


def _spec(spec):
    """(labels, descriptions or None, multi_label) from a list or {labels, multi_label} head."""
    if isinstance(spec, list):
        return [str(x) for x in spec], None, False
    labels = spec["labels"]
    if isinstance(labels, dict):
        return list(labels), {k: str(v) for k, v in labels.items()}, bool(spec.get("multi_label"))
    return [str(x) for x in labels], None, bool(spec.get("multi_label"))


def head_probs(text, labels, desc, multi):
    protos = proto.HEADS.get(frozenset(labels))
    if protos and not multi:
        return proto.classify(text, protos)
    names = [desc[l] for l in labels] if desc else labels
    z = models.gliclass_logits(text, names).astype(np.float64)
    p = 1 / (1 + np.exp(-z)) if multi else np.exp(z - z.max()) / np.exp(z - z.max()).sum()
    return dict(zip(labels, p.tolist()))


# raw rule dicts ({"type": "Implies", "left": ..., "right": ...}); a new node type is one row here
_NODES = {
    "LabelRef": lambda d, a: d["label"] in a[d["task"]],
    "Not": lambda d, a: not _eval(d["child"], a),
    "And": lambda d, a: all(_eval(c, a) for c in d["children"]),
    "Or": lambda d, a: any(_eval(c, a) for c in d["children"]),
    "Implies": lambda d, a: not _eval(d["left"], a) or _eval(d["right"], a),
    "Iff": lambda d, a: _eval(d["left"], a) == _eval(d["right"], a),
    "Excludes": lambda d, a: not (_eval(d["left"], a) and _eval(d["right"], a)),
}
_OPS = {"implies": "Implies", "excludes": "Excludes", "iff": "Iff"}


def _eval(d, a):
    return _NODES[d["type"]](d, a)


def _rule(r):
    for op, node in _OPS.items():
        if op in r:
            left, right = ({"type": "LabelRef", "task": t, "label": l} for t, l in (x.split("=", 1) for x in r[op]))
            return {"type": node, "left": left, "right": right}
    return r


def _options(probs, multi):
    """Candidate assignments for one head as (frozenset of labels, log score), best first."""
    if not multi:
        top = sorted(probs, key=probs.get, reverse=True)[:TOP]
        return [(frozenset([l]), math.log(max(probs[l], 1e-12))) for l in top]
    base = {l for l, p in probs.items() if p >= 0.5}
    near = sorted(probs, key=lambda l: abs(probs[l] - 0.5))[:FLIPS]
    out = []
    for flips in itertools.chain.from_iterable(itertools.combinations(near, k) for k in range(len(near) + 1)):
        s = frozenset(base.symmetric_difference(flips))
        out.append((s, sum(math.log(max(p if l in s else 1 - p, 1e-12)) for l, p in probs.items())))
    return sorted(out, key=lambda o: -o[1])


def decide(text, heads, rules=None):
    specs = {n: _spec(s) for n, s in heads.items()}
    probs = {n: head_probs(text, l, d, m) for n, (l, d, m) in specs.items()}
    opts = {n: _options(probs[n], specs[n][2]) for n in specs}
    best = {n: o[0][0] for n, o in opts.items()}
    feasible, violations = True, []
    if rules:
        tree = [_rule(r) for r in rules]
        names = list(opts)
        joint = max(
            (combo for combo in itertools.product(*(opts[n] for n in names))
             if all(_eval(t, dict(zip(names, (c[0] for c in combo)))) for t in tree)),
            key=lambda combo: sum(c[1] for c in combo), default=None,
        )
        if joint is None:
            feasible = False
            violations = [str(r) for r, t in zip(rules, tree) if not _eval(t, best)]
        else:
            best = {n: c[0] for n, c in zip(names, joint)}
    out = {}
    for n, (labels, _, multi) in specs.items():
        p, chosen = probs[n], best[n]
        if multi:
            conf = math.exp(sum(math.log(max(p[l] if l in chosen else 1 - p[l], 1e-12)) for l in labels) / len(labels))
            out[n] = {"labels": [l for l in labels if l in chosen], "confidence": conf, "probabilities": p}
        else:
            (lab,) = chosen
            out[n] = {"label": lab, "confidence": p[lab], "probabilities": p}
    return {"decisions": out, "feasible": feasible, "violations": violations}
