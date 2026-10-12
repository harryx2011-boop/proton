// Run: node --test tests/modelFetch.test.mjs   (Node 22.6+ strips the types of the .ts import)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { ensureModels, defaultModelDir, defaultBaseUrl, buildManifest } from '../src/server/modelFetch.ts';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const BODIES = {
  'skillret-model.onnx': Buffer.alloc(300_000, 1),
  'skillret-tokenizer.json': Buffer.from('{"a":1}'),
  'e5-model.onnx': Buffer.alloc(200_000, 2),
};
const manifest = {
  version: '1.0.0',
  files: Object.entries(BODIES).map(([asset, b]) => {
    const [key, file] = asset.split('-');
    return { key, file, asset, size: b.length, sha256: sha(b) };
  }),
};

// a static server over BODIES; `behave(asset, res, hits)` may override one reply
async function serve(behave) {
  const hits = [];
  const srv = createServer((req, res) => {
    const asset = decodeURIComponent(req.url.split('/').pop());
    hits.push(asset);
    const body = BODIES[asset];
    if (!body) return void res.writeHead(404).end();
    if (behave?.(asset, res, body, hits)) return;
    res.writeHead(200, { 'Content-Length': body.length }).end(body);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { hits, url: `http://127.0.0.1:${srv.address().port}/rel`, close: () => srv.close() };
}
const scratch = () => mkdtempSync(join(tmpdir(), 'proton-fetch-'));
const tree = (d) => readdirSync(d, { recursive: true }).map(String).sort();
const opts = (modelDir, baseUrl, extra = {}) => ({ manifest, modelDir, baseUrl, retryDelayMs: 0, ...extra });

test('happy path downloads every file into <dir>/<key>/<file>, no .part left, progress reaches 100', async () => {
  const s = await serve();
  const dir = scratch();
  const pct = [];
  const r = await ensureModels(opts(dir, s.url, { onProgress: (p) => pct.push(p.percent) }));
  s.close();
  assert.equal(r.ok, true);
  assert.deepEqual(tree(dir).filter((f) => f.includes('.')), ['e5\\model.onnx', 'skillret\\model.onnx', 'skillret\\tokenizer.json'].sort());
  assert.ok(!tree(dir).some((f) => f.endsWith('.part')));
  assert.deepEqual(readFileSync(join(dir, 'e5', 'model.onnx')), BODIES['e5-model.onnx']);
  assert.equal(pct.at(-1), 100);
  assert.deepEqual([...pct].sort((a, b) => a - b), pct);
  rmSync(dir, { recursive: true });
});

test('resume: present files are not fetched again, a missing one is', async () => {
  const s = await serve();
  const dir = scratch();
  assert.equal((await ensureModels(opts(dir, s.url))).ok, true);
  rmSync(join(dir, 'e5', 'model.onnx'));
  s.hits.length = 0;
  const r = await ensureModels(opts(dir, s.url));
  s.close();
  assert.equal(r.ok, true);
  assert.deepEqual(s.hits, ['e5-model.onnx']);
  rmSync(dir, { recursive: true });
});

test('a local file with the wrong hash is replaced', async () => {
  const s = await serve();
  const dir = scratch();
  assert.equal((await ensureModels(opts(dir, s.url))).ok, true);
  writeFileSync(join(dir, 'e5', 'model.onnx'), Buffer.alloc(200_000, 9));
  assert.equal((await ensureModels(opts(dir, s.url))).ok, true);
  s.close();
  assert.deepEqual(readFileSync(join(dir, 'e5', 'model.onnx')), BODIES['e5-model.onnx']);
  rmSync(dir, { recursive: true });
});

test('hash mismatch: retried once, then hash-mismatch, nothing left behind', async () => {
  const s = await serve((asset, res, body) => {
    if (asset !== 'e5-model.onnx') return false;
    const bad = Buffer.from(body);
    bad[0] ^= 0xff;
    res.writeHead(200, { 'Content-Length': bad.length }).end(bad);
    return true;
  });
  const dir = scratch();
  const r = await ensureModels(opts(dir, s.url));
  s.close();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'hash-mismatch');
  assert.equal(r.file, 'e5/model.onnx');
  assert.match(r.message, /SHA-256/);
  assert.equal(s.hits.filter((h) => h === 'e5-model.onnx').length, 2);
  assert.ok(!existsSync(join(dir, 'e5', 'model.onnx')));
  assert.ok(!tree(dir).some((f) => f.endsWith('.part')));
  rmSync(dir, { recursive: true });
});

test('no network: nothing listens, reason no-network', async () => {
  const s = await serve();
  const url = s.url;
  s.close();
  const dir = scratch();
  const r = await ensureModels(opts(dir, url));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-network');
  assert.deepEqual(tree(dir).filter((f) => f.includes('.')), []);
  rmSync(dir, { recursive: true });
});

test('http error: a 404 asset gives http-error naming the status', async () => {
  const s = await serve();
  const dir = scratch();
  const m = { ...manifest, files: [{ key: 'x', file: 'model.onnx', asset: 'nope.onnx', size: 1, sha256: sha('a') }] };
  const r = await ensureModels({ ...opts(dir, s.url), manifest: m });
  s.close();
  assert.equal(r.reason, 'http-error');
  assert.match(r.message, /404/);
  rmSync(dir, { recursive: true });
});

test('partial download: connection drops mid-body, reason partial, no .part or final file', async () => {
  const s = await serve((asset, res, body) => {
    if (asset !== 'skillret-model.onnx') return false;
    res.writeHead(200, { 'Content-Length': body.length });
    res.write(body.subarray(0, 1000));
    setTimeout(() => res.destroy(), 20);
    return true;
  });
  const dir = scratch();
  const r = await ensureModels(opts(dir, s.url));
  s.close();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'partial');
  assert.ok(!existsSync(join(dir, 'skillret', 'model.onnx')));
  assert.ok(!tree(dir).some((f) => f.endsWith('.part')));
  rmSync(dir, { recursive: true });
});

test('partial download: a short body with a matching length header is still partial', async () => {
  const s = await serve((asset, res, body) => {
    if (asset !== 'e5-model.onnx') return false;
    res.writeHead(200).end(body.subarray(0, 5000));
    return true;
  });
  const dir = scratch();
  const r = await ensureModels(opts(dir, s.url));
  s.close();
  assert.equal(r.reason, 'partial');
  rmSync(dir, { recursive: true });
});

test('disk full: a write error ENOSPC gives disk-full, not retried, .part removed', async () => {
  const s = await serve();
  const dir = scratch();
  let opened = 0;
  const createWriteStreamFull = (path) => {
    opened++;
    const real = createWriteStream(path);
    return new Writable({
      write(chunk, enc, cb) {
        real.write(chunk.subarray(0, 10));
        cb(Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' }));
      },
      final(cb) { real.end(cb); },
      destroy(err, cb) { real.destroy(); real.once('close', () => cb(err)); },
    });
  };
  const r = await ensureModels(opts(dir, s.url, { createWriteStream: createWriteStreamFull }));
  s.close();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'disk-full');
  assert.equal(opened, 1);
  assert.ok(!tree(dir).some((f) => f.endsWith('.part')));
  rmSync(dir, { recursive: true });
});

test('buildManifest hashes the model files in a source tree', () => {
  const src = scratch();
  for (const [asset, b] of Object.entries(BODIES)) {
    const [key, file] = asset.split('-');
    const d = join(src, key);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, file), b);
  }
  const m = buildManifest(src, '2.3.4', [['skillret', 'model.onnx'], ['skillret', 'tokenizer.json'], ['e5', 'model.onnx']]);
  assert.equal(m.version, '2.3.4');
  const e = m.files.find((f) => f.asset === 'e5-model.onnx');
  assert.deepEqual({ key: e.key, file: e.file, size: e.size, sha256: e.sha256 }, { key: 'e5', file: 'model.onnx', size: 200_000, sha256: sha(BODIES['e5-model.onnx']) });
  rmSync(src, { recursive: true });
});

test('defaults: model dir and base url', () => {
  assert.equal(defaultModelDir({ LOCALAPPDATA: 'C:\\L' }, 'C:\\H'), join('C:\\L', 'Proton', 'models'));
  assert.equal(defaultModelDir({}, 'C:\\H'), join('C:\\H', '.proton', 'models'));
  assert.equal(defaultBaseUrl('1.2.3'), 'https://github.com/harryx2011-boop/proton/releases/download/v1.2.3');
});

