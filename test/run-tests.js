'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const P = require('../lib/presets');
const { Store } = require('../lib/store');
const { groupByDir, planRuns, listFileText } = require('../lib/runner');
const E = require('../lib/engine');
const { pyArgs, cleanEnv, lineSplitter } = require('../lib/pyenv');
const { execFileSync } = require('child_process');
const { copyTree } = require('../lib/fsutil');

// Website defaults: Artwork, Medium noise, 2x. Medium is level 1 on waifu2x.net (nunif web/server.py).
assert.deepStrictEqual(P.buildArgs({ style: 'artwork', noise: 'medium', scale: '2x' }, 'L.txt', 'OUT'), [
  '-m', 'noise_scale', '-n', '1', '--style', 'art', '-f', 'png', '--tile-size', '256', '-i', 'L.txt', '-o', 'OUT',
]);

// No noise reduction, 4x, photo style: no -n flag
assert.deepStrictEqual(P.buildArgs({ noise: 'none', scale: '4x', style: 'photo' }, 'L', 'O'), [
  '-m', 'scale4x', '--style', 'photo', '-f', 'png', '--tile-size', '256', '-i', 'L', '-o', 'O',
]);

// Noise only, with TTA
assert.deepStrictEqual(P.buildArgs({ noise: 'high', scale: 'none', tta: true }, 'L', 'O'), [
  '-m', 'noise', '-n', '2', '--style', 'art', '-f', 'png', '--tile-size', '256', '--tta', '-i', 'L', '-o', 'O',
]);

assert.throws(() => P.buildArgs({ noise: 'none', scale: 'none' }, 'L', 'O'));
assert.throws(() => P.buildArgs({ style: 'nope' }, 'L', 'O'));

assert.strictEqual(P.tagFor({ style: 'artwork', noise: 'medium', scale: '2x' }), 'artwork_medium_2x');
assert.strictEqual(P.tagFor({ style: 'photo', noise: 'none', scale: '4x', tta: true }), 'photo_none_4x_tta');

// Noise levels match the website: Low 0, Medium 1, High 2, Highest 3
assert.deepStrictEqual(['low', 'medium', 'high', 'highest'].map((n) => P.buildArgs({ noise: n }, 'L', 'O')[3]), ['0', '1', '2', '3']);
// Artwork/Scans uses nunif's art_scan style
assert.ok(P.buildArgs({ style: 'artwork_scan' }, 'L', 'O').join(' ').includes('--style art_scan'));

// planRuns: same name with a different extension (or case) never shares a run
{
  const runs = planRuns(['/a/x.jpg', '/a/x.png', '/a/X.webp', '/a/y.png', '/b/x.png']);
  for (const r of runs) {
    const stems = r.map((f) => path.parse(f).name.toLowerCase());
    assert.strictEqual(new Set(stems).size, stems.length, `clash in ${r}`);
    assert.strictEqual(new Set(r.map((f) => path.dirname(f))).size, 1, 'one folder per run');
  }
  assert.strictEqual(runs.flat().length, 5);
  assert.strictEqual(runs.length, 4); // /a split into 3 runs, /b one run
}

// listFileText: nunif reads the list with Python's csv module. Check with real Python that
// commas, quotes-free Windows paths and Japanese characters come back exactly.
{
  const files = ['C:\\Art\\a, b (1).png', 'C:\\Art\\ミク イラスト.jpg', 'C:\\Art\\plain.png'];
  const tmpList = path.join(os.tmpdir(), `w2x-list-${Date.now()}.txt`);
  fs.writeFileSync(tmpList, listFileText(files), 'utf8');
  // Same as nunif load_files(): open(txt, "r") + csv.reader, row[0]. -X utf8 as the app passes it.
  const code = 'import csv,sys,json\nwith open(sys.argv[1], "r") as f:\n    print(json.dumps([r[0] for r in csv.reader(f)]))';
  let out = null;
  for (const exe of ['python3', 'python']) {
    try {
      out = execFileSync(exe, ['-X', 'utf8', '-c', code, tmpList]).toString();
      break;
    } catch (_) {
      // try the next name
    }
  }
  if (out === null) console.log('note: no Python found, skipped the list-file round trip check');
  else assert.deepStrictEqual(JSON.parse(out), files);
  fs.rmSync(tmpList, { force: true });
}

// fixPth: the stock python312._pth gains ..\nunif and import site, and running twice changes nothing
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-pth-'));
  const f = path.join(d, 'python312._pth');
  fs.writeFileSync(f, 'python312.zip\r\n.\r\n\r\n# Uncomment to run site.main() automatically\r\n#import site\r\n');
  E.fixPth(d);
  const once = fs.readFileSync(f, 'utf8');
  E.fixPth(d);
  assert.strictEqual(fs.readFileSync(f, 'utf8'), once);
  const lines = once.split('\r\n');
  assert.ok(lines.includes('..\\nunif'));
  assert.ok(lines.includes('import site'));
  assert.ok(!lines.includes('#import site'));
  assert.ok(lines.includes('python312.zip') && lines.includes('.'));
  fs.rmSync(d, { recursive: true, force: true });
}

// pip download lines (taken from the user's real install log)
assert.deepStrictEqual(E.parsePipDownload('  Downloading torch-2.5.1%2Bcu121-cp311-cp311-win_amd64.whl (2449.4 MB)'),
  { name: 'torch-2.5.1+cu121-cp311-cp311-win_amd64.whl', bytes: 2449400000 });
assert.deepStrictEqual(E.parsePipDownload('Downloading https://download.pytorch.org/whl/cu132/torch-2.14.1%2Bcu132-cp312-cp312-win_amd64.whl (3012.4 MB)'),
  { name: 'torch-2.14.1+cu132-cp312-cp312-win_amd64.whl', bytes: 3012400000 });
assert.strictEqual(E.parsePipDownload('Downloading mpmath-1.3.0-py3-none-any.whl (536 kB)').bytes, 536000);
assert.strictEqual(E.parsePipDownload('Collecting torch'), null);

// tqdm lines from nunif's model downloader
{
  const t = E.parseTqdm('Waifu2x Models:  45%|####5     | 12.3MiB/27.1MiB [00:05<00:06, 2.40MiB/s]');
  assert.deepStrictEqual(t, { name: 'Waifu2x Models', pct: 45, done: 12300000, total: 27100000 });
  assert.strictEqual(E.parseTqdm('Downloading waifu2x models'), null);
}

// Python flags and environment: isolated mode ignores PYTHON* variables, so -X utf8 must be on the command line
assert.deepStrictEqual(pyArgs(['-m', 'waifu2x.cli']).slice(0, 3), ['-X', 'utf8', '-u']);
process.env.PYTHONPATH = 'C:\\elsewhere';
assert.strictEqual(cleanEnv().PYTHONPATH, undefined);
delete process.env.PYTHONPATH;

// lineSplitter handles \r progress redraws and lines split across chunks
{
  const got = [];
  const ls = lineSplitter((l) => got.push(l));
  ls.push('a 10%\r a 20');
  ls.push('%\r\nb\nc');
  ls.flush();
  assert.deepStrictEqual(got, ['a 10%', ' a 20%', 'b', 'c']);
}

const groups = groupByDir(['/a/x.png', '/a/y.png', '/b/z.png']);
assert.strictEqual(groups.length, 2);
assert.deepStrictEqual(groups[0], ['/a/x.png', '/a/y.png']);

// Store round trip
const tmp = path.join(os.tmpdir(), `w2x-test-${Date.now()}.json`);
const store = new Store(tmp);
const src = path.join(os.tmpdir(), 'src-test.png');
const out = path.join(os.tmpdir(), 'out-test.png');
fs.writeFileSync(out, 'x');
store.addMany([{ source: src, output: out, tag: 'artwork_medium_2x', settings: {} }]);
assert.ok(store.findOutput(src, 'artwork_medium_2x'));
assert.strictEqual(new Store(tmp).forSource(src).length, 1);
store.remove(store.forSource(src)[0].id);
assert.strictEqual(store.forSource(src).length, 0);
fs.rmSync(tmp, { force: true });
fs.rmSync(out, { force: true });

// copyTree: copies files, skips the skipped folder, reports bytes
{
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-copy-'));
  const src = path.join(base, 'src');
  const dst = path.join(base, 'dst');
  fs.mkdirSync(path.join(src, 'engine', 'python'), { recursive: true });
  fs.mkdirSync(path.join(src, 'staging'), { recursive: true });
  fs.writeFileSync(path.join(src, 'engine', 'python', 'python.exe'), 'abc');
  fs.writeFileSync(path.join(src, 'settings.json'), '{}');
  fs.writeFileSync(path.join(src, 'staging', 'junk.tmp'), 'zzz');
  const r = copyTree(src, dst, null, (rel) => rel.split(path.sep)[0] === 'staging');
  assert.strictEqual(r.files, 2);
  assert.strictEqual(r.bytes, 5);
  assert.ok(fs.existsSync(path.join(dst, 'engine', 'python', 'python.exe')));
  assert.ok(!fs.existsSync(path.join(dst, 'staging')));
  fs.rmSync(base, { recursive: true, force: true });
}

// progress formatting
const PG = require('../lib/progress');
assert.strictEqual(PG.fmtBytes(0), '0 B');
assert.strictEqual(PG.fmtBytes(250 * 1024 * 1024), '250 MB');
assert.strictEqual(PG.fmtBytes(2.5 * 1024 ** 3), '2.50 GB');
assert.strictEqual(PG.fmtTime(65), '1:05');
assert.strictEqual(PG.fmtTime(3725), '1:02:05');
assert.strictEqual(PG.fmtTime(NaN), '–');
assert.strictEqual(PG.fmtRate(0, 'bytes'), '');
assert.strictEqual(PG.fmtRate(5 * 1024 * 1024, 'bytes'), '5.00 MB/s');

// Font file names -> family, weight, style
{
  const { describeFontFile: d } = require('../lib/fontfile');
  const a = d('C:\\Fonts\\Satoshi-BoldItalic.otf');
  assert.deepStrictEqual([a.family, a.weight, a.style, a.name], ['Satoshi', 700, 'italic', 'Satoshi-BoldItalic.otf']);
  assert.deepStrictEqual([d('C:\\F\\CabinetGrotesk-Medium.woff2').family, d('C:\\F\\CabinetGrotesk-Medium.woff2').weight], ['Cabinet Grotesk', 500]);
  assert.strictEqual(d('C:\\F\\Inter[wght].ttf').weight, '100 900');
  assert.strictEqual(d('/x/Clash Display Semibold.otf').family, 'Clash Display');
}

// Theme engine: default look, repair of bad input, accent text contrast, every preset readable
{
  const T = require('../lib/theme');
  const d = T.normalize(T.DEFAULT_THEME);
  assert.strictEqual(T.describe(d).text, 'Obsidian · Lime → Teal · Inter · Standard · Compact');
  const bad = T.normalize({ background: { ground: 'nope' }, accent: { stops: ['#abc', 'bad'], angle: 900 }, font: { size: 99 }, density: { control: 3 } });
  assert.strictEqual(bad.background.ground, d.background.ground);
  assert.deepStrictEqual(bad.accent.stops, ['#aabbcc']);
  assert.strictEqual(bad.accent.angle, 360);
  assert.strictEqual(bad.font.size, 16);
  assert.strictEqual(bad.density.control, 24);
  assert.strictEqual(T.onAccent(d), '#0b0c0f');
  assert.strictEqual(T.onAccent(T.normalize({ accent: { stops: ['#1f5fd6'] } })), '#ffffff');
  for (const [k, b] of Object.entries(T.BACKGROUNDS)) {
    for (const f of ['text', 'sec', 'faint']) assert.ok(T.contrast(b[f], b.panel) >= 4.5, `${k}.${f} contrast`);
  }
  for (const [k, a] of Object.entries(T.ACCENTS)) {
    const t = T.normalize({ accent: { stops: a.stops } });
    assert.ok(Math.min(...a.stops.map((c) => T.contrast(T.onAccent(t), c))) >= 4.5, `${k} accent text contrast`);
  }
  const v = T.cssVars(d);
  assert.strictEqual(v.grad, 'linear-gradient(90deg, #b6f05a, #2fd6b4)');
  assert.strictEqual(v.ch, '28px');
  assert.strictEqual(T.cssVars(T.withBackground(d, 'daylight')).scheme, 'light');
}

// The page's scripts share one global scope, and Electron's preload already put a read-only
// `api` there. A top-level name in a lib script that clashes with it (v0.3.0 had `const api`)
// stops the whole page from starting. Load them all together the way index.html does.
{
  const vm = require('vm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.ok(srcs.length >= 4, 'index.html scripts');
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext("Object.defineProperty(globalThis, 'api', { value: {}, writable: false, configurable: false, enumerable: true });", ctx);
  for (const src of srcs.filter((s) => s !== 'app.js')) {
    const file = path.join(__dirname, '..', 'renderer', src);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: src });
  }
  assert.ok(ctx.Presets && ctx.Progress && ctx.Theme, 'lib scripts expose their globals');
  // app.js keeps everything inside one function too
  assert.ok(/^\s*(?:'use strict';\s*)?\(\s*(?:async\s*)?(?:function|\()/m.test(fs.readFileSync(path.join(__dirname, '..', 'renderer', 'app.js'), 'utf8').split('\n').slice(0, 3).join('\n')), 'app.js is wrapped');
}

// ---------------------------------------------------------------------------------------------
// GPU: PyTorch build for the driver, and the diagnosis verdicts
{
  const G = require('../lib/gpu');
  assert.strictEqual(G.chooseBuild(13020), 'cu132');
  assert.strictEqual(G.chooseBuild(13040), 'cu132');
  assert.strictEqual(G.chooseBuild(13000), 'cu130');
  assert.strictEqual(G.chooseBuild(12080), 'cu126');
  assert.strictEqual(G.chooseBuild(12000), 'cu126');
  assert.strictEqual(G.chooseBuild(11080), null);
  assert.strictEqual(G.chooseBuild(null), null);
  assert.strictEqual(G.buildOfTorch('2.14.1+cu132'), 'cu132');
  assert.strictEqual(G.buildOfTorch('2.14.1+cpu'), 'cpu');
  assert.strictEqual(G.cudaText(13020), '13.2');
  assert.strictEqual(G.parseCudaText('12.6'), 12060);
  assert.strictEqual(G.nvidiaVersionFromWindows('32.0.15.9597'), '595.97');
  assert.strictEqual(G.nvidiaVersionFromWindows('31.0.15.6603'), '566.03');
  const head = G.parseSmiHeader('| NVIDIA-SMI 566.03   Driver Version: 566.03   CUDA Version: 12.7 |');
  assert.deepStrictEqual(head, { cuda: 12070, driver: '566.03' });
  assert.deepStrictEqual(G.parseSmiQuery('0, NVIDIA GeForce RTX 3060 Laptop GPU, 595.97, 6144, 87, 3120, 71\n')[0],
    { index: 0, name: 'NVIDIA GeForce RTX 3060 Laptop GPU', driver: '595.97', memTotal: 6144, util: 87, memUsed: 3120, temp: 71 });

  // nunif's requirements-torch.txt, with the build tag swapped everywhere
  const nunifReq = '--extra-index-url https://download.pytorch.org/whl/cpu\n--extra-index-url https://download.pytorch.org/whl/cu132\ntorch==2.14.1+cu132; sys_platform == "win32"\ntorchvision==0.29.1+cu132; sys_platform == "win32"\n';
  const r126 = G.torchRequirements(nunifReq, 'cu126');
  assert.ok(r126.includes('whl/cu126') && r126.includes('torch==2.14.1+cu126') && r126.includes('torchvision==0.29.1+cu126') && !r126.includes('cu132'));
  assert.ok(r126.includes('whl/cpu'));
  assert.throws(() => G.torchRequirements(nunifReq, 'cu999'));

  const laptop = { adapters: [
    { name: 'AMD Radeon(TM) Graphics', status: 'OK', problem: 0, present: true, driverVersion: '31.0.21921.1000' },
    { name: 'NVIDIA GeForce RTX 3060 Laptop GPU', status: 'OK', problem: 0, present: true, driverVersion: '31.0.15.6603' },
  ] };
  // Driver 566 (CUDA 12.7) with the CUDA 13.2 build: the most likely case. Repair offers CUDA 12.6.
  const old = G.analyze({ windows: laptop, smi: { driver: '566.03', cuda: 12070, gpus: [] },
    python: { torch: '2.14.1+cu132', torch_cuda: '13.2', driver_cuda: 12070, nvcuda: true, cu_init: 0, available: false, warnings: ['CUDA initialization: The NVIDIA driver on your system is too old (found version 12070).'] } });
  assert.strictEqual(old.status, 'cpu');
  assert.strictEqual(old.bestBuild, 'cu126');
  assert.ok(old.canRepair);
  assert.ok(old.findings.some((f) => f.level === 'error' && /needs CUDA 13\.2.*only supports CUDA 12\.7/.test(f.title) && f.action === 'repair'));
  assert.ok(old.findings.some((f) => f.level === 'info' && /Two GPUs/.test(f.title)), 'explains the two GPUs');
  assert.ok(/Main problem: PyTorch needs CUDA 13\.2/.test(old.summary));

  // Everything right
  const ok = G.analyze({ windows: laptop, smi: { driver: '595.97', cuda: 13020, gpus: [] },
    python: { torch: '2.14.1+cu132', torch_cuda: '13.2', driver_cuda: 13020, nvcuda: true, cu_init: 0, available: true, compute_ok: true, arch_list: ['sm_75', 'sm_80', 'sm_86'],
      devices: [{ index: 0, name: 'NVIDIA GeForce RTX 3060 Laptop GPU', cap: '8.6', mem: 6442450944 }] } });
  assert.strictEqual(ok.status, 'ok');
  assert.ok(!ok.findings.some((f) => f.level === 'error'));
  assert.ok(!ok.canRepair);
  assert.strictEqual(ok.summary, 'Upscaling runs on NVIDIA GeForce RTX 3060 Laptop GPU.');

  // Disabled in Device Manager
  const dis = G.analyze({ windows: { adapters: [laptop.adapters[0], { ...laptop.adapters[1], problem: 22, status: 'Error' }] }, smi: null,
    python: { torch: '2.14.1+cu132', torch_cuda: '13.2', nvcuda: true, cu_init: 100, available: false } });
  assert.ok(dis.findings.some((f) => /it is disabled/.test(f.title) && /Enable device/.test(f.fix)));
  assert.ok(dis.findings.some((f) => /no CUDA-capable device/.test(f.title)));

  // NVIDIA GPU switched off: Windows only sees the AMD GPU
  const off = G.analyze({ windows: { adapters: [laptop.adapters[0]] }, smi: null, python: { torch: '2.14.1+cu132', torch_cuda: '13.2', nvcuda: false, nvcuda_error: 'OSError', available: false } });
  assert.ok(off.findings[0].level === 'error' && /doesn't see an NVIDIA GPU/.test(off.findings[0].title));

  // CUDA_VISIBLE_DEVICES hides the GPU; a CPU-only build
  const env = G.analyze({ windows: laptop, smi: { driver: '595.97', cuda: 13020 }, python: { torch: '2.14.1+cpu', torch_cuda: null, env_cvd: '-1', nvcuda: true, cu_init: 0, available: false } });
  assert.ok(env.findings.some((f) => /CUDA_VISIBLE_DEVICES/.test(f.title)));
  assert.ok(env.findings.some((f) => /CPU-only build/.test(f.title) && f.action === 'repair'));
  assert.strictEqual(env.bestBuild, 'cu132');

  // Engine not installed yet: Windows and driver checks only
  const pre = G.analyze({ windows: laptop, smi: { driver: '595.97', cuda: 13020 }, python: { skipped: 'The engine is not installed yet.' } });
  assert.strictEqual(pre.status, 'unknown');

  // Windows adapter list merges Get-PnpDevice and WMI
  const m = G.mergeAdapters({ pnp: [{ FriendlyName: 'NVIDIA GeForce RTX 3060 Laptop GPU', Status: 'Error', Problem: 43, InstanceId: 'PCI\\VEN_10DE', Present: true }],
    video: { Name: 'NVIDIA GeForce RTX 3060 Laptop GPU', DriverVersion: '32.0.15.9597', PNPDeviceID: 'PCI\\VEN_10DE', ConfigManagerErrorCode: 43 } });
  assert.deepStrictEqual(m.adapters[0], { name: 'NVIDIA GeForce RTX 3060 Laptop GPU', status: 'Error', problem: 43, present: true, driverVersion: '32.0.15.9597' });

  // A device choice reaches waifu2x as --gpu; the CPU is -1
  assert.ok(P.buildArgs({}, 'L', 'O', { gpu: -1 }).join(' ').includes('--gpu -1 -i L'));
  assert.ok(!P.buildArgs({}, 'L', 'O', {}).includes('--gpu'));

  // Failure messages
  const { explainFailure } = require('../lib/runner');
  assert.ok(/smaller Tile size/.test(explainFailure(['torch.OutOfMemoryError: CUDA out of memory. Tried to allocate'])));
  assert.ok(/Diagnose GPU/.test(explainFailure(['ValueError: No cuda/mps/xpu available. Use `--gpu -1` for CPU.'])));
  assert.strictEqual(explainFailure(['something else']), null);
}

// Image sizes from file headers (no decoding): PNG, JPEG (size marker after other segments), WebP, BMP, GIF
{
  const { sizeFromBuffer, imageSize } = require('../lib/fsutil');
  const png = Buffer.alloc(24); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(640, 16); png.writeUInt32BE(480, 20);
  assert.deepStrictEqual(sizeFromBuffer(png), { w: 640, h: 480 });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x03, 0x00, 0xff, 0xc2, 0x00, 0x11, 0x08, 0x02, 0xbc, 0x01, 0xf4, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepStrictEqual(sizeFromBuffer(jpeg), { w: 500, h: 700 });
  assert.strictEqual(sizeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x40, 0x00, 0, 0, 0, 0, 0, 0])), undefined, 'JPEG marker beyond the buffer: read more');
  const webp = Buffer.alloc(30); webp.write('RIFF', 0, 'latin1'); webp.write('WEBP', 8, 'latin1'); webp.write('VP8X', 12, 'latin1'); webp.writeUIntLE(1919, 24, 3); webp.writeUIntLE(1079, 27, 3);
  assert.deepStrictEqual(sizeFromBuffer(webp), { w: 1920, h: 1080 });
  const bmp = Buffer.alloc(26); bmp.write('BM', 0, 'latin1'); bmp.writeInt32LE(300, 18); bmp.writeInt32LE(-200, 22);
  assert.deepStrictEqual(sizeFromBuffer(bmp), { w: 300, h: 200 });
  const gif = Buffer.from('GIF89a\x40\x01\xf0\x00', 'latin1');
  assert.deepStrictEqual(sizeFromBuffer(gif), { w: 320, h: 240 });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-size-'));
  fs.writeFileSync(path.join(tmp, 'a.png'), png);
  assert.deepStrictEqual(imageSize(path.join(tmp, 'a.png')), { w: 640, h: 480 });
  assert.strictEqual(imageSize(path.join(tmp, 'missing.png')), null);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Finishing a set: keep the best version (with or without the original), delete one file.
// "trash" stands in for the Recycle Bin. Kept folders are never scanned again.
{
  const S = require('../lib/sets');
  const { listImages, KEPT_DIR, ORIGINALS_DIR } = require('../lib/fsutil');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-sets-'));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'w2x-bin-'));
  const trashed = [];
  const trash = async (p) => { trashed.push(p); fs.renameSync(p, path.join(bin, path.basename(p))); };
  const mk = (n) => { const p = path.join(tmp, n); fs.writeFileSync(p, n); return p; };
  const store = new Store(path.join(tmp, 'variants.json'));
  const src = mk('girl.png');
  store.addMany([
    { source: src, output: mk('girl__artwork_medium_2x.png'), tag: 'artwork_medium_2x', settings: {} },
    { source: src, output: mk('girl__artwork_high_2x.png'), tag: 'artwork_high_2x', settings: {} },
    { source: src, output: path.join(tmp, 'girl__gone.png'), tag: 'gone', settings: {} },
  ]);
  const best = store.forSource(src).find((v) => v.tag === 'artwork_high_2x');
  (async () => {
    const r = await S.keepBest({ store, source: src, variantId: best.id, keepOriginal: true, trash });
    assert.strictEqual(r.kept, path.join(tmp, KEPT_DIR, 'girl__artwork_high_2x.png'));
    assert.strictEqual(r.original, path.join(tmp, ORIGINALS_DIR, 'girl.png'));
    assert.deepStrictEqual(r.trashed, [path.join(tmp, 'girl__artwork_medium_2x.png')]);
    assert.ok(fs.existsSync(r.kept) && fs.existsSync(r.original) && !fs.existsSync(src));
    assert.ok(store.resolvedSet().has(src) && !store.forSource(src).length);
    assert.deepStrictEqual(listImages(tmp, true), [], 'kept folders are not scanned');

    // Keep only: the original goes to the bin as well; a name clash in Upscaled Images gets " (2)"
    const src2 = mk('girl2.png');
    fs.writeFileSync(path.join(tmp, KEPT_DIR, 'girl2__a.png'), 'old');
    store.addMany([{ source: src2, output: mk('girl2__a.png'), tag: 'a', settings: {} }]);
    const r2 = await S.keepBest({ store, source: src2, variantId: store.forSource(src2)[0].id, keepOriginal: false, trash });
    assert.strictEqual(r2.kept, path.join(tmp, KEPT_DIR, 'girl2__a (2).png'));
    assert.ok(r2.trashed.includes(src2) && r2.original === null);

    // Delete: a set stays until its last file is gone
    const src3 = mk('cat.png');
    store.addMany([{ source: src3, output: mk('cat__a.png'), tag: 'a', settings: {} }]);
    const d1 = await S.deleteFile({ store, source: src3, which: 'orig', trash });
    assert.strictEqual(d1.resolved, false);
    const d2 = await S.deleteFile({ store, source: src3, which: store.forSource(src3)[0].id, trash });
    assert.strictEqual(d2.resolved, true);
    assert.ok(store.resolvedSet().has(src3));
    await assert.rejects(S.keepBest({ store, source: src3, variantId: 'nope', keepOriginal: true, trash }));
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
    console.log('Set actions passed.');
  })().catch((e) => { console.error(e); process.exit(1); });
}

console.log('All tests passed.');
