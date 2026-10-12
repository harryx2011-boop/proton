// Run: node --test tests/httpGuard.test.mjs   (Node 22.6+ strips the types of the .ts import)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { createApp, hostAllowed, redact } from '../src/server/http.ts';

const RAW = {
  state: 'ready',
  error: 'Load failed: E:\\data\\someone\\proton\\model.onnx missing',
  pid: 4242,
  port: 0,
  version: '1.0.0',
  rss: 1234,
  p50: 40,
  tools: { risk: { n: 3, p50: 30 } },
  calls: [{ at: 1, tool: 'risk', ms: 31, ok: true, result: '{"verdict":"send","secret":"user text"}' }],
};

async function boot(maxBody = 1024) {
  const seen = [];
  const srv = createServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  srv.on(
    'request',
    createApp({
      port,
      maxBodyBytes: maxBody,
      snapshot: () => ({ ...RAW, port }),
      mcp: async (req, res, body) => {
        seen.push(body);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      },
    }),
  );
  return { port, seen, close: () => srv.close() };
}

// node:http, because fetch will not send a forged Host header
const call = (port, { method = 'GET', path = '/status', headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers, setHost: false }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
const json = { 'Content-Type': 'application/json' };
const rpc = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });

test('hostAllowed: loopback names with the right port only', () => {
  for (const h of ['127.0.0.1:9400', 'localhost:9400', '[::1]:9400', 'LOCALHOST:9400']) assert.equal(hostAllowed(h, 9400), true, h);
  for (const h of ['evil.example:9400', '127.0.0.1:9401', '127.0.0.1', 'localhost', '127.0.0.1:9400.evil.example', '', undefined, '0.0.0.0:9400']) {
    assert.equal(hostAllowed(h, 9400), false, String(h));
  }
});

test('a rebinding Host gets 403 on /status and on /mcp, and the handler never runs', async () => {
  const s = await boot();
  for (const host of ['evil.example:80', 'evil.example']) {
    const st = await call(s.port, { headers: { Host: host } });
    assert.equal(st.status, 403);
    assert.ok(!st.text.includes('pid'));
    const m = await call(s.port, { method: 'POST', path: '/mcp', headers: { Host: host, ...json }, body: rpc });
    assert.equal(m.status, 403);
  }
  assert.deepEqual(s.seen, []);
  s.close();
});

test('a normal loopback Host is accepted on /status and /mcp', async () => {
  const s = await boot();
  for (const host of [`127.0.0.1:${s.port}`, `localhost:${s.port}`]) {
    assert.equal((await call(s.port, { headers: { Host: host } })).status, 200);
    const m = await call(s.port, { method: 'POST', path: '/mcp', headers: { Host: host, ...json }, body: rpc });
    assert.equal(m.status, 200);
  }
  assert.equal(s.seen.length, 2);
  s.close();
});

test('an Origin header is still refused, with a good Host', async () => {
  const s = await boot();
  const r = await call(s.port, { method: 'POST', path: '/mcp', headers: { Host: `127.0.0.1:${s.port}`, Origin: 'http://evil.example', ...json }, body: rpc });
  assert.equal(r.status, 403);
  s.close();
});

test('unknown path is 404', async () => {
  const s = await boot();
  assert.equal((await call(s.port, { path: '/other', headers: { Host: `127.0.0.1:${s.port}` } })).status, 404);
  s.close();
});

test('oversize body: 413 from the Content-Length alone', async () => {
  const s = await boot(1024);
  const r = await call(s.port, { method: 'POST', path: '/mcp', headers: { Host: `127.0.0.1:${s.port}`, ...json, 'Content-Length': '5000000' }, body: '{' }).catch((e) => ({ status: e.code }));
  assert.equal(r.status, 413);
  assert.deepEqual(s.seen, []);
  s.close();
});

test('oversize body: 413 when a chunked stream passes the limit', async () => {
  const s = await boot(1024);
  const r = await call(s.port, { method: 'POST', path: '/mcp', headers: { Host: `127.0.0.1:${s.port}`, ...json, 'Transfer-Encoding': 'chunked' }, body: JSON.stringify({ pad: 'x'.repeat(4000) }) }).catch((e) => ({ status: e.code }));
  assert.equal(r.status, 413);
  assert.deepEqual(s.seen, []);
  s.close();
});

test('a body under the limit reaches the handler parsed; bad JSON is 400', async () => {
  const s = await boot(1024);
  const h = { Host: `127.0.0.1:${s.port}`, ...json };
  assert.equal((await call(s.port, { method: 'POST', path: '/mcp', headers: h, body: rpc })).status, 200);
  assert.deepEqual(s.seen, [JSON.parse(rpc)]);
  assert.equal((await call(s.port, { method: 'POST', path: '/mcp', headers: h, body: '{nope' })).status, 400);
  s.close();
});

test('/status keeps names, timings, counts, state and version; drops results and paths', async () => {
  const s = await boot();
  const r = await call(s.port, { headers: { Host: `127.0.0.1:${s.port}` } });
  const j = JSON.parse(r.text);
  assert.equal(j.state, 'ready');
  assert.equal(j.version, '1.0.0');
  assert.deepEqual(j.tools, RAW.tools);
  assert.deepEqual(j.calls, [{ at: 1, tool: 'risk', ms: 31, ok: true }]);
  assert.ok(!r.text.includes('someone'));
  assert.ok(!r.text.includes('user text'));
  assert.ok(!/[A-Za-z]:\\/.test(r.text));
  assert.match(j.error, /<path>/);
  s.close();
});

test('redact hides Windows and POSIX absolute paths, keeps the rest', () => {
  assert.equal(redact('missing E:\\app\\models\\e5\\model.onnx now'), 'missing <path> now');
  assert.equal(redact('no catalog at /home/u/cfg/x.json'), 'no catalog at <path>');
  assert.equal(redact('Model download failed (no-network): Could not reach 127.0.0.1:9419: ECONNREFUSED'), 'Model download failed (no-network): Could not reach 127.0.0.1:9419: ECONNREFUSED');
});
