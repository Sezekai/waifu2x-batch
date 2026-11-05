'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const P = require('../lib/presets');
const { Store } = require('../lib/store');
const { groupByDir } = require('../lib/runner');
const { copyTree } = require('../lib/fsutil');

// Website defaults: Artwork, Medium noise, 2x
assert.deepStrictEqual(P.buildArgs({ style: 'artwork', noise: 'medium', scale: '2x' }, 'L.txt', 'OUT'), [
  '-m', 'noise_scale', '-n', '2', '--style', 'art', '-f', 'png', '--tile-size', '256', '-i', 'L.txt', '-o', 'OUT',
]);

// No noise reduction, 4x, photo style: no -n flag
assert.deepStrictEqual(P.buildArgs({ noise: 'none', scale: '4x', style: 'photo' }, 'L', 'O'), [
  '-m', 'scale4x', '--style', 'photo', '-f', 'png', '--tile-size', '256', '-i', 'L', '-o', 'O',
]);

// Noise only, with TTA
assert.deepStrictEqual(P.buildArgs({ noise: 'high', scale: 'none', tta: true }, 'L', 'O'), [
  '-m', 'noise', '-n', '3', '--style', 'art', '-f', 'png', '--tile-size', '256', '--tta', '-i', 'L', '-o', 'O',
]);

assert.throws(() => P.buildArgs({ noise: 'none', scale: 'none' }, 'L', 'O'));
assert.throws(() => P.buildArgs({ style: 'nope' }, 'L', 'O'));

assert.strictEqual(P.tagFor({ style: 'artwork', noise: 'medium', scale: '2x' }), 'artwork_medium_2x');
assert.strictEqual(P.tagFor({ style: 'photo', noise: 'none', scale: '4x', tta: true }), 'photo_none_4x_tta');

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

console.log('All tests passed.');
