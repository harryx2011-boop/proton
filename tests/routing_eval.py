"""Three-arm routing eval on the 28-task gold set, plus the label-order permutation test.

Arms (the agent is a local Ollama model; Proton alone is shown as a reference row):
  baseline    the model picks from the skill list with no hint
  suggestion  the same prompt plus Proton's top-3 as a hint
  oracle      the same prompt plus the gold names as the hint (the ceiling for "a hint helps")
Writes fixtures/routing/<date>.json (every pick, catalog hash, models) and docs/superpowers/evals/<date>-routing.md.

Run: .venv\\Scripts\\python.exe tests\\routing_eval.py [--model qwen3.5:2b] [--url http://127.0.0.1:9400/mcp]
Needs a running Proton server with a skill catalog and Ollama with the model. Heavy: pause it while gaming.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, "clients", "python"))
import routing_lib as R  # noqa: E402
from proton_client import Proton  # noqa: E402

OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
PERM_TEXTS = [
    "My card was charged twice for one order", "I cannot log in after resetting my password", "Where is my parcel, it is late",
    "Please cancel my subscription", "The app crashes when I upload a photo", "Do you ship to Canada",
    "I want my money back for the broken lamp", "How do I change my email address", "The tracking page shows no updates",
    "Your site shows an error when I pay", "Can I speak to a manager", "I was billed after I cancelled",
    "The reset email never arrives", "My package arrived damaged", "The checkout button does nothing",
    "How long does delivery take", "I cannot find my invoice", "Add a second user to my account",
    "The video will not play on my phone", "Send me a copy of my receipt",
]
PERM_LABELS = ["billing_problem", "login_problem", "shipping_question", "technical_bug", "account_change"]


def words(s, n=14):
    return " ".join((s or "").split()[:n])


class ProtonAdapter:
    name = "proton"

    def __init__(self, p):
        self.p = p

    def route(self, task, catalog):
        return [x["name"] for x in self.p.locate_skill(task, top_k=3)["picks"]]


class OllamaAdapter:
    """qwen3.5:2b over /api/chat, JSON out, temperature 0, thinking off; hint_fn(task) -> names or None."""

    def __init__(self, model, name, hint_fn=None):
        self.model, self.name, self.hint_fn = model, name, hint_fn

    def prompt(self, task, catalog):
        hint = self.hint_fn(task) if self.hint_fn else None
        lines = [f"You route a task to skills. Pick the three skills that best fit the task, best first.", "", "Skills:"]
        lines += [f"- {n}: {d}" for n, d in sorted(catalog.items())]
        lines += ["", "Task:", task, ""]
        if hint:
            lines += [f"A routing tool suggests, best first: {', '.join(hint)}.", ""]
        lines.append('Answer with JSON only: {"picks": ["name1", "name2", "name3"]}. Use names exactly as written above.')
        return "\n".join(lines)

    def route(self, task, catalog):
        body = json.dumps({"model": self.model, "messages": [{"role": "user", "content": self.prompt(task, catalog)}],
                           "stream": False, "think": False, "format": "json", "options": {"temperature": 0, "num_predict": 200}}).encode()
        req = urllib.request.Request(f"{OLLAMA}/api/chat", body, {"Content-Type": "application/json"})
        for attempt in (1, 2):
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    text = json.load(r)["message"]["content"]
                break
            except urllib.error.HTTPError as e:
                if attempt == 2:
                    raise RuntimeError(f"ollama {e.code}: {e.read()[:300]!r}") from e
        try:
            picks = json.loads(text).get("picks", [])
        except (ValueError, AttributeError):
            return []
        return [x for x in picks if isinstance(x, str) and x in catalog]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen3.5:2b")
    ap.add_argument("--url", default="http://127.0.0.1:9400/mcp")
    a = ap.parse_args()
    gold = json.load(open(os.path.join(ROOT, "web", "fixtures", "routing-gold.json"), encoding="utf-8"))["tasks"]
    p = Proton(a.url)
    catalog = {}
    for g in gold:
        for x in p.locate_skill(g["query"], top_k=100)["picks"]:
            catalog.setdefault(x["name"], words(x.get("description")))
    gold_map = {g["query"]: g["accept"] for g in gold}
    proton = ProtonAdapter(p)
    adapters = [
        proton,
        OllamaAdapter(a.model, "baseline"),
        OllamaAdapter(a.model, "suggestion", lambda t: proton.route(t, catalog)),
        OllamaAdapter(a.model, "oracle", lambda t: gold_map[t]),
    ]
    rows = {ad.name: R.run_arm(ad, gold, catalog) for ad in adapters}
    out = []
    for metric in ("top1", "top3"):
        arms = {n: [r[metric] for r in rs] for n, rs in rows.items()}
        stats, pairs = R.compare(arms)
        out.append((metric, stats, pairs, R.disagreements({n: arms[n] for n in ("baseline", "suggestion", "oracle")}, [g["query"] for g in gold])))

    def classify(text, labels):
        from proton.decide import decide
        return decide(text, {"intent": labels})["decisions"]["intent"]["label"]

    sys.path.insert(0, os.path.join(ROOT, "src"))
    rate, per = R.permutation_agreement(classify, PERM_TEXTS, PERM_LABELS)

    today = str(date.today())
    os.makedirs(os.path.join(ROOT, "fixtures", "routing"), exist_ok=True)
    R.write_snapshot(os.path.join(ROOT, "fixtures", "routing", f"{today}.json"),
                     {"date": today, "model": a.model, "proton_url": a.url, "catalog_hash": R.catalog_hash(catalog), "catalog_size": len(catalog),
                      "tasks": len(gold), "permutation": {"agreement": rate, "per_text": per, "orders_per_text": 6}}, rows)
    md = [f"# Routing eval ({today})", "", "Internal (excluded from the public export). `tests/routing_eval.py`.", "",
          f"Agent: {a.model} through Ollama, temperature 0, thinking off. Catalog: {len(catalog)} skills (hash {R.catalog_hash(catalog)}), "
          f"the skills Proton's pool returns for the {len(gold)} gold tasks. Intervals are 95% Wilson. "
          "With 28 tasks an interval is wide: a difference counts only when the intervals do not overlap.", ""]
    for metric, stats, pairs, dis in out:
        md += [f"## {metric}", "", "| Arm | Hits | Accuracy | 95% interval |", "| --- | --- | --- | --- |"]
        md += [f"| {n} | {s['k']}/{s['n']} | {s['acc']:.3f} | {s['ci'][0]:.3f} to {s['ci'][1]:.3f} |" for n, s in stats.items()]
        md += ["", "Pairs: " + "; ".join(f"{x['a']} vs {x['b']}: {'different' if x['significant'] else 'not significant'}" for x in pairs), ""]
        if dis:
            md += [f"Cases where the three agent arms disagree ({metric}):", "", "| Task | baseline | suggestion | oracle |", "| --- | --- | --- | --- |"]
            md += [f"| {d['case']} | {d['baseline']} | {d['suggestion']} | {d['oracle']} |" for d in dis]
            md.append("")
    md += ["## Label-order permutation test (GLiClass head)", "",
           f"{len(PERM_TEXTS)} texts, 5 labels, 6 random label orders per text. The answer matched the original order in {rate:.1%} of cases. "
           f"Texts below 80%: {sum(1 for x in per if x < 0.8)} of {len(per)}.", ""]
    path = os.path.join(ROOT, "docs", "superpowers", "evals", f"{today}-routing.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write("\n".join(md))
    print("\n".join(md))


if __name__ == "__main__":
    main()
