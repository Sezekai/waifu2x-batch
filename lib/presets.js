'use strict';
// Maps the settings shown on waifu2x.net to nunif's CLI options.
// Noise levels are taken from nunif's own website code (waifu2x/web/webgen/templates/index.html.tpl
// and server.py): None = no denoise, Low = 0, Medium = 1, High = 2, Highest = 3.
// Styles map the same way: Artwork = art, Artwork/Scans = art_scan, Photo = photo.

const STYLE_ARG = { artwork: 'art', artwork_scan: 'art_scan', photo: 'photo' };
const NOISE_LEVEL = { none: null, low: 0, medium: 1, high: 2, highest: 3 };
const SCALE_FACTOR = { none: 1, '2x': 2, '4x': 4 };
const DEFAULTS = { style: 'artwork', noise: 'medium', scale: '2x', tta: false, tileSize: 256 };

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function normalize(input) {
  const s = { ...DEFAULTS, ...(input || {}) };
  if (!has(STYLE_ARG, s.style)) throw new Error(`Unknown style "${s.style}"`);
  if (!has(NOISE_LEVEL, s.noise)) throw new Error(`Unknown noise setting "${s.noise}"`);
  if (!has(SCALE_FACTOR, s.scale)) throw new Error(`Unknown scale "${s.scale}"`);
  const tile = parseInt(s.tileSize, 10);
  return {
    style: s.style,
    noise: s.noise,
    scale: s.scale,
    tta: !!s.tta,
    tileSize: Number.isFinite(tile) ? Math.min(1024, Math.max(64, tile)) : 256,
  };
}

function chooseMethod(level, factor) {
  if (level === null && factor === 1) {
    throw new Error('Nothing to do: noise reduction and upscaling are both off');
  }
  if (level === null) return factor === 4 ? 'scale4x' : 'scale';
  if (factor === 1) return 'noise';
  return factor === 4 ? 'noise_scale4x' : 'noise_scale';
}

// Builds the argument list for: python -m waifu2x.cli <args>
// listFile is a text file with one absolute image path per line (nunif accepts this as -i).
function buildArgs(settings, listFile, outDir) {
  const s = normalize(settings);
  const level = NOISE_LEVEL[s.noise];
  const factor = SCALE_FACTOR[s.scale];
  const method = chooseMethod(level, factor);
  const args = ['-m', method];
  if (level !== null && method.startsWith('noise')) args.push('-n', String(level));
  args.push('--style', STYLE_ARG[s.style], '-f', 'png', '--tile-size', String(s.tileSize));
  if (s.tta) args.push('--tta');
  args.push('-i', listFile, '-o', outDir);
  return args;
}

// Short, filename-safe id for a settings set. Used in output names and to detect "already done".
function tagFor(settings) {
  const s = normalize(settings);
  return [s.style, s.noise, s.scale, s.tta ? 'tta' : null].filter(Boolean).join('_');
}

const api = { STYLE_ARG, NOISE_LEVEL, SCALE_FACTOR, DEFAULTS, normalize, chooseMethod, buildArgs, tagFor };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.Presets = api;
}
