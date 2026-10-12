// Proton's MCP server on onnxruntime-node: streamable HTTP at 127.0.0.1:$PROTON_PORT/mcp, plus GET /status
// for the VS Code dashboard. Run as a child Node process (the extension uses VS Code's own Electron as Node).
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { load, MODEL_DIR, MODELS } from './models';
import { stateDir } from './paths';
import { createApp, maxBodyBytes } from './http';
import { defaultBaseUrl, ensureModels, loadManifest } from './modelFetch';
import * as locateSkill from './tools/locateSkill';
import { TOOLS } from './tools/index';

const PORT = Number(process.env.PROTON_PORT || 9400);
const ROLE = process.argv.includes('--role') ? process.argv[process.argv.indexOf('--role') + 1] : 'shared';
const STATE_DIR = stateDir();
const VERSION: string = process.env.PROTON_VERSION || '1.0.0';
const log = (msg: string) => process.stderr.write(`${new Date().toISOString()} proton ${msg}\n`);

const status = {
  state: 'loading' as 'loading' | 'downloading' | 'ready' | 'error',
  error: '',
  loadMs: 0,
  started: Date.now(),
  // first-run model download: percent while state is downloading, reason and file when it failed
  download: { percent: 0, file: '', reason: '' },
};
const times: Record<string, number[]> = {};
const calls: { at: number; tool: string; ms: number; ok: boolean; result: string }[] = [];

function record(tool: string, ms: number, ok: boolean, result: string) {
  (times[tool] ??= []).push(ms);
  if (times[tool].length > 200) times[tool].shift();
  calls.unshift({ at: Date.now(), tool, ms, ok, result: result.replace(/\s+/g, ' ').slice(0, 160) });
  calls.length = Math.min(calls.length, 50);
}

const p50 = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
// warm: a tool's first call pays for its cold label vectors, so it stays out of the median
const warmTimes = (name: string) => (times[name]?.length > 1 ? times[name].slice(1) : []);

function snapshot() {
  return {
    ...status,
    pid: process.pid,
    port: PORT,
    role: ROLE,
    version: VERSION,
    rss: process.memoryUsage().rss,
    p50: p50(TOOLS.flatMap((t) => warmTimes(t.name))),
    tools: Object.fromEntries(TOOLS.map((t) => [t.name, { n: times[t.name]?.length ?? 0, p50: p50(warmTimes(t.name)) }])),
    calls,
  };
}

function buildServer(): McpServer {
  const server = new McpServer({ name: 'proton', version: VERSION });
  for (const t of TOOLS) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.schema as any }, async (args: any) => {
      const t0 = performance.now();
      try {
        const out = await t.run(args);
        const text = JSON.stringify(out, null, 2);
        record(t.name, performance.now() - t0, true, JSON.stringify(out));
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        record(t.name, performance.now() - t0, false, String(err));
        throw err;
      }
    });
  }
  return server;
}

// the hooks give a call 1.5 s and a catalog embed takes minutes on a busy CPU, so everything loads up front
async function warm() {
  const t0 = performance.now();
  try {
    // a slim vsix has a manifest and no models; a dev build has models and no manifest
    const manifest = loadManifest(join(__dirname, 'models.manifest.json'));
    if (manifest) {
      status.state = 'downloading';
      const r = await ensureModels({
        manifest,
        modelDir: MODEL_DIR,
        baseUrl: process.env.PROTON_MODEL_BASE_URL || defaultBaseUrl(manifest.version),
        onProgress: (p) => Object.assign(status.download, { percent: p.percent, file: p.file }),
      });
      if (!r.ok) {
        Object.assign(status.download, { reason: r.reason, file: r.file });
        status.state = 'error';
        status.error = `Model download failed (${r.reason}): ${r.message}`;
        return void log(status.error);
      }
      if (r.downloaded.length) log(`downloaded ${r.downloaded.join(', ')}`);
      status.state = 'loading';
    }
    for (const key of Object.keys(MODELS)) await load(key);
    await locateSkill.load();
    status.state = 'ready';
    status.loadMs = Math.round(performance.now() - t0);
    log(`ready in ${status.loadMs} ms`);
  } catch (err) {
    status.state = 'error';
    status.error = String(err);
    log(`load failed: ${err}`);
  }
}

const mcp = async (req: IncomingMessage, res: ServerResponse, body: unknown) => {
  // stateful like FastMCP: the hooks cache a session id and treat 404 as "server restarted, open a new one"
  const sid = req.headers['mcp-session-id'];
  let transport = typeof sid === 'string' ? sessions.get(sid) : undefined;
  if (sid && !transport) {
    return void res.writeHead(404, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Session not found' } }));
  }
  try {
    if (!transport) {
      const server = buildServer();
      const t: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          sessions.set(id, t);
          // ponytail: oldest session evicted past 1000; a client holding it gets 404 and reopens
          if (sessions.size > 1000) void sessions.values().next().value!.close();
        },
      });
      t.onclose = () => {
        if (t.sessionId) sessions.delete(t.sessionId);
        void server.close();
      };
      await server.connect(t);
      transport = t;
    }
    await transport.handleRequest(req, res, body);
  } catch (err) {
    log(`request failed: ${err}`);
    if (!res.headersSent) res.writeHead(500).end('internal error');
  }
};
const http = createServer(createApp({ port: PORT, maxBodyBytes: maxBodyBytes(), snapshot, mcp }));
const sessions = new Map<string, StreamableHTTPServerTransport>();

http.once('error', (err) => {
  log(`listen failed on ${PORT}: ${err}`);
  process.exit(1);
});
http.listen(PORT, '127.0.0.1', () => {
  mkdirSync(STATE_DIR, { recursive: true });
  const pidFile = join(STATE_DIR, 'pid');
  writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => {
    try {
      if (readFileSync(pidFile, 'utf8').trim() === String(process.pid)) unlinkSync(pidFile);
    } catch {}
  });
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => process.exit(0));
  log(`${ROLE} server pid ${process.pid} on 127.0.0.1:${PORT}/mcp`);
  void warm();
});

// started by a VS Code window over IPC: when that window goes, so does the server (a hook revives it)
if (process.send) process.on('disconnect', () => process.exit(0));
