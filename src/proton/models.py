"""ONNX Runtime int8 sessions for Proton's encoders. The model table is data/models.json.

Files live in MODEL_DIR/<key>/ (model.onnx, tokenizer.json, MANIFEST.md), written by scripts/export_onnx.py.
"""
import json
import os
import threading
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).resolve().parent / "data"
MODEL_DIR = Path(os.environ.get("PROTON_MODEL_DIR") or ROOT / ".onnx")
MODELS = {k: v for k, v in json.loads((DATA / "models.json").read_text(encoding="utf-8")).items() if not k.startswith("_")}

_lock = threading.Lock()
_loaded = {}


def data(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def load(key):
    """(session, tokenizer, spec) for a model, loaded once."""
    with _lock:
        if key not in _loaded:
            import onnxruntime as ort
            from tokenizers import Tokenizer

            spec, d = MODELS[key], MODEL_DIR / key
            if not (d / "model.onnx").exists():
                raise FileNotFoundError(f"{d / 'model.onnx'} missing: run scripts/export_onnx.py")
            so = ort.SessionOptions()
            # the arena keeps the peak block for every input shape seen; off keeps memory flat under varied lengths
            so.enable_cpu_mem_arena = False
            so.intra_op_num_threads = int(os.environ.get("PROTON_THREADS", "4"))
            sess = ort.InferenceSession(str(d / "model.onnx"), so, providers=["CPUExecutionProvider"])
            tok = Tokenizer.from_file(str(d / "tokenizer.json"))
            tok.enable_truncation(spec["max_len"])
            tok.enable_padding(pad_id=tok.token_to_id("[PAD]") or 0)
            _loaded[key] = (sess, tok, spec)
        return _loaded[key]


def _feed(sess, enc):
    ids = np.array([e.ids for e in enc], dtype=np.int64)
    mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
    feed = {"input_ids": ids, "attention_mask": mask}
    if "token_type_ids" in {i.name for i in sess.get_inputs()}:
        feed["token_type_ids"] = np.zeros_like(ids)
    return feed, mask


def embed(key, texts, batch=16):
    """L2-normalised sentence vectors, shape (len(texts), dim). Callers add the model's prefixes."""
    sess, tok, spec = load(key)
    out = []
    for i in range(0, len(texts), batch):
        feed, mask = _feed(sess, tok.encode_batch(list(texts[i:i + batch])))
        h = sess.run(None, feed)[0]
        if spec["pooling"] == "cls":
            v = h[:, 0]
        else:
            m = mask[..., None].astype(h.dtype)
            v = (h * m).sum(1) / np.maximum(m.sum(1), 1e-9)
        out.append(v / np.linalg.norm(v, axis=1, keepdims=True))
    return np.concatenate(out) if out else np.zeros((0, 768), dtype=np.float32)


def gliclass_logits(text, labels):
    """GLiClass uni-encoder logits for one text over its labels (prompt first: <<LABEL>>a<<LABEL>>b<<SEP>>text)."""
    sess, tok, spec = load("gliclass")
    if len(labels) > spec["max_classes"]:
        raise ValueError(f"at most {spec['max_classes']} labels per head (got {len(labels)})")
    if spec["label_underscores_to_spaces"]:
        labels = [l.replace("_", " ") for l in labels]
    prompt = "".join(spec["label_token"] + l for l in labels) + spec["sep_token"]
    feed, _ = _feed(sess, [tok.encode(prompt + text if spec["prompt_first"] else text + prompt)])
    return sess.run(None, feed)[0][0, : len(labels)]
