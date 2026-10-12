import asyncio
import os
import sys
import threading
from io import TextIOWrapper

import anyio

os.environ.setdefault("PYTHONUTF8", "1")

from mcp.server.fastmcp import FastMCP
from mcp.server.stdio import stdio_server

from proton import identity, models
from proton.decide import decide as _decide

mcp = FastMCP("proton")


def _warm(preload):
    # off the event loop so `initialize` answers at once. The shared HTTP server also loads every model and
    # embeds the skill catalog up front: the hooks give a call 1.5 s, and a catalog embed takes minutes on a busy CPU
    import onnxruntime  # noqa: F401
    import tokenizers  # noqa: F401

    if preload:
        for key in models.MODELS:
            models.load(key)
        locate_skill._load()


@mcp.tool()
async def decide(text: str, heads: dict, rules: list[dict] | None = None) -> dict:
    """Make typed decisions about text with small local CPU encoders (no generation).

    heads: {name: [labels]} for single-label, or {name: {"labels": [...] or {label: description},
    "multi_label": true}}. Fixed hook heads (injection, complexity) use e5-base-v2 prototypes; any other
    head uses GLiClass (at most 100 labels per head). rules: optional cross-head constraints, each
    {"implies": ["head=label", "head=label"]}, {"excludes": [...]}, {"iff": [...]}, or a raw dict
    ({"type": "Implies"|"Iff"|"Excludes"|"And"|"Or"|"Not"|"LabelRef", ...}). The answer is the best
    joint assignment over each head's top labels that satisfies every rule; `feasible` says whether one existed.
    Not a reasoner: it cannot explain or answer open questions.
    """
    return await asyncio.to_thread(_decide, text, heads, rules)


@mcp.tool()
async def decide_batch(texts: list[str], heads: dict, rules: list[dict] | None = None) -> dict:
    """decide() over many texts with one schema; returns {"results": [decide() output, ...]} in input order."""
    return {"results": await asyncio.to_thread(lambda: [_decide(t, heads, rules) for t in texts])}


from proton.tools import locate_skill, rank, risk, triage  # noqa: E402

locate_skill.register(mcp, _decide)
rank.register(mcp, _decide)
triage.register(mcp, _decide)
risk.register(mcp, _decide)


async def serve(out):
    async with stdio_server(stdout=out) as (r, w):
        await mcp._mcp_server.run(r, w, mcp._mcp_server.create_initialization_options())


def main():
    http = "--http" in sys.argv
    threading.Thread(target=_warm, args=(http or os.environ.get("PROTON_PRELOAD") == "1",), daemon=True).start()
    if http:
        identity.announce(sys.argv[sys.argv.index("--role") + 1] if "--role" in sys.argv else "shared")
        mcp.settings.host = "127.0.0.1"
        mcp.settings.port = int(os.environ.get("PROTON_PORT", "9400"))
        mcp.run(transport="streamable-http")
        return
    # take the real stdout for the MCP channel, then point sys.stdout at stderr so a library print can
    # never corrupt it; FastMCP.run() would grab sys.stdout late
    out = anyio.wrap_file(TextIOWrapper(sys.stdout.buffer, encoding="utf-8"))
    sys.stdout = sys.stderr
    anyio.run(serve, out)


if __name__ == "__main__":
    main()
