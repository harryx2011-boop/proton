// The HTTP front of the server: Host and Origin gates, a request body cap, the public /status view and the
// route table. main.ts supplies the status snapshot and the MCP session handler. Node built-ins only.
import type { IncomingMessage, ServerResponse } from 'node:http';

export const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024; // the Python SDK's default for the same endpoint
export const maxBodyBytes = (env: Record<string, string | undefined> = process.env) => {
  const n = Number(env.PROTON_MAX_BODY_BYTES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_BODY_BYTES;
};

/** Only the names a local client uses for this server: a DNS-rebinding page arrives with its own Host. */
export function hostAllowed(host: string | undefined, port: number): boolean {
  if (!host) return false;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host.toLowerCase());
}

/** Absolute filesystem paths out of a message; URLs and plain text stay. */
export const redact = (text: string) =>
  text.replace(/(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s'"]*/g, '<path>').replace(/(?<![\w:/.])\/(?:[\w.~-]+\/)+[\w.~-]*/g, '<path>');

type Snapshot = Record<string, any> & { error?: string; calls?: { at: number; tool: string; ms: number; ok: boolean; result?: string }[] };

/** What /status serves: state, version, counts and timings. No tool results, no paths. */
export function statusView(s: Snapshot) {
  return {
    ...s,
    error: s.error ? redact(s.error) : s.error,
    calls: (s.calls ?? []).map(({ at, tool, ms, ok }) => ({ at, tool, ms, ok })),
  };
}

type Body = { ok: true; body: unknown } | { ok: false; status: 400 | 413 };

function readJson(req: IncomingMessage, max: number): Promise<Body> {
  const declared = Number(req.headers['content-length']);
  if (declared > max) return Promise.resolve({ ok: false, status: 413 });
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on('data', (c: Buffer) => {
      n += c.length;
      if (n > max) return void resolve({ ok: false, status: 413 });
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve({ ok: true, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      } catch {
        resolve({ ok: false, status: 400 });
      }
    });
    req.on('error', () => resolve({ ok: false, status: 400 }));
  });
}

export type AppDeps = {
  port: number;
  maxBodyBytes: number;
  snapshot: () => Snapshot;
  /** `body` is the parsed JSON of a POST, undefined for GET and DELETE. */
  mcp: (req: IncomingMessage, res: ServerResponse, body: unknown) => Promise<void>;
};

export function createApp(d: AppDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!hostAllowed(req.headers.host, d.port)) return void res.writeHead(403).end();
    // Claude Code sends no Origin header; a browser always does on POST, so this shuts out web pages
    if (req.headers.origin) return void res.writeHead(403).end();
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/status' && req.method === 'GET') {
      return void res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(statusView(d.snapshot())));
    }
    if (path !== '/mcp') return void res.writeHead(404).end();
    let body: unknown;
    if (req.method === 'POST') {
      const r = await readJson(req, d.maxBodyBytes);
      if (!r.ok) {
        res.once('finish', () => req.destroy());
        return void res.writeHead(r.status, { 'Content-Type': 'text/plain', Connection: 'close' }).end(r.status === 413 ? 'request body too large' : 'invalid JSON body');
      }
      body = r.body;
    }
    await d.mcp(req, res, body);
  };
}
