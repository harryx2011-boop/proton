"""Label prototypes on intfloat/e5-base-v2: a label is the mean vector of its examples (or its one
description); a text's probabilities are a softmax over its cosine to each prototype.

e5 cosines sit in a narrow band (about 0.7-0.9), so the softmax runs at a low temperature.
"""
import os
import threading
from functools import lru_cache

import numpy as np

from . import models

_DATA = models.data("prototypes.json")
TEXT, EXAMPLE = _DATA["text_prefix"], _DATA["example_prefix"]
TEMP = float(os.environ.get("PROTON_PROTO_TEMP") or _DATA["temperature"])
# fixed heads decide() scores here, keyed by their label set
HEADS = {frozenset(h): h for h in _DATA["heads"].values()}
HEAD_NAMES = {frozenset(h): n for n, h in _DATA["heads"].items()}
RISK = _DATA["risk"]


@lru_cache(maxsize=4096)
def _vec(text):
    return models.embed("e5", [text])[0]


def prototype(examples):
    # ponytail: label vectors cached per string (lru 4096); a long-lived server with endless new labels just evicts
    v = np.mean([_vec(EXAMPLE + e) for e in examples], axis=0)
    return v / np.linalg.norm(v)


_Q, _QLOCK = {}, threading.Lock()


def queries(texts):
    """e5 query vectors for texts, one batched run for the ones not seen yet.
    ponytail: cleared at 256 entries instead of an LRU; a miss only costs one more embed."""
    keys = [TEXT + str(t) for t in texts]
    with _QLOCK:
        if len(_Q) > 256:
            _Q.clear()
        miss = list(dict.fromkeys(k for k in keys if k not in _Q))
        if miss:
            _Q.update(zip(miss, models.embed("e5", miss)))
        return np.stack([_Q[k] for k in keys])


def similarities(texts, protos):
    """Cosine of each text (rows) to each label prototype (columns)."""
    q = queries(texts)
    return q @ np.stack([prototype(ex if isinstance(ex, (list, tuple)) else [ex]) for ex in protos.values()]).T


def softmax(s, temp=TEMP):
    z = np.exp((s - s.max(-1, keepdims=True)) / temp)
    return z / z.sum(-1, keepdims=True)


def classify(text, protos, temp=TEMP):
    """{label: probability} for one text; protos is {label: [examples]} or {label: description}."""
    return dict(zip(protos, softmax(similarities([text], protos)[0], temp).tolist()))
