"""Fit one temperature per calibrated head (injection, risk) and write src/proton/data/calibration.json plus a dated report.

Fit on items where index % 3 != 0, report on the held-out rest. A temperature is applied by decide() only when the
held-out ECE improves; otherwise the entry keeps `temperature_fit` and no `temperature`.

Run: set PROTON_MODEL_DIR=<models>  then  .venv\\Scripts\\python.exe scripts\\calibrate.py [report_path]
"""
import json
import os
import sys
from datetime import date

import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))
from proton import models, proto  # noqa: E402

BINS = 10


def rows(name):
    with open(os.path.join(ROOT, "data", "calibration", name), encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def injection():
    protos = proto._DATA["heads"]["injection"]
    good, bad = list(protos)
    rs = rows("injection.jsonl")
    return [r["text"] for r in rs], [good if r["label"] == "good" else bad for r in rs], protos


def risk():
    rs = rows("risk.jsonl")
    texts = [f"{r['action_name']} {r['args_summary']}".replace("_", " ").replace("-", " ") for r in rs]
    return texts, [r["label"] for r in rs], proto.RISK


def probs(texts, protos):
    return proto.softmax(proto.similarities(texts, protos))


def scale(P, t):
    z = np.log(np.clip(P, 1e-12, None)) / t
    z = np.exp(z - z.max(1, keepdims=True))
    return z / z.sum(1, keepdims=True)


def nll(P, y):
    return float(-np.log(np.clip(P[np.arange(len(y)), y], 1e-12, None)).mean())


def brier(P, y):
    Y = np.zeros_like(P)
    Y[np.arange(len(y)), y] = 1
    return float(((P - Y) ** 2).sum(1).mean())


def bins(P, y):
    conf, hit = P.max(1), P.argmax(1) == y
    out = []
    for i in range(BINS):
        m = (conf > i / BINS) & (conf <= (i + 1) / BINS)
        out.append((i / BINS, (i + 1) / BINS, int(m.sum()), float(conf[m].mean()) if m.any() else 0.0, float(hit[m].mean()) if m.any() else 0.0))
    return out


def ece(P, y):
    n = len(y)
    return float(sum(c / n * abs(mc - acc) for _, _, c, mc, acc in bins(P, y) if c))


def measures(P, y):
    return {"acc": float((P.argmax(1) == y).mean()), "ece": ece(P, y), "brier": brier(P, y), "nll": nll(P, y)}


def fit(P, y):
    grid = np.exp(np.linspace(np.log(0.2), np.log(5.0), 200))
    return float(min(grid, key=lambda t: nll(scale(P, t), y)))


def run(name, texts, gold, protos):
    labels = list(protos)
    y = np.array([labels.index(g) for g in gold])
    P = probs(texts, protos)
    idx = np.arange(len(y))
    train, test = idx % 3 != 0, idx % 3 == 0
    t_train = fit(P[train], y[train])
    raw, cal = measures(P[test], y[test]), measures(scale(P[test], t_train), y[test])
    improved = cal["ece"] < raw["ece"]
    t_all = fit(P, y)
    entry = {"n": int(len(y)), "n_held_out": int(test.sum()), "temperature_fit": round(t_all, 4),
             "held_out_raw": raw, "held_out_calibrated": cal, "drafted_by": "claude", "human_reviewed": False,
             "fit_date": str(date.today())}
    if improved:
        entry["temperature"] = round(t_all, 4)
    return entry, bins(P[test], y[test]), improved, t_train


def report(results):
    out = [f"# Calibration report ({date.today()})", "",
           "Internal (excluded from the public export). Produced by `scripts/calibrate.py`.", "",
           "Labelled sets: `data/calibration/injection.jsonl` and `risk.jsonl`, drafted by Claude, not yet reviewed by a person. "
           "Two thirds of each set fit the temperature; the held-out third produces every number below. "
           "A temperature is applied only when held-out ECE improves. The sets are small, so a difference of a few points is noise.", ""]
    for name, (e, b, improved, t_train) in results.items():
        r, c = e["held_out_raw"], e["held_out_calibrated"]
        out += [f"## {name}", "", f"n {e['n']}, held-out {e['n_held_out']}, temperature fit on the training part {t_train:.3f}, fit on all {e['temperature_fit']}. "
                + ("Applied." if improved else "Not applied: held-out ECE did not improve."), "",
                "| Measure (held-out) | Raw | Calibrated |", "| --- | --- | --- |"]
        out += [f"| {k} | {r[k]:.4f} | {c[k]:.4f} |" for k in ("acc", "ece", "brier", "nll")]
        out += ["", "Reliability, raw confidence (top label):", "", "| Bin | n | Mean confidence | Accuracy |", "| --- | --- | --- | --- |"]
        out += [f"| {lo:.1f} to {hi:.1f} | {n} | {mc:.3f} | {acc:.3f} |" for lo, hi, n, mc, acc in b if n]
        out.append("")
    return "\n".join(out)


def main():
    cal, results = {}, {}
    for name, loader in (("injection", injection), ("risk", risk)):
        texts, gold, protos = loader()
        results[name] = run(name, texts, gold, protos)
        cal[name] = results[name][0]
        print(name, json.dumps({k: cal[name][k] for k in ("n", "temperature_fit", "held_out_raw", "held_out_calibrated")}))
    with open(os.path.join(models.DATA, "calibration.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(cal, f, indent=2)
        f.write("\n")
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "superpowers", "evals", f"{date.today()}-calibration.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(report(results))
    print("wrote", path)


if __name__ == "__main__":
    main()
