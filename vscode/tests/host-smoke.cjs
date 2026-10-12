// Runs dist/extension.js under a stub `vscode` module (no VS Code needed): flag honoured, owner spawn,
// status bar text, dashboard messages, stop/start, deactivate. Never touches 9400: pass a dev port.
// Run: set PROTON_STATE_DIR=<scratch dir> & set PROTON_PORT=9417 & node tests/host-smoke.cjs [--flag] [--keep]
const Module = require('module');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

assert(process.env.PROTON_PORT && process.env.PROTON_PORT !== '9400', 'set PROTON_PORT to a dev port');
assert(process.env.PROTON_STATE_DIR, 'set PROTON_STATE_DIR to a scratch dir');
const bar = { text: '', show() {}, dispose() {} };
const posted = [];
let html = '';
const handlers = {};
const vscode = {
  StatusBarAlignment: { Right: 2 },
  ViewColumn: { Active: -1 },
  ThemeColor: class { constructor(id) { this.id = id; } },
  Uri: { joinPath: (...p) => p.join('/') },
  window: {
    createStatusBarItem: () => bar,
    registerWebviewViewProvider: () => ({ dispose() {} }),
    showWarningMessage: async (...a) => { posted.push({ warning: a[0] }); return undefined; },
    createWebviewPanel: () => ({
      webview: {
        set html(h) { html = h; },
        cspSource: 'vscode-resource:',
        postMessage: async (m) => posted.push(m),
        onDidReceiveMessage: (f) => (handlers.msg = f),
      },
      onDidDispose: () => {},
      reveal: () => {},
    }),
  },
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
  commands: { registerCommand: (id, f) => ((handlers[id] = f), { dispose() {} }) },
};
const load = Module._load;
Module._load = (req, ...rest) => (req === 'vscode' ? vscode : load(req, ...rest));

const root = path.join(__dirname, '..');
const ext = require(path.join(root, 'dist', 'extension.js'));
const ctx = { subscriptions: [], extensionPath: root, extensionUri: root, asAbsolutePath: (p) => path.join(root, p) };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flag = path.join(process.env.PROTON_STATE_DIR, 'off');

(async () => {
  if (process.argv.includes('--flag')) {
    fs.mkdirSync(path.dirname(flag), { recursive: true });
    fs.writeFileSync(flag, '');
    await ext.activate(ctx);
    await sleep(500);
    console.log('flag: bar =', JSON.stringify(bar.text));
    assert(bar.text.includes('Off (flag file)'));
    await handlers['proton.start']();
    assert(fs.existsSync(flag), 'flag must survive Start');
    console.log('flag: Start warned and left the flag:', posted.some((m) => m.warning));
    ctx.subscriptions.forEach((d) => d.dispose());
    return process.exit(0);
  }
  await ext.activate(ctx);
  for (let i = 0; i < 120 && !bar.text.match(/Ready| ms/); i++) await sleep(500);
  console.log('owner: bar =', JSON.stringify(bar.text));
  handlers['proton.openDashboard']();
  fs.writeFileSync(path.join(root, 'tests', '.dashboard.html'), html);
  for (let i = 0; i < 3; i++) await handlers.msg({ type: 'run', tool: 'risk', args: { action_name: 'GMAIL_SEND_EMAIL', args_summary: 'to boss' } });
  const res = posted.filter((m) => m.type === 'result').pop();
  console.log('try-it risk:', res.ok, JSON.parse(res.text).risk, res.ms + ' ms');
  await sleep(2500);
  const st = posted.filter((m) => m.type === 'status').pop().view;
  console.log('dashboard status:', st.phase, 'owner', st.owner, 'rss MB', Math.round(st.server.rss / 2 ** 20), 'calls', st.server.calls.length);
  fs.writeFileSync(path.join(root, 'tests', '.status.json'), JSON.stringify(st));
  await handlers['proton.stop']();
  console.log('after stop: bar =', JSON.stringify(bar.text));
  await handlers['proton.start']();
  console.log('after start: bar =', JSON.stringify(bar.text));
  if (process.argv.includes('--keep')) return console.log('keeping the owner alive; kill this process to test the IPC exit');
  ext.deactivate();
  ctx.subscriptions.forEach((d) => d.dispose());
  await sleep(1000);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
