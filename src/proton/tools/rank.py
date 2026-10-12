import asyncio

from .. import proto


def run(texts: list[str], criterion: str):
    s = proto.similarities(texts, {"c": criterion})[:, 0]
    scored = [{"index": i, "text": t, "score": float(s[i])} for i, t in enumerate(texts)]
    return {"ranked": sorted(scored, key=lambda r: r["score"], reverse=True)}


def register(mcp, decide):
    @mcp.tool()
    async def rank(texts: list[str], criterion: str) -> dict:
        """Order texts by how well each fits one criterion, best first.

        criterion is a short phrase ("urgent and needs a reply", "mentions pricing"). Each text gets an
        independent score: the cosine between the text and the criterion (e5-base-v2, about 0.6-0.9).
        Returns {"ranked": [{index, text, score}, ...]} sorted high to low. A relative order, not a probability.
        """
        return await asyncio.to_thread(run, texts, criterion)
