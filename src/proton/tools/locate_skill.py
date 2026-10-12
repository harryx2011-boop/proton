import asyncio
import hashlib
import json
import re
from pathlib import Path

import numpy as np

from .. import models, paths

CATALOG = paths.skill_catalog()
STATE = paths.state_dir()
CFG = models.data("locate.json")
MODEL = CFG["model"]
_FRONT = re.compile(r"\A﻿?---\r?\n.*?\r?\n---\r?\n", re.S)
_cache = {"key": None, "items": [], "vecs": {}, "prior": {}}


def _norm(p):
    return str(p).replace("\\", "/").rstrip("/").lower()


def pool(all_items, kinds=None, project=None):
    """Global items plus the given project's own; clones of one skill collapse to a single entry."""
    proj = _norm(project) if project else None
    out = {}
    for it in all_items:
        if kinds and it["kind"] not in kinds:
            continue
        if it["source"] == "project" and not (proj and (proj == _norm(it["project"]) or proj.startswith(_norm(it["project"]) + "/"))):
            continue
        out.setdefault((it["kind"], it["name"], it["description"]), it)
    return list(out.values())


def doc_for(it):
    """What the bi-encoder sees for an item: name, description, then the body; the tokenizer cuts it at 256 tokens."""
    name = it["invocation"].lstrip("/") + (" agent" if it["kind"] == "agent" else "")
    body = ""
    try:
        body = _FRONT.sub("", Path(it["path"]).read_text(encoding="utf-8", errors="replace"), count=1)
    except (KeyError, OSError, TypeError):
        pass
    return " ".join(f"{name}: {it['description']}\n{body}".split()[:400])


def _load():
    """Catalog items, one vector per distinct item and its prior, cached on disk by catalog mtime plus model id."""
    try:
        m = CATALOG.stat().st_mtime
    except OSError:
        return [], {}, {}
    key = hashlib.sha1(f"{CATALOG}|{m}|{models.MODELS[MODEL]["repo"]}|{json.dumps(CFG, sort_keys=True)}".encode()).hexdigest()[:16]
    if _cache["key"] == key:
        return _cache["items"], _cache["vecs"], _cache["prior"]
    items = json.loads(CATALOG.read_text(encoding="utf-8-sig"))["items"]
    f = STATE / f"locate-vectors-{key}.npz"
    try:
        z = np.load(f)
        ids, mat, pri = z["ids"].tolist(), z["vecs"], z["prior"]
    except (OSError, ValueError, KeyError):
        uniq = {(it["kind"], it["name"], it["description"]): it for it in items}
        ids = [it["id"] for it in uniq.values()]
        mat = models.embed(MODEL, [doc_for(it) for it in uniq.values()])
        pri = (models.embed(MODEL, CFG["generic_tasks"]) @ mat.T).mean(0)
        try:
            STATE.mkdir(parents=True, exist_ok=True)
            for old in STATE.glob("locate-vectors-*.npz"):  # one catalog state at a time
                old.unlink()
            np.savez(f, ids=np.array(ids), vecs=mat, prior=pri)
        except OSError:
            pass
    vecs, prior = dict(zip(ids, mat)), dict(zip(ids, pri.tolist()))
    # clones share the vector of the item kept for their (kind, name, description)
    keep = {}
    for it in items:
        k = (it["kind"], it["name"], it["description"])
        if it["id"] in vecs:
            keep[k] = it["id"]
    for it in items:
        k = (it["kind"], it["name"], it["description"])
        if it["id"] not in vecs and k in keep:
            vecs[it["id"]], prior[it["id"]] = vecs[keep[k]], prior[keep[k]]
    _cache.update(key=key, items=items, vecs=vecs, prior=prior)
    return items, vecs, prior


def run(task, top_k=3, kinds=None, project=None):
    all_items, vecs, prior = _load()
    cand = [it for it in pool(all_items, kinds, project) if it["id"] in vecs]
    if not cand:
        return {"picks": [], "pool": 0, "error": "no catalog at %s" % CATALOG if not CATALOG.exists() else "empty pool"}
    q = models.embed(MODEL, [task])[0]  # bare: the card's query contract has no prefix
    raw = np.stack([vecs[it["id"]] for it in cand]) @ q
    score = raw - np.array([prior[it["id"]] for it in cand])
    best = [i for i in np.argsort(-score)[:top_k] if score[i] >= CFG["floor"]]
    picks = [
        {"id": cand[i]["id"], "kind": cand[i]["kind"], "name": cand[i]["name"], "invocation": cand[i]["invocation"],
         "category": cand[i]["category"], "score": round(float(score[i]), 4), "raw": round(float(raw[i]), 4),
         "description": cand[i]["description"][:200]}
        for i in best
    ]
    return {"picks": picks, "pool": len(cand)}


def register(mcp, decide):
    @mcp.tool()
    async def locate_skill(task: str, top_k: int = 3, kinds: list[str] | None = None, project: str | None = None) -> dict:
        """Find the skills and agents that best fit a task, from the machine's skill catalog.

        task: what the user wants, in their words. top_k: how many picks. kinds: restrict to "skill"
        and/or "agent". project: the working folder; that project's own skills and agents join the
        global ones. Returns picks (invocation, category, score, raw, short description) best first.
        raw is the cosine between the task and the item's name, description and body under
        SKILLRET-Edge-109M; score is raw minus the item's mean cosine over generic task phrases (hub
        correction), so about 0 means no better than a vague request and 0.15 or more is a likely fit. Reads the skill catalog JSON (env PROTON_SKILL_CATALOG, default
        skill-catalog.json in the state folder); regenerate that file to refresh it. The first call after a catalog change embeds the whole catalog once (cached on disk).
        """
        return await asyncio.to_thread(run, task, top_k, kinds, project)
