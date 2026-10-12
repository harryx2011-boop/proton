"""Run: .venv\\Scripts\\python.exe tests\\test_routing_lib.py   (no model needed)"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
import routing_lib as R  # noqa: E402

lo, hi = R.wilson(14, 28)
assert abs(lo - 0.3263) < 1e-3 and abs(hi - 0.6737) < 1e-3, (lo, hi)
assert R.wilson(0, 0) == (0.0, 1.0)
assert R.wilson(28, 28)[1] == 1.0 and R.wilson(0, 28)[0] == 0.0
assert R.overlap((0.1, 0.5), (0.5, 0.9)) and not R.overlap((0.1, 0.4), (0.5, 0.9))

arms = {"base": [True] * 10 + [False] * 18, "oracle": [True] * 26 + [False] * 2, "near": [True] * 11 + [False] * 17}
stats, pairs = R.compare(arms)
sig = {(p["a"], p["b"]): p["significant"] for p in pairs}
assert stats["base"]["k"] == 10 and stats["oracle"]["n"] == 28
assert sig[("base", "oracle")] is True, "26/28 against 10/28 must be significant"
assert sig[("base", "near")] is False, "10/28 against 11/28 is noise"

cases = ["a", "b", "c"]
rows = R.disagreements({"x": [True, True, False], "y": [True, False, False]}, cases)
assert rows == [{"case": "b", "x": True, "y": False}]

assert R.catalog_hash(["b", "a"]) == R.catalog_hash(["a", "b"]) != R.catalog_hash(["a"])

# a classifier that picks the first label depends on order; one that picks by text does not
rate, per = R.permutation_agreement(lambda t, labels: labels[0], ["t1", "t2"], ["a", "b", "c", "d"], n=20)
assert rate < 0.6, rate
rate, per = R.permutation_agreement(lambda t, labels: "a", ["t1", "t2"], ["a", "b", "c"], n=10)
assert rate == 1.0 and per == [1.0, 1.0]

class Fake:
    name = "fake"

    def route(self, task, catalog):
        return ["commit", "video", "qmd", "extra"]


rows = R.run_arm(Fake(), [{"query": "q1", "accept": ["commit"]}, {"query": "q2", "accept": ["qmd"]}, {"query": "q3", "accept": ["zzz"]}], {})
assert [r["top1"] for r in rows] == [True, False, False] and [r["top3"] for r in rows] == [True, True, False]
assert rows[0]["picks"] == ["commit", "video", "qmd"]

with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, "s.json")
    R.write_snapshot(p, {"date": "2026-10-12", "catalog_hash": "x"}, [{"task": "t", "pick": ["a"]}])
    got = json.load(open(p, encoding="utf-8"))
    assert got["meta"]["catalog_hash"] == "x" and got["results"][0]["pick"] == ["a"]

print("PASS")
