"""Task tools end to end: stdio (own server, fixture catalog) and HTTP (the live :9400 server, real catalog).

Run: .venv\\Scripts\\python.exe tests\\test_tools.py [--no-http]
"""
import asyncio
import json
import os
import sys
import tempfile
import time

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamablehttp_client

URL = os.environ.get("PROTON_URL", "http://127.0.0.1:9400/mcp")
SRC = os.path.join(os.path.dirname(__file__), "..", "src")
sys.path.insert(0, SRC)
from proton.tools.risk import lexical  # noqa: E402

FIXTURE = [
    ("skill", "changelog", "Writes release notes and a changelog from the commits since the last tag."),
    ("skill", "commit", "Stages changes and writes a commit message."),
    ("skill", "frontend", "Builds user interface pages, React components and styling."),
    ("skill", "qmd", "Searches local markdown notes by meaning."),
    ("agent", "test-runner", "Runs the project test suite and reports failures verbatim."),
    ("agent", "debugger", "Diagnoses a failing build or crash and finds the root cause."),
]
TIMES = {}


def fixture_catalog():
    items = [
        {"id": f"{k}:user:{n}", "kind": k, "name": n, "invocation": ("/" + n) if k == "skill" else n,
         "description": d, "source": "user", "path": "x", "category": "General", "icon": "sparkles", "taxonomySource": "default"}
        for k, n, d in FIXTURE
    ]
    f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump({"version": 1, "generatedAt": "now", "items": items}, f)
    f.close()
    return f.name


async def call(s, name, args):
    t = time.perf_counter()
    r = await s.call_tool(name, args)
    TIMES.setdefault(name, []).append((time.perf_counter() - t) * 1000)
    assert not r.isError, r.content
    return json.loads(r.content[0].text)


async def check(s, fixture):
    tools = {t.name for t in (await s.list_tools()).tools}
    assert {"decide", "decide_batch", "locate_skill", "rank", "triage", "risk"} <= tools, tools

    loc = await call(s, "locate_skill", {"task": "write release notes for this version", "top_k": 3})
    assert loc["picks"] and loc["pool"] > 0, loc
    assert all({"id", "invocation", "score", "category"} <= set(p) for p in loc["picks"]), loc
    if fixture:
        assert "/changelog" in [p["invocation"] for p in loc["picks"]], loc
        agents = await call(s, "locate_skill", {"task": "the build crashes, find out why", "top_k": 1, "kinds": ["agent"]})
        assert agents["picks"][0]["kind"] == "agent", agents

    rk = await call(s, "rank", {"texts": ["The cat sat on the mat.", "Invoice 4411 is overdue; please pay today.", "Lunch is at noon."],
                                "criterion": "urgent request about money"})
    assert rk["ranked"][0]["index"] == 1, rk

    tr = await call(s, "triage", {"items": ["Refund my charge please", "I forgot my password", "Where is my parcel?"],
                                  "labels": ["refund", "login", "shipping"]})
    assert [r["label"] for r in tr["results"]] == ["refund", "login", "shipping"], tr
    assert tr["buckets"]["login"] == [1], tr

    for name, args, expect in [
        ("GMAIL_FETCH_EMAILS", "label inbox, max 10", "read"),
        ("GITHUB_CREATE_AN_ISSUE", "repo owner/x, title bug", "write"),
        ("GMAIL_SEND_EMAIL", "to boss@example.com, subject quarterly numbers", "send"),
        ("GOOGLEDRIVE_DELETE_FILE", "file id 1abc, permanent", "destructive"),
    ]:
        out = await call(s, "risk", {"action_name": name, "args_summary": args})
        assert out["risk"] == expect, (name, out)


async def over_stdio():
    cat = fixture_catalog()
    # own state dir: locate_skill caches catalog vectors there and prunes older caches
    env = {**os.environ, "PROTON_SKILL_CATALOG": cat, "PROTON_STATE_DIR": tempfile.mkdtemp(prefix="proton-test-"), "CUDA_VISIBLE_DEVICES": ""}
    p = StdioServerParameters(command=sys.executable, args=["-m", "proton.server"], env=env)
    async with stdio_client(p) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            await check(s, fixture=True)
    os.unlink(cat)


async def over_http():
    async with streamablehttp_client(URL) as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            await check(s, fixture=False)


def unit():
    assert lexical("GMAIL_GET_MESSAGE") is None
    assert lexical("GMAIL_SEND_EMAIL") == "send"
    assert lexical("DROPBOX_DELETE_FILE") == "destructive"
    assert lexical("NOTION_UPDATE_PAGE") == "write"
    assert lexical("SLACK_LIST_CHANNELS") is None


unit()
asyncio.run(over_stdio())
print("stdio PASS")
if "--no-http" not in sys.argv:
    asyncio.run(over_http())
    print("http PASS")
print("p50 ms per tool (this run):", {k: round(sorted(v)[len(v) // 2]) for k, v in TIMES.items()})
print("PASS")
