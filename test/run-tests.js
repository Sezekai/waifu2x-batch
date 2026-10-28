'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const P = require('../lib/presets');
const { Store } = require('../lib/store');
const { groupByDir } = require('../lib/runner');

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

console.log('All tests passed.');
