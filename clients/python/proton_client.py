"""Stdlib-only client for the shared Proton MCP server (streamable HTTP, JSON-RPC).

    from proton_client import Proton
    p = Proton()
    p.decide("text", {"intent": ["a", "b"]})
    p.locate_skill("write a changelog")

Run this file for a smoke check against $PROTON_URL (default http://127.0.0.1:9400/mcp).
"""
import json
import os
import urllib.request

URL = os.environ.get("PROTON_URL", "http://127.0.0.1:9400/mcp")
PROTOCOL = "2025-06-18"


class ProtonError(RuntimeError):
    pass


def _parse(body: str) -> dict:
    body = body.strip()
    if body.startswith("{"):
        return json.loads(body)
    for line in body.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    raise ProtonError(f"unparseable response: {body[:200]}")


class Proton:
    def __init__(self, url: str = URL, timeout: float = 300.0):
        self.url, self.timeout, self.session, self._id = url, timeout, None, 0
        self._rpc("initialize", {
            "protocolVersion": PROTOCOL,
            "capabilities": {},
            "clientInfo": {"name": "proton-client-py", "version": "1.0.0"},
        })
        self._post({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def _post(self, payload: dict):
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.session:
            headers["Mcp-Session-Id"] = self.session
            headers["MCP-Protocol-Version"] = PROTOCOL
        req = urllib.request.Request(self.url, json.dumps(payload).encode(), headers, method="POST")
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            self.session = r.headers.get("Mcp-Session-Id") or self.session
            return r.read().decode("utf-8")

    def _rpc(self, method: str, params: dict) -> dict:
        self._id += 1
        msg = _parse(self._post({"jsonrpc": "2.0", "id": self._id, "method": method, "params": params}))
        if "error" in msg:
            raise ProtonError(msg["error"])
        return msg["result"]

    def list_tools(self) -> list[str]:
        return [t["name"] for t in self._rpc("tools/list", {})["tools"]]

    def call(self, name: str, **args):
        res = self._rpc("tools/call", {"name": name, "arguments": args})
        text = res["content"][0]["text"] if res.get("content") else "null"
        if res.get("isError"):
            raise ProtonError(text)
        return json.loads(text)

    def decide(self, text, heads, rules=None):
        return self.call("decide", text=text, heads=heads, **({"rules": rules} if rules else {}))

    def decide_batch(self, texts, heads, rules=None):
        return self.call("decide_batch", texts=texts, heads=heads, **({"rules": rules} if rules else {}))

    def locate_skill(self, task, top_k=3, kinds=None, project=None):
        a = {"task": task, "top_k": top_k}
        if kinds:
            a["kinds"] = kinds
        if project:
            a["project"] = project
        return self.call("locate_skill", **a)

    def rank(self, texts, criterion):
        return self.call("rank", texts=texts, criterion=criterion)

    def triage(self, items, labels):
        return self.call("triage", items=items, labels=labels)

    def risk(self, action_name, args_summary=""):
        return self.call("risk", action_name=action_name, args_summary=args_summary)


if __name__ == "__main__":
    p = Proton()
    tools = p.list_tools()
    print("tools:", tools)
    assert "decide" in tools
    out = p.decide("What is the capital of France?", {"safety": ["safe", "unsafe"]})
    assert out["decisions"]["safety"]["label"] == "safe", out
    print("PASS")
