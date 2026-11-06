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

console.log('All tests passed.');
