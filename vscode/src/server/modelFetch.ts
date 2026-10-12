// First-run model download: a slim vsix ships a manifest (file, size, SHA-256) instead of the ONNX files,
// and this module fetches whatever is missing or corrupt from <base>/<asset>. Node built-ins only, so the
// tests run without VS Code. A file appears at its final path only after its hash matched.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream as nodeCreateWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Writable } from 'node:stream';

export type Entry = { key: string; file: string; asset: string; size: number; sha256: string };
export type Manifest = { version: string; files: Entry[] };
export type Reason = 'no-network' | 'http-error' | 'hash-mismatch' | 'disk-full' | 'partial' | 'write-error';
export type FetchResult = { ok: true; downloaded: string[] } | { ok: false; reason: Reason; file: string; message: string };
export type Progress = { percent: number; file: string; received: number; total: number };
export type Options = {
  manifest: Manifest;
  modelDir: string;
  baseUrl: string;
  onProgress?: (p: Progress) => void;
  retryDelayMs?: number;
  createWriteStream?: (path: string) => Writable;
};

export const REPO_RELEASES = 'https://github.com/harryx2011-boop/proton/releases/download';
export const defaultBaseUrl = (version: string) => `${REPO_RELEASES}/v${version}`;
export const defaultModelDir = (env: Record<string, string | undefined> = process.env, home = homedir()) =>
  env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Proton', 'models') : join(home, '.proton', 'models');

/** Files a Proton model folder needs, as [key, file]; the manifest builder and the build script share it. */
export const MODEL_FILES: [string, string][] = ['skillret', 'e5', 'gliclass'].flatMap((k) => [[k, 'model.onnx'], [k, 'tokenizer.json']] as [string, string][]);

export function loadManifest(path: string): Manifest | null {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

const hashFile = (path: string) =>
  new Promise<string>((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });

export function buildManifest(srcDir: string, version: string, files = MODEL_FILES): Manifest {
  return {
    version,
    files: files.map(([key, file]) => {
      const buf = readFileSync(join(srcDir, key, file));
      return { key, file, asset: `${key}-${file}`, size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
    }),
  };
}

class Fail extends Error {
  reason: Reason;
  constructor(reason: Reason, message: string) {
    super(message);
    this.reason = reason;
  }
}

const rm = (p: string) => rmSync(p, { force: true });
const codeOf = (err: any): string => err?.code ?? err?.cause?.code ?? '';

async function download(e: Entry, url: string, dest: string, o: Options, base: number, total: number): Promise<void> {
  const part = `${dest}.part`;
  rm(part);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err: any) {
    throw new Fail('no-network', `Could not reach ${new URL(url).host}: ${err?.cause?.code ?? err?.message ?? err}`);
  }
  if (!res.ok || !res.body) throw new Fail('http-error', `${url} answered HTTP ${res.status}`);
  const out = (o.createWriteStream ?? nodeCreateWriteStream)(part);
  const w: { err: Error | null } = { err: null };
  let wake: (() => void) | null = null;
  out.on('error', (err: Error) => ((w.err ??= err), wake?.()));
  out.on('drain', () => wake?.());
  const hash = createHash('sha256');
  let got = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err: any) {
        throw new Fail('partial', `Download of ${e.key}/${e.file} stopped after ${got} of ${e.size} bytes (${err?.cause?.code ?? err?.message ?? err}).`);
      }
      if (chunk.done) break;
      hash.update(chunk.value);
      got += chunk.value.length;
      await new Promise<void>((resolve) => {
        wake = resolve;
        if (out.write(chunk.value, (err) => err && (w.err ??= err))) resolve();
      });
      if (w.err) break;
      o.onProgress?.({ percent: Math.min(100, Math.floor(((base + got) / total) * 100)), file: `${e.key}/${e.file}`, received: base + got, total });
    }
    if (w.err) {
      const code = codeOf(w.err);
      throw new Fail(code === 'ENOSPC' || code === 'EDQUOT' ? 'disk-full' : 'write-error', code === 'ENOSPC' || code === 'EDQUOT' ? `The disk is full: could not write ${e.key}/${e.file}.` : `Could not write ${e.key}/${e.file}: ${w.err.message}`);
    }
    if (got < e.size) throw new Fail('partial', `Download of ${e.key}/${e.file} ended after ${got} of ${e.size} bytes.`);
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    if (hash.digest('hex') !== e.sha256 || got !== e.size) {
      throw new Fail('hash-mismatch', `SHA-256 of ${e.key}/${e.file} does not match the manifest, so the file was discarded.`);
    }
    renameSync(part, dest);
  } catch (err) {
    out.destroy();
    await new Promise((r) => setTimeout(r, 20));
    rm(part);
    throw err;
  }
}

/** Makes every manifest file present with the right hash under modelDir/<key>/<file>. Never leaves a bad file. */
export async function ensureModels(o: Options): Promise<FetchResult> {
  const total = o.manifest.files.reduce((n, f) => n + f.size, 0);
  const downloaded: string[] = [];
  let base = 0;
  for (const e of o.manifest.files) {
    const dest = join(o.modelDir, e.key, e.file);
    const name = `${e.key}/${e.file}`;
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(dest) && statSync(dest).size === e.size && (await hashFile(dest)) === e.sha256) {
      base += e.size;
      continue;
    }
    rm(dest);
    const url = `${o.baseUrl.replace(/\/+$/, '')}/${e.asset}`;
    for (let attempt = 0; ; attempt++) {
      try {
        await download(e, url, dest, o, base, total);
        break;
      } catch (err) {
        if (!(err instanceof Fail)) throw err;
        // one retry; a full disk will not get better in a second
        if (attempt >= 1 || err.reason === 'disk-full') return { ok: false, reason: err.reason, file: name, message: err.message };
        await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 1500));
      }
    }
    downloaded.push(name);
    base += e.size;
  }
  o.onProgress?.({ percent: 100, file: '', received: total, total });
  return { ok: true, downloaded };
}
