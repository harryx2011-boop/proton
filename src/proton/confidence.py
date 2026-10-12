"""Pure confidence formulas. The TypeScript twin is vscode/src/server/confidence.ts; both are pinned by tests/golden/confidence.json."""
import math


def norm(p_top, k):
    """(k * p_top - 1) / (k - 1): 0 for a uniform spread, 1 for certainty. One label has nothing to spread over."""
    return p_top if k < 2 else (k * p_top - 1) / (k - 1)


def margin_ratio(probs):
    """(p_top - p_second, p_second / p_top); a single label has margin p_top and ratio 0."""
    s = sorted(probs.values(), reverse=True)
    if len(s) < 2:
        return s[0], 0.0
    return s[0] - s[1], (s[1] / s[0] if s[0] > 0 else 0.0)


def temper(probs, t):
    """Temperature scaling: p_i proportional to p_i ** (1 / t), label order kept."""
    if t == 1:
        return dict(probs)
    z = {k: math.log(max(p, 1e-12)) / t for k, p in probs.items()}
    m = max(z.values())
    e = {k: math.exp(v - m) for k, v in z.items()}
    s = sum(e.values())
    return {k: v / s for k, v in e.items()}


def gate(value, th):
    """act at or above th.act, confirm at or above th.review, else ask_person."""
    return "act" if value >= th["act"] else "confirm" if value >= th["review"] else "ask_person"


def thresholds_for(risk, override, table):
    """The caller's {act, review} if given, else the row for `risk` (default row when None). Bad input raises ValueError."""
    rows = table["table"]
    if risk is not None and risk not in rows:
        raise ValueError(f"unknown risk class {risk!r}; use one of {list(rows)}")
    if override is not None:
        try:
            act, review = float(override["act"]), float(override["review"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("thresholds needs numeric act and review")
        if not 0 <= review <= act <= 1:
            raise ValueError("thresholds need 0 <= review <= act <= 1")
        return {"act": act, "review": review}
    return dict(rows[risk or table["default"]])


def ordinal_confidence(probs):
    """1 - spread / spread of an even distribution, for probabilities over ordered levels; 1 when all mass sits on one level."""
    k = len(probs)
    e = sum(i * p for i, p in enumerate(probs))
    spread = math.sqrt(sum(p * (i - e) ** 2 for i, p in enumerate(probs)))
    return min(1.0, max(0.0, 1 - spread / math.sqrt((k * k - 1) / 12)))
