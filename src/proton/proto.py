"""Label prototypes on intfloat/e5-base-v2: a label is the mean vector of its examples (or its one
description); a text's probabilities are a softmax over its cosine to each prototype.

e5 cosines sit in a narrow band (about 0.7-0.9), so the softmax runs at a low temperature.
"""
import os
from functools import lru_cache

import numpy as np

from . import models

_DATA = models.data("prototypes.json")
TEXT, EXAMPLE = _DATA["text_prefix"], _DATA["example_prefix"]
TEMP = float(os.environ.get("PROTON_PROTO_TEMP") or _DATA["temperature"])
# fixed heads decide() scores here, keyed by their label set
HEADS = {frozenset(h): h for h in _DATA["heads"].values()}
RISK = _DATA["risk"]


@lru_cache(maxsize=4096)
def _vec(text):
    return models.embed("e5", [text])[0]


def prototype(examples):
    # ponytail: label vectors cached per string (lru 4096); a long-lived server with endless new labels just evicts
    v = np.mean([_vec(EXAMPLE + e) for e in examples], axis=0)
    return v / np.linalg.norm(v)


def similarities(texts, protos):
    """Cosine of each text (rows) to each label prototype (columns)."""
    q = models.embed("e5", [TEXT + str(t) for t in texts])
    return q @ np.stack([prototype(ex if isinstance(ex, (list, tuple)) else [ex]) for ex in protos.values()]).T


def softmax(s, temp=TEMP):
    z = np.exp((s - s.max(-1, keepdims=True)) / temp)
    return z / z.sum(-1, keepdims=True)


def classify(text, protos, temp=TEMP):
    """{label: probability} for one text; protos is {label: [examples]} or {label: description}."""
    return dict(zip(protos, softmax(similarities([text], protos)[0], temp).tolist()))
