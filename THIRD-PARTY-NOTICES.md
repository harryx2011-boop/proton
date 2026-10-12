# Third-Party Notices

Proton uses the models and software listed below. Each remains under its own licence and belongs to its authors. The licence texts are in each project's own repository or package.

## Models

Proton runs three open models. The ONNX files that Proton downloads or bundles are converted and int8-quantised copies of the original weights. They are modified versions of the originals, produced by `scripts/export_onnx.py`.

| Model | Author | Licence | Used for | Source |
|---|---|---|---|---|
| SKILLRET-Edge-109M | ThakiCloud | Apache-2.0 | `locate_skill` | <https://huggingface.co/ThakiCloud/SKILLRET-Edge-109M> |
| e5-base-v2 | intfloat | MIT | injection and complexity heads, `risk`, `triage`, `rank` | <https://huggingface.co/intfloat/e5-base-v2> |
| gliclass-base-v3.0 | knowledgator | Apache-2.0 | every other `decide` head | <https://huggingface.co/knowledgator/gliclass-base-v3.0> |

SKILLRET-Edge-109M states that its licence is inherited from its base model, Snowflake/snowflake-arctic-embed-m.

Licence texts: Apache License 2.0 at <https://www.apache.org/licenses/LICENSE-2.0>; MIT License at <https://opensource.org/license/mit>. Each model card on Hugging Face carries the copyright notice of its authors.

## Runtime Dependencies: Python

Direct dependencies from `pyproject.toml`, with the versions pinned in `uv.lock`.

| Package | Version | Licence |
|---|---|---|
| mcp | 1.30.0 | MIT |
| numpy | 2.5.3 | BSD-3-Clause, 0BSD, MIT, Zlib and CC0-1.0 (as declared by the package) |
| onnxruntime | 1.30.0 | MIT |
| tokenizers | 0.22.2 | Apache-2.0 |
| huggingface-hub | 0.36.2 | Apache-2.0 |
| psutil | 7.2.2 | BSD-3-Clause |

Notable transitive dependencies: starlette, uvicorn, httpx, sse-starlette and idna (BSD-3-Clause); pydantic, anyio, pyjwt, jsonschema and urllib3 (MIT); python-multipart and requests (Apache-2.0); cryptography (Apache-2.0 or BSD-3-Clause); certifi and tqdm (MPL-2.0, file-level copyleft, used unmodified as dependencies); pywin32 (PSF).

The `export` dependency group (torch, transformers, optimum, gliclass, onnx) is used only by `scripts/export_onnx.py` and is not part of the running server.

## Runtime Dependencies: npm

Direct dependencies of the VS Code extension (`vscode/package.json`), versions as resolved in `vscode/package-lock.json`.

| Package | Version | Licence |
|---|---|---|
| @modelcontextprotocol/sdk | 1.32.1 | MIT |
| onnxruntime-node | 1.30.0 | MIT |
| @huggingface/tokenizers | 0.2.0 | Apache-2.0 |
| zod | 3.25.76 | MIT |

The production dependency tree holds 109 entries in the lock file: MIT 95, ISC 8, BSD-3-Clause 3, BSD-2-Clause 1, Apache-2.0 1, and one dual-licensed (MIT or CC0-1.0). The extension bundles its dependencies into the packaged `.vsix`. This includes the ONNX Runtime native libraries for Windows x64 (the `onnxruntime-node` 1.30.0 binaries, without the DirectML provider), which are licensed under the MIT License, the same licence as the `onnxruntime` and `onnxruntime-node` packages above.

Development tools such as `@vscode/vsce`, `esbuild`, `typescript` and `@resvg/resvg-js` are used to build the extension and are not shipped.
