// Proton manager: the first VS Code window binds the port and owns the server child; other windows only
// read its /status. A file named off in the state folder keeps everything off; only an explicit click deletes it.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, openSync, unlinkSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { offFlag, stateDir } from './server/paths';
import { Dashboard, Sidebar, type Handlers } from './dashboard';

const LOG_DIR = stateDir();
const OFF_FLAG = offFlag();

export type Phase = 'flag' | 'off' | 'starting' | 'downloading' | 'loading' | 'ready' | 'error' | 'failed';
export type View = { phase: Phase; owner: boolean; port: number; server: any | null; note: string };

let child: ChildProcess | null = null;
let view: View;
let bar: vscode.StatusBarItem;
let dashboard: Dashboard | null = null;
const sinks = new Set<(msg: object) => void>();
let ctx: vscode.ExtensionContext;
let note = '';

const port = () => Number(process.env.PROTON_PORT || vscode.workspace.getConfiguration('proton').get('port') || 9400);
const base = () => `http://127.0.0.1:${port()}`;

const listening = (p: number) =>
  new Promise<boolean>((resolve) => {
    const s = connect({ host: '127.0.0.1', port: p });
    s.setTimeout(300);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('error', () => resolve(false));
    s.once('timeout', () => (s.destroy(), resolve(false)));
  });

async function fetchStatus(): Promise<any | null> {
  try {
    const r = await fetch(`${base()}/status`, { signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function refresh() {
  const server = await fetchStatus();
  let phase: Phase;
  if (server) {
    phase = server.state === 'ready' ? 'ready' : server.state === 'downloading' ? 'downloading' : server.state === 'error' ? (server.download?.reason ? 'failed' : 'error') : 'loading';
  }
  else if (child) phase = 'starting';
  else if (await listening(port())) {
    phase = 'ready';
    note = `Port ${port()} is held by a server without /status (an older Python Proton?).`;
  }
  else if (existsSync(OFF_FLAG)) phase = 'flag';
  else phase = 'off';
  view = { phase, owner: !!child, port: port(), server, note };
  render();
  for (const post of sinks) post({ type: 'status', view });
}

function render() {
  const s = view.server;
  const text: Record<Phase, string> = {
    flag: 'Off (flag file)',
    off: 'Off',
    starting: 'Loading',
    downloading: `Downloading Models ${s?.download?.percent ?? 0}%`,
    failed: 'Download Failed',
    loading: 'Loading',
    ready: s?.p50 != null ? `${Math.round(s.p50)} ms` : 'Ready',
    error: 'Error',
  };
  const tip: Record<Phase, string> = {
    flag: 'Proton is off (flag file).',
    off: 'Proton is not running.',
    starting: 'Proton is starting.',
    downloading: `Proton is downloading its models (first run): ${s?.download?.percent ?? 0}%.`,
    failed: `Proton could not download its models: ${s?.error}`,
    loading: 'Proton is loading its models.',
    ready: s?.p50 != null ? `Proton is ready. Warm p50 ${Math.round(s.p50)} ms over recent calls.` : 'Proton is ready.',
    error: `Proton failed to load: ${s?.error ?? note}`,
  };
  bar.text = `\u269B ${text[view.phase]}`;
  bar.tooltip = `${tip[view.phase]}${view.server ? ` ${view.owner ? 'This window owns' : 'Another process owns'} the server on :${view.port}.` : ''} Click to open the dashboard.`;
  bar.backgroundColor = view.phase === 'error' || view.phase === 'failed' ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
}

async function start(): Promise<void> {
  if (existsSync(OFF_FLAG)) {
    note = 'Off (flag file)';
    await refresh();
    const pick = await vscode.window.showWarningMessage(`Proton is off because ${OFF_FLAG} exists.`, 'Turn On');
    if (pick === 'Turn On') await turnOn();
    return;
  }
  if (child || (await listening(port()))) return void (await refresh());
  mkdirSync(LOG_DIR, { recursive: true });
  const log = openSync(join(LOG_DIR, 'proton.log'), 'a');
  note = '';
  // VS Code's own Electron as Node: a GUI-subsystem exe, so no console window ever appears
  const baseUrl = String(vscode.workspace.getConfiguration('proton').get('modelBaseUrl') || '');
  const c = spawn(process.execPath, [ctx.asAbsolutePath('dist/server.js'), '--role', 'vscode'], {
    cwd: ctx.extensionPath,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PROTON_PORT: String(port()), ...(baseUrl && !process.env.PROTON_MODEL_BASE_URL ? { PROTON_MODEL_BASE_URL: baseUrl } : {}) },
    stdio: ['ignore', log, log, 'ipc'],
    windowsHide: true,
  });
  child = c;
  c.on('exit', (code) => {
    if (child === c) child = null;
    if (code) note = `Server exited with code ${code}; see ${join(LOG_DIR, 'proton.log')}.`;
    void refresh();
  });
  c.on('error', (err) => {
    note = String(err);
    if (child === c) child = null;
    void refresh();
  });
  await refresh();
}

async function stop(): Promise<void> {
  if (child) {
    const c = child;
    await new Promise<void>((resolve) => {
      c.once('exit', () => resolve());
      c.kill();
    });
  } else {
    // owned by another window or started by a hook: stop it by the pid it reports
    const s = await fetchStatus();
    if (s?.pid) {
      try {
        process.kill(s.pid);
      } catch {}
      for (let i = 0; i < 20 && (await listening(port())); i++) await new Promise((r) => setTimeout(r, 100));
    }
  }
  await refresh();
}

async function turnOn(): Promise<void> {
  const ok = await vscode.window.showWarningMessage(
    `Delete ${OFF_FLAG} and start Proton? Anything that checks this flag will also start it from then on.`,
    { modal: true },
    'Turn On',
  );
  if (ok !== 'Turn On') return;
  try {
    unlinkSync(OFF_FLAG);
  } catch {}
  await start();
}

async function callTool(tool: string, args: object): Promise<unknown> {
  const url = `${base()}/mcp`;
  let session: string | null = null;
  const rpc = async (body: object) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (session) headers['Mcp-Session-Id'] = session;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(300_000) });
    session = r.headers.get('mcp-session-id') ?? session;
    const text = (await r.text()).trim();
    if (!text) return null;
    const line = text.startsWith('{') ? text : text.split(/\r?\n/).find((l) => l.startsWith('data:'))?.slice(5) ?? '';
    const msg = JSON.parse(line);
    if (msg.error) throw new Error(msg.error.message);
    return msg.result;
  };
  await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'proton-vscode', version: '1.0.0' } } });
  await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const res = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: tool, arguments: args } });
  const text = res?.content?.[0]?.text ?? 'null';
  if (res?.isError) throw new Error(text);
  return JSON.parse(text);
}

const handlers: Handlers = {
  onCommand: (cmd) => commands[`proton.${cmd}`]?.(),
  onRun: callTool,
  onOpen: (post) => (sinks.add(post), post({ type: 'status', view })),
  onClose: (post) => sinks.delete(post),
};

const commands: Record<string, () => unknown> = {
  'proton.start': start,
  'proton.stop': stop,
  'proton.restart': async () => {
    await stop();
    await start();
  },
  'proton.turnOn': turnOn,
  'proton.openDashboard': () => {
    dashboard ??= new Dashboard(ctx, handlers, () => (dashboard = null));
    dashboard.reveal();
  },
};

export async function activate(context: vscode.ExtensionContext) {
  ctx = context;
  bar = vscode.window.createStatusBarItem('proton.status', vscode.StatusBarAlignment.Right, 100);
  bar.name = 'Proton';
  bar.command = 'proton.openDashboard';
  view = { phase: 'off', owner: false, port: port(), server: null, note };
  render();
  bar.show();
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('proton.sidebar', new Sidebar(handlers)));
  for (const [id, fn] of Object.entries(commands)) context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  const timer = setInterval(() => void refresh(), 2000);
  context.subscriptions.push(bar, { dispose: () => clearInterval(timer) });
  // start with VS Code, models loaded eagerly; never past the off flag
  if (!existsSync(OFF_FLAG)) await start();
  else await refresh();
}

export function deactivate() {
  child?.kill();
}
