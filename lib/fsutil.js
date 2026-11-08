'use strict';
const fs = require('fs');
const path = require('path');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

// Folders the app itself fills when you keep a best version. They are never scanned, so kept images
// don't show up again as new work.
const KEPT_DIR = 'Upscaled Images';
const ORIGINALS_DIR = 'Upscaled Images - Originals';
const SKIP_DIRS = new Set([KEPT_DIR, ORIGINALS_DIR].map((d) => d.toLowerCase()));

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
        if (recursive && !SKIP_DIRS.has(e.name.toLowerCase())) walk(full);
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

// Width and height from the file header, without decoding the image. PNG, JPEG, WebP, BMP and GIF.
function readHead(fd, bytes) {
  const buf = Buffer.alloc(bytes);
  const n = fs.readSync(fd, buf, 0, bytes, 0);
  return buf.subarray(0, n);
}
function sizeFromBuffer(b) {
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length >= 26 && b[0] === 0x42 && b[1] === 0x4d) return { w: Math.abs(b.readInt32LE(18)), h: Math.abs(b.readInt32LE(22)) };
  if (b.length >= 10 && b.toString('latin1', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.length >= 30 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8 ' && b.length >= 30) return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L' && b.length >= 25) {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8X' && b.length >= 30) return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    return null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
    return undefined; // marker not in this part of the file: read more
  }
  return null;
}
function imageSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    // JPEG metadata (EXIF thumbnails) can push the size marker far in, so read more until found.
    for (const bytes of [65536, 1048576, 8388608]) {
      const r = sizeFromBuffer(readHead(fd, bytes));
      if (r !== undefined) return r && r.w > 0 && r.h > 0 ? r : null;
    }
    return null;
  } catch (_) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// A free name in dir: "name.png", then "name (2).png", "name (3).png"...
function freeName(dir, fileName) {
  const ext = path.extname(fileName);
  const stem = fileName.slice(0, fileName.length - ext.length);
  let p = path.join(dir, fileName);
  let n = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${stem} (${n++})${ext}`);
  return p;
}

// Moves a file into dir without overwriting anything. Rename first; copy + delete across drives.
function moveInto(file, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const dest = freeName(dir, path.basename(file));
  try {
    fs.renameSync(file, dest);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    fs.copyFileSync(file, dest);
    fs.unlinkSync(file);
  }
  return dest;
}

// Output sits next to the source: name__tag.png, never overwriting an existing file.
function uniquePath(dir, base, tag) {
  let p = path.join(dir, `${base}__${tag}.png`);
  let n = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${base}__${tag}_${n++}.png`);
  return p;
}

// Copies a folder tree file by file, reporting bytes done. skip(relPath) returns true to leave a path out.
function copyTree(src, dst, onProgress, skip) {
  const files = [];
  let total = 0;
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const rel = path.relative(src, full);
      if (skip && skip(rel)) continue;
      if (e.isDirectory()) scan(full);
      else if (e.isFile()) {
        const size = fs.statSync(full).size;
        files.push({ full, rel, size });
        total += size;
      }
    }
  };
  scan(src);

  let done = 0;
  for (const f of files) {
    const to = path.join(dst, f.rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(f.full, to);
    done += f.size;
    if (onProgress) onProgress(done, total, f.rel);
  }
  return { files: files.length, bytes: total };
}

module.exports = { IMAGE_EXT, KEPT_DIR, ORIGINALS_DIR, listImages, pngSize, imageSize, sizeFromBuffer, freeName, moveInto, uniquePath, copyTree };
