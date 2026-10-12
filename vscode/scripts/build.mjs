// Bundles the extension and the server, then stages what the vsix ships beside them:
// dist/data (the Python package's JSON, one source of truth), dist/node_modules/onnxruntime-* (win32 x64 only)
// and models/<key> (model.onnx, tokenizer.json, MANIFEST.md from $PROTON_MODEL_SRC or ../.onnx).
// --slim: no models/ folder; dist/models.manifest.json (size + SHA-256 of the same files) is written instead and
// the extension downloads the files on first run. Needs Node 22.18+ (it imports modelFetch.ts directly).
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const slim = process.argv.includes('--slim');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => join(root, ...p);
const { version } = JSON.parse(readFileSync(at('package.json'), 'utf8'));
const shared = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', logLevel: 'warning', legalComments: 'none', minify: true };

await build({ ...shared, entryPoints: [at('src/extension.ts')], outfile: at('dist/extension.js'), external: ['vscode'] });
await build({
  ...shared,
  entryPoints: [at('src/server/main.ts')],
  outfile: at('dist/server.js'),
  external: ['onnxruntime-node'],
  define: { 'process.env.PROTON_VERSION': JSON.stringify(version) },
});

rmSync(at('dist/data'), { recursive: true, force: true });
cpSync(at('../src/proton/data'), at('dist/data'), { recursive: true });

const nm = at('dist/node_modules');
rmSync(nm, { recursive: true, force: true });
for (const pkg of ['onnxruntime-common', 'onnxruntime-node']) {
  for (const f of ['package.json', 'dist', 'LICENSE']) {
    const src = at('node_modules', pkg, f);
    if (existsSync(src)) cpSync(src, join(nm, pkg, f), { recursive: true });
  }
}
// CPU only: the DirectML DLLs are not needed
for (const f of ['onnxruntime.dll', 'onnxruntime_binding.node']) {
  const rel = join('bin', 'napi-v6', 'win32', 'x64', f);
  mkdirSync(dirname(join(nm, 'onnxruntime-node', rel)), { recursive: true });
  cpSync(at('node_modules', 'onnxruntime-node', rel), join(nm, 'onnxruntime-node', rel));
}

const src = process.env.PROTON_MODEL_SRC || at('..', '.onnx');
if (slim) {
  const { buildManifest } = await import(pathToFileURL(at('src/server/modelFetch.ts')).href);
  for (const [key, f] of [['skillret', 'model.onnx'], ['skillret', 'tokenizer.json'], ['e5', 'model.onnx'], ['e5', 'tokenizer.json'], ['gliclass', 'model.onnx'], ['gliclass', 'tokenizer.json']]) {
    if (!existsSync(join(src, key, f))) throw new Error(`${join(src, key, f)} missing: set PROTON_MODEL_SRC (the hashes in the manifest come from these files)`);
  }
  rmSync(at('models'), { recursive: true, force: true });
  const manifest = buildManifest(src, version);
  writeFileSync(at('dist/models.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`slim: manifest for ${manifest.files.length} files, ${(manifest.files.reduce((n, f) => n + f.size, 0) / 2 ** 20).toFixed(0)} MB`);
} else {
  rmSync(at('dist/models.manifest.json'), { force: true });
  for (const key of ['skillret', 'e5', 'gliclass']) {
    for (const f of ['model.onnx', 'tokenizer.json', 'MANIFEST.md']) {
      const from = join(src, key, f);
      const to = at('models', key, f);
      if (!existsSync(from)) throw new Error(`${from} missing: set PROTON_MODEL_SRC or run scripts/export_onnx.py`);
      if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    }
  }
}
console.log(`built proton ${version}${slim ? ' (slim)' : ''}`);
