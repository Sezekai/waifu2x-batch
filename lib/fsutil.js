'use strict';
const fs = require('fs');
const path = require('path');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

function listImages(folder, recursive) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (recursive) walk(full);
      } else if (IMAGE_EXT.has(path.extname(e.name).toLowerCase())) {
        out.push(full);
      }
    }
  };
  walk(folder);
  return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Reads width and height from a PNG header without loading the image.
function pngSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(24);
    if (fs.readSync(fd, buf, 0, 24, 0) < 24) return null;
    if (buf.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch (_) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Output sits next to the source: name__tag.png, never overwriting an existing file.
function uniquePath(dir, base, tag) {
  let p = path.join(dir, `${base}__${tag}.png`);
  let n = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${base}__${tag}_${n++}.png`);
  return p;
}

module.exports = { IMAGE_EXT, listImages, pngSize, uniquePath };
