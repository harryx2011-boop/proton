"""Pure-formula tests for src/proton/confidence.py against tests/golden/confidence.json (shared with the TypeScript port).

Run: .venv\\Scripts\\python.exe tests\\test_confidence.py
"""
import json
import os
import sys

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, "..", "src"))
from proton import confidence as C  # noqa: E402

G = json.load(open(os.path.join(HERE, "golden", "confidence.json"), encoding="utf-8"))
EPS = 1e-6


def close(a, b):
    assert abs(a - b) < EPS, (a, b)


for p, k, want in G["norm"]:
    close(C.norm(p, k), want)

for probs, margin, ratio in G["margin_ratio"]:
    m, r = C.margin_ratio(probs)
    close(m, margin)
    close(r, ratio)

for probs, t, want in G["temper"]:
    got = C.temper(probs, t)
    assert list(got) == list(want)
    for k in want:
        close(got[k], want[k])

TABLE = json.load(open(os.path.join(HERE, "..", "src", "proton", "data", "thresholds.json"), encoding="utf-8"))
for value, th, want in G["gate"]:
    assert C.gate(value, th) == want, (value, th, want)
for risk, override, want in G["thresholds_for"]:
    assert C.thresholds_for(risk, override, TABLE) == want, (risk, override)
for risk, override in G["thresholds_errors"]:
    try:
        C.thresholds_for(risk, override, TABLE)
    except ValueError:
        continue
    raise AssertionError(f"accepted {risk} {override}")

for probs, want in G["ordinal"]:
    close(C.ordinal_confidence(probs), want)

print("PASS")
