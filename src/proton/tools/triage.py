import asyncio

from .. import proto


def run(items: list[str], labels):
    protos = dict(labels) if isinstance(labels, dict) else {str(x): str(x).replace("_", " ") for x in labels}
    p = proto.softmax(proto.similarities(items, protos))
    names = list(protos)
    out = []
    for i, (item, row) in enumerate(zip(items, p)):
        r = sorted(zip(names, row.tolist()), key=lambda kv: kv[1], reverse=True)
        out.append({"index": i, "item": item, "label": r[0][0], "score": r[0][1], "ranked": r[:3]})
    return {"results": out, "buckets": {n: [r["index"] for r in out if r["label"] == n] for n in names}}


def register(mcp, decide):
    @mcp.tool()
    async def triage(items: list[str], labels: list[str] | dict[str, str]) -> dict:
        """Sort items into fixed buckets, one label each.

        labels: a list of bucket names, or {bucket: short description} (descriptions sharpen the call).
        Returns results (index, item, label, score, top-3 ranked) in input order, and buckets mapping
        each label to the indexes of its items.
        """
        return await asyncio.to_thread(run, items, labels)
