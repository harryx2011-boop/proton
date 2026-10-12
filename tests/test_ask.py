"""ask(): several typed questions about one text, answered through decide() (needs the models: set PROTON_MODEL_DIR).

Run: .venv\\Scripts\\python.exe tests\\test_ask.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from proton.decide import decide  # noqa: E402
from proton.tools import ask as A  # noqa: E402

STATE = "I was charged twice for one order and nobody has answered my emails for a week. This is unacceptable."
QS = {
    "topic": {"type": "choice", "labels": ["billing", "shipping", "login"]},
    "angry": {"type": "noul", "criteria": "the writer is angry or very frustrated"},
    "urgency": {"type": "score", "levels": ["low", "medium", "high", "critical"]},
}

out = A.run(decide, STATE, QS)
assert list(out) == ["answers", "feasible", "violations"] and out["feasible"] is True
a = out["answers"]
assert list(a) == ["topic", "angry", "urgency"]

# one ask call equals separate decide calls
t = decide(STATE, {"topic": ["billing", "shipping", "login"]})["decisions"]["topic"]
assert a["topic"]["type"] == "choice" and a["topic"]["label"] == t["label"] and abs(a["topic"]["confidence"] - t["confidence"]) < 1e-6
n = decide(STATE, {"angry": {"labels": {"yes": "the writer is angry or very frustrated"}, "multi_label": True}})["decisions"]["angry"]
p = n["probabilities"]["yes"]
assert a["angry"]["type"] == "noul" and abs(a["angry"]["probability"] - p) < 1e-6
assert a["angry"]["answer"] is (p >= 0.5) and abs(a["angry"]["confidence"] - 2 * abs(p - 0.5)) < 1e-6
s = decide(STATE, {"urgency": ["low", "medium", "high", "critical"]})["decisions"]["urgency"]
assert a["urgency"]["level"] == s["label"] and a["urgency"]["index"] == ["low", "medium", "high", "critical"].index(s["label"])
assert a["urgency"]["probabilities"] == [s["probabilities"][l] for l in ["low", "medium", "high", "critical"]]
assert 0 <= a["urgency"]["confidence"] <= 1 and abs(a["urgency"]["top_probability"] - s["confidence"]) < 1e-6
for x in a.values():
    assert x["action"] in ("act", "confirm", "ask_person") and x["gate_basis"] in ("raw", "calibrated")

# thresholds pass through
assert all(x["action"] == "act" for x in A.run(decide, STATE, QS, thresholds={"act": 0.0, "review": 0.0})["answers"].values())

# integer-like level names keep their order
nums = A.run(decide, "very good", {"q": {"type": "score", "levels": ["3", "1", "2"]}})["answers"]["q"]
assert nums["level"] in ("3", "1", "2") and len(nums["probabilities"]) == 3 and nums["index"] == ["3", "1", "2"].index(nums["level"])

# rules apply across choice questions
rules = [{"excludes": ["topic=billing", "topic2=login"]}]
r = A.run(decide, STATE, {"topic": {"type": "choice", "labels": ["billing", "shipping"]}, "topic2": {"type": "choice", "labels": ["login", "other"]}}, rules=rules)
assert not (r["answers"]["topic"]["label"] == "billing" and r["answers"]["topic2"]["label"] == "login")

# rejected input
bad = [
    {},
    {"q": {"type": "weird"}},
    {"q": {"type": "choice", "labels": ["only"]}},
    {"q": {"type": "score", "levels": ["one"]}},
    {"q": {"type": "score", "levels": ["a", "a"]}},
    {"q": "not a dict"},
]
for qs in bad:
    try:
        A.run(decide, STATE, qs)
    except ValueError:
        continue
    raise AssertionError(f"accepted {qs}")

print("PASS")
