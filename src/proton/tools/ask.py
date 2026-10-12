import asyncio

from .. import confidence


def _head(name, q):
    """The decide() head for one question; raises ValueError on anything malformed."""
    if not isinstance(q, dict):
        raise ValueError(f"{name}: a question is an object with a type")
    kind = q.get("type")
    if kind == "choice":
        labels = q.get("labels")
        if not isinstance(labels, (list, dict)) or len(labels) < 2:
            raise ValueError(f"{name}: a choice needs at least 2 labels")
        return labels if isinstance(labels, list) else {"labels": labels}
    if kind == "noul":
        # one label through the multi-label (sigmoid) path: its probability is the chance of yes
        return {"labels": {"yes": str(q.get("criteria") or name.replace("_", " "))}, "multi_label": True}
    if kind == "score":
        levels = q.get("levels")
        if not isinstance(levels, list) or len(levels) < 2 or len(set(map(str, levels))) != len(levels):
            raise ValueError(f"{name}: a score needs at least 2 distinct ordered levels")
        return [str(l) for l in levels]
    raise ValueError(f"{name}: type must be choice, noul or score")


def _answer(q, d):
    gate = {"gate_basis": d["gate_basis"], "action": d["action"]}
    if q["type"] == "choice":
        return {"type": "choice", **d}
    if q["type"] == "noul":
        p = d["probabilities"]["yes"]
        return {"type": "noul", "answer": p >= 0.5, "probability": p, "confidence": 2 * abs(p - 0.5), **gate}
    levels = [str(l) for l in q["levels"]]
    probs = [d["probabilities"][l] for l in levels]
    return {"type": "score", "level": d["label"], "index": levels.index(d["label"]),
            "expected": sum(i * p for i, p in enumerate(probs)), "probabilities": probs,
            "confidence": confidence.ordinal_confidence(probs), "top_probability": d["confidence"], **gate}


def run(decide, state, questions, rules=None, thresholds=None, risk=None):
    if not isinstance(questions, dict) or not questions:
        raise ValueError("questions is a non-empty object: {name: question}")
    res = decide(state, {n: _head(n, q) for n, q in questions.items()}, rules, thresholds, risk)
    return {"answers": {n: _answer(q, res["decisions"][n]) for n, q in questions.items()},
            "feasible": res["feasible"], "violations": res["violations"]}


def register(mcp, decide):
    @mcp.tool()
    async def ask(state: str, questions: dict, rules: list[dict] | None = None, thresholds: dict | None = None, risk: str | None = None) -> dict:
        """Answer several named, typed questions about one text in one call.

        questions: {name: question}. A question is one of
        {"type": "choice", "labels": [...] or {label: description}}: pick one;
        {"type": "noul", "criteria": "text to test"}: yes or no, with the probability of yes;
        {"type": "score", "levels": [ordered level names]}: one level on an ordered scale.
        Every answer carries confidence, gate_basis and action (act, confirm or ask_person); see decide for
        thresholds and risk. rules work across choice and score questions as in decide. The state is read once
        for all prototype-scored heads. Not a reasoner.
        """
        return await asyncio.to_thread(run, decide, state, questions, rules, thresholds, risk)
