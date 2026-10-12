import asyncio
import re

from .. import proto

CLASSES = proto.RISK
ORDER = list(CLASSES)
# a model score is not a guard: a name that plainly says it mutates can never come back as read
_VERBS = {
    "destructive": r"delete|remove|destroy|drop|purge|revoke|cancel|archive|wipe|erase|truncate|reset|terminate|unsubscribe",
    "send": r"send|reply|forward|post|publish|invite|share|broadcast|notify|tweet|dm",
    "write": r"create|add|update|edit|set|put|patch|insert|move|rename|upload|write|append|assign|merge|commit|push|deploy|install|import|submit|complete|mark|close|open|schedule",
}
_READ = r"get|list|search|find|fetch|read|view|show|check|count|lookup|query|retrieve|describe|download|export|preview|resolve|whoami|status"


def lexical(action_name: str):
    toks = [t.lower() for t in re.split(r"[^A-Za-z]+|(?<=[a-z])(?=[A-Z])", action_name) if t]
    # the first verb decides: GMAIL_GET_MESSAGE reads, GMAIL_SEND_EMAIL sends
    for t in toks:
        if re.fullmatch(_READ, t):
            return None
        for cls in ("destructive", "send", "write"):
            if re.fullmatch(_VERBS[cls], t):
                return cls
    return None


def run(action_name: str, args_summary: str):
    text = f"{action_name} {args_summary}".replace("_", " ").replace("-", " ")
    p = proto.classify(text, CLASSES)
    label = max(p, key=p.get)
    score = p[label]
    floor, source = lexical(action_name), "model"
    if floor and ORDER.index(floor) > ORDER.index(label):
        label, source = floor, "lexical"
    return {"risk": label, "score": score, "source": source, "ranked": sorted(p.items(), key=lambda kv: kv[1], reverse=True)}


def register(mcp, decide):
    @mcp.tool()
    async def risk(action_name: str, args_summary: str = "") -> dict:
        """Classify a tool action as read, write, send or destructive (for a PreToolUse guard).

        action_name is the tool or action id (e.g. GMAIL_SEND_EMAIL); args_summary is a short line of
        its arguments. A model verdict is raised, never lowered, when the name carries a mutating verb
        (source: "lexical"). Anything above read should ask the user.
        """
        return await asyncio.to_thread(run, action_name, args_summary)
