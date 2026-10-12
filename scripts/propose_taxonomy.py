"""Propose a category and a Lucide icon for every skill/agent in the catalog, using Proton.

Reads  $PROTON_SKILL_CATALOG, else <state>/skill-catalog.json
Writes <state>/skill-taxonomy-proposed.json (machine, keyed by catalog id)
       <state>/skill-taxonomy-proposed.md   (review table for the owner)
<state> is $PROTON_STATE_DIR, else ~/.proton. Set LUCIDE_ICONS_DIR to a lucide-react icons folder to check icon names.
Writes no frontmatter. Needs the shared server on :9400 (python clients/python/proton_client.py).
Resumable: scores are cached in scripts/.taxonomy-cache-v4.json (git-ignored).
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "clients" / "python"))
sys.path.insert(0, str(ROOT / "src"))
from proton_client import Proton  # noqa: E402
from proton.taxonomy import CATEGORIES, ICONS  # noqa: E402

STATE = Path(os.environ.get("PROTON_STATE_DIR") or Path.home() / ".proton")
VIEWS = ("name", "first", "long")
CACHE = Path(__file__).with_name(".taxonomy-cache-v4.json")

LUCIDE_DIRS = [os.environ["LUCIDE_ICONS_DIR"]] if os.environ.get("LUCIDE_ICONS_DIR") else []


def check_icons():
    for d in LUCIDE_DIRS:
        if os.path.isdir(d):
            real = {f[:-3] for f in os.listdir(d) if f.endswith(".js")}
            bad = [i for i in ICONS if i not in real]
            assert not bad, f"not Lucide names: {bad}"
            return len(real)
    print("warning: no lucide-react install found, icon names unchecked", file=sys.stderr)
    return 0


def views(it):
    # three readings of one item, averaged: the bare name, the first sentence (later ones name the other
    # areas it defers to, "Don't use for UI (frontend)") and the longer description
    first = re.split(r"(?<=[a-z0-9\)])\.\s", it["description"], maxsplit=1)[0]
    return {
        "name": it["name"].replace("-", " "),
        "first": f"{it['name']}: {' '.join(first.split()[:40])}",
        "long": f"{it['name']}: {' '.join(it['description'].split()[:70])}",
    }


def calibrate(dists):
    """Divide each label's probability by its mean over the whole catalog, then renormalise.

    The encoder has hub labels (one long label won 70 of 308 items); this is contextual calibration,
    so a label wins only where it beats its own baseline.
    """
    mean = {l: sum(d[l] for d in dists) / len(dists) + 1e-6 for l in dists[0]}

    def adjust(d):
        adj = {l: p / mean[l] for l, p in d.items()}
        z = sum(adj.values())
        return {l: p / z for l, p in adj.items()}

    return adjust


def main():
    n_real = check_icons()
    assert len(CATEGORIES) == len(set(CATEGORIES.values())) and len(ICONS) == len(set(ICONS.values()))
    cat = json.loads(Path(os.environ.get("PROTON_SKILL_CATALOG") or STATE / "skill-catalog.json").read_text(encoding="utf-8"))
    groups = {}
    for it in cat["items"]:
        groups.setdefault((it["kind"], it["name"], it["description"]), []).append(it)
    keys = sorted(groups)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    k_of = lambda k: "\u241f".join(k)  # noqa: E731
    todo = [k for k in keys if any(v not in cache.get(k_of(k), {}) for v in VIEWS)]
    print(f"{len(keys)} unique of {len(cat['items'])} items; {len(todo)} to score; lucide names {n_real}", flush=True)

    heads = {
        "category": {"labels": {v: v for v in CATEGORIES.values()}},
        "icon": {"labels": {v: v for v in ICONS.values()}},
    }
    c_by_label = {v: k for k, v in CATEGORIES.items()}
    i_by_label = {v: k for k, v in ICONS.items()}
    p = Proton()
    for view in ("name", "first", "long"):
        for start in range(0, len(todo), 8):
            chunk = [k for k in todo[start:start + 8] if view not in cache.get(k_of(k), {})]
            if not chunk:
                continue
            res = p.decide_batch([views(groups[k][0])[view] for k in chunk], heads)["results"]
            for k, r in zip(chunk, res):
                d = r["decisions"]
                cache.setdefault(k_of(k), {})[view] = {
                    "category": {c_by_label[l]: round(pr, 5) for l, pr in d["category"]["probabilities"].items()},
                    "icon": {i_by_label[l]: round(pr, 5) for l, pr in d["icon"]["probabilities"].items()},
                }
            CACHE.write_text(json.dumps(cache), encoding="utf-8")
            print(f"  {view} {min(start + 8, len(todo))}/{len(todo)}", flush=True)

    cal = {(v, h): calibrate([cache[k_of(k)][v][h] for k in keys]) for v in VIEWS for h in ("category", "icon")}

    def combine(k, h):
        """Average the per-view calibrated distributions, then take the best label."""
        tot = {}
        for v in VIEWS:
            adj = cal[(v, h)](cache[k_of(k)][v][h])
            for l, pr in adj.items():
                tot[l] = tot.get(l, 0) + pr / len(VIEWS)
        best = max(tot, key=tot.get)
        return best, tot[best]

    machine, rows = {}, []
    for k in keys:
        (c, cs), (i, isc) = combine(k, "category"), combine(k, "icon")
        prop = {"category": c, "categoryScore": round(cs, 3), "icon": i, "iconScore": round(isc, 3)}
        for it in groups[k]:
            machine[it["id"]] = prop
        srcs = {}
        for it in groups[k]:
            s = it["source"] + (":" + it["plugin"] if it.get("plugin") else "")
            if it["source"] == "project":
                s = "project " + Path(it["project"]).name
            srcs[s] = srcs.get(s, 0) + 1
        src = ", ".join(s + (f" x{n}" if n > 1 else "") for s, n in srcs.items())
        rows.append((k[0], k[1], src, prop))

    (STATE / "skill-taxonomy-proposed.json").write_text(json.dumps(machine, indent=1), encoding="utf-8")
    order = {"skill": 0, "agent": 1}
    rows.sort(key=lambda r: (r[3]["category"], order[r[0]], r[1].lower()))
    md = [
        "# Proposed skill and agent taxonomy",
        "",
        f"Proton proposals for {len(keys)} unique skills and agents ({len(cat['items'])} catalog items; clones of the same skill share one row). "
        "Edit any cell, then say which to write: nothing is written to frontmatter until reviewed. "
        f"Categories come from a fixed list of {len(CATEGORIES)}; icons are Lucide names from a fixed shortlist of {len(ICONS)} checked against lucide-react {n_real} icons. "
        "Each item is read three ways (bare name, first sentence, longer description); per way the model's label probabilities are divided by that label's catalog average (the encoder favours a few labels otherwise), then the three are averaged. Score is the averaged probability of the chosen label; below about 0.15 treat the row as a guess.",
        "",
        "Categories: " + ", ".join(CATEGORIES),
        "",
        "| kind | name | source | proposed category | score | proposed icon | score |",
        "|---|---|---|---|---|---|---|",
    ]
    for kind, name, src, pr in rows:
        md.append(f"| {kind} | {name} | {src} | {pr['category']} | {pr['categoryScore']:.2f} | {pr['icon']} | {pr['iconScore']:.2f} |")
    (STATE / "skill-taxonomy-proposed.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("wrote", STATE / "skill-taxonomy-proposed.md", "rows", len(rows))


if __name__ == "__main__":
    main()
