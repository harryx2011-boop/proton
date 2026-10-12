# Proton

## What Proton Is

Proton is a local server of three small CPU models that makes fast decisions for AI agents. An agent calls it over MCP to check text for hidden instructions, pick the right skill for a task, rate the risk of an action, or sort and rank a list. A call takes tens of milliseconds, runs without a GPU, and sends nothing off the machine.

The server exposes seven MCP tools:

- `decide` and `decide_batch`: classify text against any set of labels, with optional logic rules between labels.
- `ask`: answer several named questions about one text in one call. A question is a choice, a yes or no, or a level on an ordered scale.
- `locate_skill`: route a task to the best-matching skill or agent from a catalog.
- `rank`: order texts by how well they match a criterion.
- `triage`: sort items into named buckets.
- `risk`: grade an action as read, write, send or destructive.

The models are ONNX Runtime int8 encoders. There is no PyTorch at runtime. Two builds of the same server exist: a TypeScript build that ships inside the VS Code extension, and a Python build for use from source.

## Requirements

- Windows x64.
- VS Code 1.137 or later, for the extension.
- Python 3.12 or 3.13 and [uv](https://docs.astral.sh/uv/), only to run the Python build from source.
- Node.js 20 or later, only to build the extension or run the script tests.

## Install

Proton ships as the VS Code extension `proton.proton-mcp`. Install the `.vsix` from the GitHub release page:

```
code --install-extension proton-mcp-slim.vsix
```

The slim package is about 10 MB. It contains no models. On first start the extension downloads the three model files from GitHub release assets, checks each SHA-256 hash, and stores them in `%LOCALAPPDATA%\Proton\models`. The dashboard shows download progress, and Restart retries a failed download. The full package bundles the models and works offline.

Configuration:

| Setting | Environment variable | Meaning |
|---|---|---|
| `proton.modelBaseUrl` | `PROTON_MODEL_BASE_URL` | Base URL the models download from. The variable wins over the setting. |
| | `PROTON_MODEL_DIR` | Folder that holds the models. Replaces the default location. |
| `proton.port` | `PROTON_PORT` | Port on 127.0.0.1. Default 9400. |
| | `PROTON_STATE_DIR` | Folder for the pid file, log, caches and the off flag. Default `%LOCALAPPDATA%\Proton\state` (`~/.proton/state` without `LOCALAPPDATA`). |
| | `PROTON_SKILL_CATALOG` | Skill catalog JSON for `locate_skill`. Default `skill-catalog.json` in the state folder. |

A file named `off` in the state folder keeps Proton off: the extension then shows `Off (flag file)` and binds no port until Turn On deletes the file after a confirmation.

The extension starts with VS Code, owns the server process, and shows a status item, a sidebar view and a dashboard tab.

## Connect to Claude Code

```
claude mcp add --transport http -s user proton http://127.0.0.1:9400/mcp
```

Any MCP client that speaks streamable HTTP can use the same URL. Small clients that need no dependencies are in `clients/python` and `clients/ts`.

## Tools

Full argument and response reference: <https://proton-labs.vercel.app/docs>.

- `decide(text, heads, rules?, thresholds?, risk?)`: one decision per head, with confidence and probabilities. Rules (`implies`, `excludes`, `iff`) pick the best joint assignment.
- `decide_batch(texts, heads, rules?, thresholds?, risk?)`: the same over many texts. The prototype-scored heads read all texts in one batched run.
- `ask(state, questions, rules?, thresholds?, risk?)`: `questions` is `{name: question}`. A question is `{"type": "choice", "labels": [...]}`, `{"type": "noul", "criteria": "..."}` (yes or no, with the probability of yes) or `{"type": "score", "levels": [...ordered...]}`.
- `locate_skill(task, top_k?, kinds?, project?)`: ranked picks from a skill catalog. The catalog is a JSON file; by default `skill-catalog.json` in the state folder; set `PROTON_SKILL_CATALOG` to use another path.
- `rank(texts, criterion)`: texts sorted by similarity to the criterion.
- `triage(items, labels)`: a bucket, a score and the top three buckets for each item.
- `risk(action_name, args_summary, thresholds?)`: `read`, `write`, `send` or `destructive`.

Every decision carries, besides `label`, `confidence` and `probabilities`:

| Field | Meaning |
|---|---|
| `confidence_norm` | `(k * p_top - 1) / (k - 1)` for k labels: 0 for an even spread, 1 for certainty. |
| `margin`, `ratio` | Top probability minus the second, and second over top. |
| `rule_overrode` | True when the rules forced a label other than the head's own top label. |
| `calibrated` | The top probability after temperature scaling, for the injection and risk heads; `null` for other heads. The fit is documented in `scripts/calibrate.py`; its labelled sets are small and were drafted by the author. |
| `gate_basis`, `action` | `act`, `confirm` or `ask_person`: the calibrated probability (else the raw confidence) against `thresholds {act, review}`, else the row for `risk` (`read`, `write`, `send` or `destructive`; default `write`). Infeasible rules always give `ask_person`. |

Defaults are in `src/proton/data/thresholds.json`. They are starting values, not tuned guarantees.

## Run From Source

Python build:

```
uv sync --group export
uv run python scripts/export_onnx.py
uv run python -m proton.server --http
```

The export step downloads the original weights once and writes the int8 ONNX files to `.onnx/` (override with `PROTON_MODEL_DIR`). `--http` serves `http://127.0.0.1:9400/mcp`; without it the server speaks stdio. The state folder defaults to `%LOCALAPPDATA%\Proton\state`; set `PROTON_STATE_DIR` to a scratch folder for development runs.

Tests:

```
uv run python tests/test_mcp.py
uv run python tests/test_tools.py --no-http
```

Extension build:

```
cd vscode
npm install
npm run typecheck
npm run build
npm run package:slim
node --test tests/modelFetch.test.mjs
```

## Security

- The server binds to 127.0.0.1 only. The address is not configurable.
- Requests with a `Host` header other than the loopback names, and requests that carry a browser `Origin` header, are rejected. This blocks DNS-rebinding and cross-site calls from web pages.
- Request bodies are capped at 4 MiB.
- There is no authentication. Any process on the machine can call the tools, so do not forward the port or bind it to a public interface.
- The `/status` view carries counts and timings only, no tool results, and file paths in its error text are replaced with `<path>`.

## Credits

Proton runs converted copies of three open models:

- [SKILLRET-Edge-109M](https://huggingface.co/ThakiCloud/SKILLRET-Edge-109M) by ThakiCloud, Apache-2.0. Used by `locate_skill`.
- [e5-base-v2](https://huggingface.co/intfloat/e5-base-v2) by intfloat, MIT. Used by the injection and complexity heads, `risk`, `triage` and `rank`.
- [gliclass-base-v3.0](https://huggingface.co/knowledgator/gliclass-base-v3.0) by knowledgator, Apache-2.0. Used by every other `decide` head.

The published ONNX files are converted and int8-quantised, so they are modified copies of the original weights. See `THIRD-PARTY-NOTICES.md` for the full list of licences.

## License

MIT, see [LICENSE](LICENSE). Third-party model and dependency notices are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
