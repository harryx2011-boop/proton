"""Export Proton's encoders to ONNX, quantise them to dynamic int8 (CPU) and write a MANIFEST.md each.

Run once per machine (needs the export group):  uv sync --group export
  set CUDA_VISIBLE_DEVICES= (CPU only)
  .venv\\Scripts\\python.exe scripts\\export_onnx.py [key ...]     (default: every key in data/models.json)
Each <model dir>/<key>/ ends up self-contained for any ONNX Runtime host (Python or onnxruntime-node):
model.onnx (int8, see quantize()), tokenizer.json, MANIFEST.md.
"""
import os
import shutil
import sys
from pathlib import Path

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import logging  # noqa: E402

import onnx  # noqa: E402
from huggingface_hub import hf_hub_download  # noqa: E402
from onnxruntime.quantization import QuantType, quantize_dynamic  # noqa: E402
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer  # noqa: E402

from proton.models import MODEL_DIR, MODELS  # noqa: E402


def export_embed(spec, out):
    from optimum.exporters.onnx import main_export

    main_export(spec["repo"], output=out, task="feature-extraction", opset=17, do_validation=False)


def export_gliclass(spec, out):
    import torch
    from gliclass import GLiClassModel

    model = GLiClassModel.from_pretrained(spec["repo"]).eval()
    k = spec["max_classes"]

    class Wrap(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, input_ids, attention_mask):
            # max_num_classes is a Python int inside gliclass, so the graph has k class slots; callers slice off the unused ones
            return self.m(input_ids=input_ids, attention_mask=attention_mask, max_num_classes=k, return_dict=True).logits

    tok = hf_hub_download(spec["repo"], "tokenizer.json")
    from tokenizers import Tokenizer

    enc = Tokenizer.from_file(tok).encode(f"{spec['label_token']}travel{spec['label_token']}sport{spec['sep_token']}One day I will see the world!")
    ids = torch.tensor([enc.ids])
    torch.onnx.export(
        Wrap(model), (ids, torch.ones_like(ids)), str(out / "model.onnx"), opset_version=17, dynamo=False,
        input_names=["input_ids", "attention_mask"], output_names=["logits"],
        dynamic_axes={"input_ids": {0: "b", 1: "s"}, "attention_mask": {0: "b", 1: "s"}, "logits": {0: "b"}},
    )
    shutil.copy(tok, out / "tokenizer.json")


EXPORTERS = {"embed": export_embed, "gliclass": export_gliclass}


def quantize(src, dst):
    """int8 without the activation-saturation loss of plain dynamic int8.

    Plain quantize_dynamic (per-tensor u8 activations x s8 weights) flattened GLiClass to near-uniform
    logits on this AVX2 Ryzen 3700X (DeBERTa FFN outliers); fp32 export matched torch exactly. So: MatMul
    weights go to 8-bit blocks of 32 (MatMulNBits, accuracy_level 4 = int8 compute with per-block activation
    scales), then the word-embedding table goes to dynamic int8.
    """
    logging.disable(logging.INFO)
    q = MatMulNBitsQuantizer(str(src), bits=8, block_size=32, is_symmetric=True, accuracy_level=4)
    q.process()
    mid = src.with_name("model.w8.onnx")
    q.model.save_model_to_file(str(mid), False)
    g = onnx.load(mid)
    emb = {n.name for n in g.graph.node if n.op_type == "Gather" and "word_embeddings" in n.name}
    quantize_dynamic(mid, dst, weight_type=QuantType.QInt8, op_types_to_quantize=["Gather"],
                     nodes_to_exclude=[n.name for n in g.graph.node if n.name not in emb])

EMBED_MANIFEST = """# {key}: {repo}

int8 ONNX export of `{repo}` for CPUExecutionProvider: MatMul weights as 8-bit blocks of 32 (`com.microsoft.MatMulNBits`, accuracy_level 4), word embeddings as dynamic int8. Needs ONNX Runtime contrib ops (onnxruntime and onnxruntime-node ship them).

- Files: `model.onnx` ({mb:.0f} MB), `tokenizer.json` (Hugging Face `tokenizers` format, adds [CLS]/[SEP] itself).
- Inputs (int64, shape [batch, seq]): `input_ids`, `attention_mask`{tt}.
- Output: `last_hidden_state` float32 [batch, seq, 768].
- Pooling: {pool}. Then L2-normalise; cosine = dot product.
- Max length: {max_len} tokens (truncate right; pad id 0).
- Prefixes: query `{qp}`, passage `{pp}`.
"""

GLICLASS_MANIFEST = """# gliclass: {repo}

int8 ONNX export of the GLiClass uni-encoder `{repo}` (DeBERTa-v3-base) for CPUExecutionProvider: MatMul weights as 8-bit blocks of 32 (`com.microsoft.MatMulNBits`, accuracy_level 4), word embeddings as dynamic int8. Plain dynamic int8 destroyed this model's logits; this recipe matches fp32 to about 0.1.

- Files: `model.onnx` ({mb:.0f} MB), `tokenizer.json` (`<<LABEL>>` = 128001, `<<SEP>>` = 128002).
- Inputs (int64, shape [batch, seq]): `input_ids`, `attention_mask`.
- Output: `logits` float32 [batch, {k}]; slot i is label i, slots past the label count are padding (ignore them).
- Text format (prompt first): `<<LABEL>>label 1<<LABEL>>label 2...<<SEP>>text`, underscores in labels read as spaces. At most {k} labels.
- Scores: single-label = softmax over the first n logits; multi-label = sigmoid, selected at >= 0.5.
- Max length: {max_len} tokens (truncate right, so the labels survive).
"""


def manifest(key, spec, out):
    mb = (out / "model.onnx").stat().st_size / 2**20
    if spec["kind"] == "gliclass":
        text = GLICLASS_MANIFEST.format(repo=spec["repo"], mb=mb, k=spec["max_classes"], max_len=spec["max_len"])
    else:
        import onnx

        names = [i.name for i in onnx.load(out / "model.onnx", load_external_data=False).graph.input]
        text = EMBED_MANIFEST.format(
            key=key, repo=spec["repo"], mb=mb, max_len=spec["max_len"],
            tt=", `token_type_ids` (all zeros)" if "token_type_ids" in names else "",
            pool="CLS (token 0)" if spec["pooling"] == "cls" else "mean over tokens where attention_mask = 1",
            qp=spec["query_prefix"] or "none (encode bare)", pp=spec["passage_prefix"] or "none (encode bare)",
        )
    (out / "MANIFEST.md").write_text(text, encoding="utf-8")


def main(keys):
    for key in keys:
        spec, out = MODELS[key], MODEL_DIR / key
        out.mkdir(parents=True, exist_ok=True)
        print(f"{key}: exporting {spec['repo']}", flush=True)
        EXPORTERS[spec["kind"]](spec, out)
        quantize(out / "model.onnx", out / "model.int8.onnx")
        for f in out.iterdir():
            if f.name not in ("model.int8.onnx", "tokenizer.json"):
                f.unlink()
        (out / "model.int8.onnx").rename(out / "model.onnx")
        manifest(key, spec, out)
        print(f"{key}: {(out / 'model.onnx').stat().st_size / 2**20:.0f} MB int8", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:] or list(MODELS))
