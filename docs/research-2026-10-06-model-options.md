# Proton model options (research, 2026-10-06)

## Decision (the owner, 2026-10-06)

Full swap. Prompt Guard 2 was first accepted, then dropped the same day ("dont ship prompt guard 2"). Injection runs on e5-base-v2, using example prototypes for "normal documentation" and "hidden instructions to an AI". It must at least match today's GLiNER injection sample before it ships. No gated model and no Hugging Face login are needed.

Build plan, for a fresh session working in a worktree off `main`:

1. Add `onnxruntime` and `optimum[onnxruntime]` with `uv`. Export each model to ONNX with dynamic int8 quantisation. Use `CPUExecutionProvider` with `enable_cpu_mem_arena=False`.
2. Put one module per model behind the existing tool registry (`tools/*.register`):
   - `locate_skill`: SkillRet-Edge-109M with catalog vectors cached by catalog mtime, embedding the skill body up to 256 tokens and a cosine floor;
   - `injection`, `risk`, `triage`, `rank`, complexity: e5-base-v2 prototypes;
   - `decide` and `decide_batch`: gliclass-base-v3.0 plus a post-hoc rule check.
3. Gate the switch against the current model: the 28-query locate gold set, `tests/bench_tools.py`, the injection sample in `context.md`, `tests/test_tools.py` and `tests/test_mcp.py`. Record p50 latency and private RAM against today's figures.
4. Drop torch, gliner2 and most of `guard-wip`, keeping the pid file and `--role`.
5. Do not start the shared :9400 server while the off flag file (`.proton-off`) exists. Benchmark in-process.

All four models in the plan are ungated.

The owner asked whether a more efficient, more accurate model can replace GLiNER2.5-Decide. A research agent compiled this from model cards and papers. Nothing here was measured on this PC; every latency and accuracy figure is the source's own.

## Recommendation: three small task models on CPU (ONNX Runtime int8), no torch

| Workload | Model | Size, licence | Cited evidence |
|---|---|---|---|
| locate_skill | ThakiCloud/SKILLRET-Edge-109M bi-encoder: precomputed catalog vectors, cosine top-k, floor about 0.30 | 109.5M, Apache-2.0 | NDCG@10 79.18 on SkillRet (its 0.6B teacher 78.48; Qwen3-Embedding-0.6B 61.94). int8 loses nothing. https://huggingface.co/ThakiCloud/SKILLRET-Edge-109M, https://arxiv.org/abs/2605.05726 |
| injection | meta-llama/Llama-Prompt-Guard-2-22M, 512-token windows | 22M backbone; Llama 4 Community licence, gated | AUC .995, recall 88.7% at 1% FPR; AgentDojo 78.4% attack prevention, against 22.2% for ProtectAI. https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-22M |
| risk, triage, complexity | intfloat/e5-base-v2 label prototypes, then SetFit heads on the owner's labels; risk keeps its verb lexicon in front | 110M, MIT | BTZSC zero-shot macro F1 0.60, against 0.59 for deberta-v3-large-NLI. https://arxiv.org/abs/2603.11991 |
| rank | e5 cosine; add gte-reranker-modernbert-base only if needed | 149.6M, Apache-2.0 | BTZSC F1 0.58 |
| generic decide | knowledgator/gliclass-base-v3.0, rules checked after scoring | 187M, Apache-2.0 | Average F1 0.656, against 0.682 for deberta-v3-large-zeroshot, at about 8x the throughput |

Design notes for locate_skill:
- Encode each skill's body, not 8 description words: dropping the body cost 29-44 pp (https://arxiv.org/abs/2603.22455).
- Skip a reranker: +1.3 NDCG for about 0.8 s.
- Encode queries bare, as the card says: a prefix mismatch swung 8.8 pp.

## Expected effect (estimates)

| | Today (measured) | Proposed (estimate) |
|---|---|---|
| VRAM | 1.9 GB, near 7 GB at peak | 0 |
| Private RAM | 4.5 GB on CPU; 6.4-11.9 GB on GPU | about 0.5-1 GB |
| locate_skill | 527 ms warm | under 50 ms |

The torch CUDA allocator leak goes away, and with it most of `guard-wip`.

## Rejected

- Sentinel v2: 596M, Elastic licence, self-reported F1.
- ProtectAI v2: weak on over-defense, under 60% on NotInject.
- NeuralTrust OSS small: its card excludes web and tool text.
- gliclass-edge: 0.49 F1.
- Qwen3 / SkillRet 0.6B rerankers: too slow for the gain.
- EmbeddingGemma: gated licence, and not in SkillRet.

## Unknowns

- No figure was measured here. The gates are the 28-query locate gold set and `tests/bench_tools.py`.
- SkillRet was trained on public GitHub skills; the owner's own agents may differ.
- Prompt Guard 2 catches explicit override attempts; quiet exfiltration may pass. Build a local labelled set from Helix scrapes.
- The loss from ORT dynamic int8 on these exact models is unmeasured.
- The Prompt Guard licence is the owner's call.
- GLiClass has no rule decoding; it needs a few lines of post-hoc checks.

## Results (measured 2026-10-06, branch `onnx-swap`, a separate git worktree)

CPU only (`CUDA_VISIBLE_DEVICES=""`, `CPUExecutionProvider`), an 8-core desktop Ryzen CPU, while another session ran a GPU render (CPU load about 88%), so latencies are on a busy machine. "Before" figures are the recorded GLiNER2.5-Decide numbers from `context.md` (GPU fp32 unless marked); GLiNER was not re-run.

| Gate | GLiNER2.5-Decide (before) | ONNX swap (after) |
|---|---|---|
| `tests/test_tools.py --no-http` | PASS | PASS (stdio), and http PASS against a dev server on :9413 |
| `tests/test_mcp.py` | PASS | PASS |
| locate gold set (28 queries, `tests/bench_tools.py`) | top-1 19/28, top-3 24/28 | top-1 24/28, top-3 27/28 |
| Injection sample (6 texts, flag at >= 0.8) | real injections 0.88 and 0.97; docs up to about 0.6 | real injections 0.975 and 0.893; docs 0.057-0.312: PASS |
| `decide`, 1 head, over HTTP p50 | 74 ms (GPU); about 1.3 s (CPU) | 51 ms |
| `locate_skill` over HTTP p50 | 527 ms (GPU) | 22 ms |
| `rank` (3 texts) over HTTP p50 | 186 ms | 90 ms |
| `triage` (3 items) over HTTP p50 | 177 ms | 52 ms |
| `risk` over HTTP p50 | 71 ms | 35 ms |
| Server private commit | 4.5 GB CPU; 6.4 GB GPU baseline, grew to 11.9 GB | 1.25 GB, flat over 200 `locate_skill` and 200 mixed calls |
| Server RSS | 2.7 GB CPU; 1.4 GB GPU (+1.9 GB VRAM) | 0.76 GB, no VRAM |
| Model files | 1.9 GB | 490 MB (skillret 116 MB, e5 116 MB, gliclass 248 MB, plus tokenizers) |

In-process warm p50 (`tests/bench_inproc.py`, n=20, final export with 100 GLiClass label slots): GLiClass `decide` 41 ms, injection head 52 ms, complexity head 26 ms, `locate_skill` 19 ms, `rank` 85 ms, `triage` 49 ms, `risk` 32 ms; private 1.22 GB, RSS 0.73 GB with all three models loaded. The HTTP rows above ran with the 50-slot GLiClass export. The first `locate_skill` after a catalog change embeds the catalog: 155 s for 310 items on the busy CPU, then cached on disk; the shared HTTP server does this at start.

What changed against the plan:

- **Quantisation.** Plain `quantize_dynamic` int8 flattened GLiClass to near-uniform logits (fp32 ONNX matched torch to 0.01; int8 gave [-1.49, -1.23] for [-4.01, 4.56]). Per-tensor u8 activations through DeBERTa's FFN outliers, on an AVX2 CPU without VNNI, is the likely cause: quantising only the attention projections kept it intact, quantising any FFN broke it, and `reduce_range` and per-channel did not fix it. All three models now use 8-bit weight-only blocks (`MatMulNBits`, block 32, `accuracy_level` 4) plus a dynamic int8 word-embedding table: GLiClass logits within about 0.1 of fp32, 248 MB, 64 ms per call.
- **locate_skill hub correction.** Raw SkillRet cosine over name, description and body put generic built-in agents (`Plan`, `claude-code-guide`) first: top-1 6/28. Subtracting each item's mean cosine over 12 generic task phrases fixed it (24/28). Description-only, stripped "Don't use for" clauses and first-sentence docs all scored 23-25/28 with the correction, so the body stays in.
- **Prefixes.** e5's card prescribes `query: ` for classification features; on the injection sample `query: ` on both sides gave the widest margin (0.55 at temperature 0.02) of the three prefix pairings tried, all of which passed.
- **Score scale.** `locate_skill` `score` is now cosine minus the item's prior (about -0.05 to 0.35); the hook bar moved from 0.10 to 0.12 (gold set: keeps 23/24 correct top-1 picks, 1 of 4 wrong ones, fires on 1 of 10 no-fit prompts).
- Model data lives in `src/proton/data/*.json` (model table, prototype texts, locate settings) and each model folder carries a `MANIFEST.md`, so a TypeScript port on `onnxruntime-node` can read the same values.

## VS Code extension (the owner's 8 answers, 2026-10-06)

Build after the ONNX swap passes its gates.

| # | Question | Decision |
|---|---|---|
| 1 | Role | Manager plus dashboard. It starts, stops and restarts Proton, replacing `proton-ensure.js` and the `.proton-off` file. It opens as an editor tab showing status, RAM, latency, a call log and a try-it box |
| 2 | Runtime | Port the server to TypeScript with `onnxruntime-node`, in a child Node process. No Python, no venv |
| 3 | Models | Bundled in the vsix: fully offline, at the cost of a large file |
| 4 | Repo | `<repo>/vscode/`, so the server and the extension version together |
| 5 | Start | With VS Code: models load at startup, so the first call is warm |
| 6 | Sharing | The first VS Code window owns `127.0.0.1:9400/mcp`; other windows and terminal sessions connect to it. When it closes, the next caller's hook revives it |
| 7 | Mark | A neutral Lucide `atom` glyph until the owner supplies a real mark |
| 8 | Ship | Install locally only, after a port audit. The audit ran on 2026-10-06, harness `76bebd5`: no new port is needed and 9400 is free of conflicts |

Proton stays off while the off flag file (`.proton-off`) exists, until the owner turns it on. The extension's Start command must honour the same flag, or replace it with its own setting, without silently overriding the owner's choice.

### Built (2026-10-06, branch `vscode-ext`, a separate git worktree)

`vscode/` holds the extension `proton.proton-mcp` 1.0.0 and the TypeScript server it runs. Measured on the same busy Ryzen CPU, CPU only, on dev ports 9413 (Python) and 9414 (TypeScript); 9400 was never bound.

| Gate | Python (onnx-swap) | TypeScript (`vscode/dist/server.js`) |
|---|---|---|
| Tokenizer ids (`@huggingface/tokenizers` 0.2.0 against Rust `tokenizers`): 440 texts per BERT model including every catalog doc, 523 GLiClass prompts | reference | identical for all three models |
| `vscode/tests/parity.py`: 50 calls (every tool, rules, multi-label, infeasible rules, gold set, injection sample) | reference | same tool list, 0 non-numeric mismatches, largest numeric difference 1.5e-6 |
| locate gold set (28 queries) | top-1 24/28, top-3 27/28 | top-1 24/28, top-3 27/28 |
| Injection sample (flag at >= 0.8) | 0.127, 0.975, 0.057, 0.893, 0.067, 0.312: PASS | identical: PASS |
| `tests/test_mcp.py` (new `PROTON_URL` mode) and `tests/test_tools.py` http | PASS | PASS |
| HTTP p50 (`tests/bench_tools.py`, n=20): decide / locate / rank / triage / risk | 53 / 31 / 95 / 53 / 44 ms | 43 / 20 / 85 / 51 / 34 ms |
| Memory after the bench | private 1.26 GB, working set 0.77 GB | private 0.68 GB, working set 0.78 GB |
| Start to ready | | 159 s with a first 357-item catalog embed (both servers loading at once), then the disk cache; 3-5 s with the cache or no catalog |

How it works:

- **Server.** `src/server/` ports `models.py`, `proto.py`, `decide.py` and the four task tools, one module each, behind a `TOOLS` registry. It reads the Python package's `data/*.json` (copied into `dist/data` at build) and the bundled `models/<key>/`. Streamable HTTP with sessions (the hooks cache a session id and treat 404 as a restart), JSON responses, `Origin` requests refused, plus `GET /status` (state, pid, role, RSS, per-tool warm p50, last 50 calls) for the dashboard. Catalog vectors cache in `PROTON_STATE_DIR/locate-ts-<key>.json`, separate from Python's `.npz`.
- **Extension.** Activates on startup. If the off flag file (`.proton-off`) exists it shows `Off (proton-off flag)` and binds nothing; Start then warns and offers Turn On, which deletes the flag only after a modal confirm. Otherwise the first window spawns `dist/server.js` with VS Code's own Electron as Node (`windowsHide`, IPC channel); the server exits when that channel closes (verified by killing the owner). Other windows find the port taken and only poll `/status`. Stop kills the owned child, or the reported pid when another process owns the server. The `proton.port` setting or env `PROTON_PORT` moves it for dev runs.
- **Dashboard.** Editor-tab webview: state pill; Process RAM, Warm p50, Model Load and Server cards; Tool Latency table; Recent Calls (time, tool, ms, short result); Try It (tool, text, other arguments as JSON, Run). Tokens on `:root` from the VS Code theme, status colours with a light variant.
- **Hook.** The SessionStart helper script now starts `node.exe <newest proton.proton-mcp-*>/dist/server.js --role shared` (fallback `<repo>/vscode`, then the worktree), detached and hidden, still behind `.proton-off`; its exports are unchanged. Verified on :9415 with a scratch home: no window (`MainWindowHandle` 0), ready in 3.4 s.
- **Package.** `npm run build`, then `npm run package`: `proton-mcp.vsix` 420.8 MB (49 files; models 490 MB raw, `onnxruntime.dll` 28 MB, no DirectML DLLs). Installed with `code --install-extension` on 2026-10-06: every open window activated it and showed Off, and nothing listened on 9400.

Not done: the status bar shows the Unicode atom (U+269B), not the Lucide glyph, because VS Code's status bar takes only codicons or a contributed icon font; the extension icon is the Lucide atom SVG rendered to PNG. A UI run in a second VS Code instance was blocked by a pending VS Code update ("Code is currently being updated"), so `vscode/tests/host-smoke.cjs` ran `dist/extension.js` under a stub `vscode` module instead.
