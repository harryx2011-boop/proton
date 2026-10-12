"""Task-tool latency over HTTP (:9400) and locate_skill accuracy on a 28-query gold set.

Run: .venv\\Scripts\\python.exe tests\\bench_tools.py   (needs the shared server up and a free-ish GPU)
"""
import json
import os
import statistics
import sys
import time

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "clients", "python"))
from proton_client import Proton  # noqa: E402
from proton.tools import locate_skill as L  # noqa: E402

GOLD = [
    ("write a changelog for the release", {"web-tools"}),
    ("commit these changes and push", {"commit", "caveman-commit"}),
    ("make a promo video with motion graphics", {"video"}),
    ("review my diff for bugs", {"review", "code-reviewer", "requesting-code-review", "caveman-review"}),
    ("fix this stack trace", {"fix", "debugger", "systematic-debugging"}),
    ("find my note about the ports", {"qmd"}),
    ("scrape this web page", {"helix"}),
    ("set up Clerk authentication", {"backend"}),
    ("design a landing page layout", {"frontend", "visual-designer"}),
    ("package the electron app installer", {"desktop"}),
    ("research and compare two libraries with sources", {"deep-research"}),
    ("run the unit tests", {"test", "test-runner"}),
    ("write a pull request description", {"pr-summarizer"}),
    ("turn this into a Word document", {"docx"}),
    ("build an MCP server", {"mcp-builder"}),
    ("make this skill better", {"skill-creator", "writing-skills"}),
    ("plan the implementation steps", {"Plan", "writing-plans"}),
    ("brainstorm feature ideas", {"brainstorming"}),
    ("remember this insight for later", {"save-learning"}),
    ("talk like a caveman to save tokens", {"caveman"}),
    ("threat model for our API", {"threat-modeling-expert"}),
    ("make the react page render faster", {"performance-optimizer"}),
    ("write a regression test for this bug", {"test-writer", "test-driven-development"}),
    ("extract text from a PDF file", {"pdf"}),
    ("build a spreadsheet", {"xlsx"}),
    ("prepare the site for launch with SEO", {"website-production"}),
    ("verify the deploy is live", {"deploy-with-verification"}),
    ("be lazy and write the simplest code", {"ponytail"}),
]


def pct(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]


def main():
    p = Proton()
    p.decide("warm", {"a": ["x", "y"]})

    calls = {
        "decide (2 labels)": lambda: p.decide("What is the capital of France?", {"safety": ["safe", "unsafe"]}),
        "locate_skill": lambda: p.locate_skill("write release notes for this version"),
        "rank (3 texts)": lambda: p.rank(["The cat sat.", "Invoice 4411 is overdue, pay today.", "Lunch at noon."], "urgent request about money"),
        "triage (3 items)": lambda: p.triage(["Refund my charge", "I forgot my password", "Where is my parcel?"], ["refund", "login", "shipping"]),
        "risk": lambda: p.risk("GMAIL_SEND_EMAIL", "to boss@example.com, subject numbers"),
    }
    for name, fn in calls.items():
        fn()
        xs = []
        for _ in range(20):
            s = time.perf_counter()
            fn()
            xs.append((time.perf_counter() - s) * 1000)
        print(f"{name}: p50 {statistics.median(xs):.0f} ms  p95 {pct(xs, .95):.0f} ms  (n=20, over HTTP)", flush=True)

    print(f"pool {len(L.pool(json.loads(L.CATALOG.read_text(encoding='utf-8-sig'))['items']))} items (global, deduped)")
    top1 = top3 = 0
    lat, miss = [], []
    for q, ok in GOLD:
        s = time.perf_counter()
        r = p.locate_skill(q, top_k=3)
        lat.append((time.perf_counter() - s) * 1000)
        names = [x["name"] for x in r["picks"]]
        top1 += names[0] in ok
        top3 += any(n in ok for n in names)
        if names[0] not in ok:
            miss.append((q, names))
    print(f"locate_skill accuracy: top1 {top1}/{len(GOLD)} top3 {top3}/{len(GOLD)} p50 {statistics.median(lat):.0f} ms", flush=True)
    for m in miss:
        print("   miss", m)


if __name__ == "__main__":
    main()
