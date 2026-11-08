'use strict';
const fs = require('fs');
const crypto = require('crypto');

// Keeps a record of every upscale: which source it came from, which settings made it,
// and where the output file is. Lives in the app's data folder, not next to the images.
class Store {
  constructor(file) {
    this.file = file;
    this.data = { variants: [], resolved: [] };
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (d && Array.isArray(d.variants)) this.data = d;
      if (!Array.isArray(this.data.resolved)) this.data.resolved = [];
    } catch (_) {
      // first run, or unreadable file: start empty
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  addMany(records) {
    if (!records.length) return;
    for (const r of records) this.data.variants.push({ id: crypto.randomUUID(), ...r });
    this.save();
  }

  forSource(source) {
    return this.data.variants.filter((v) => v.source === source);
  }

  bySource() {
    const m = new Map();
    for (const v of this.data.variants) {
      if (!m.has(v.source)) m.set(v.source, []);
      m.get(v.source).push(v);
    }
    return m;
  }

  outputSet() {
    return new Set(this.data.variants.map((v) => v.output));
  }

  findOutput(source, tag) {
    return this.data.variants.find((v) => v.source === source && v.tag === tag && fs.existsSync(v.output)) || null;
  }

  byId(id) {
    return this.data.variants.find((v) => v.id === id) || null;
  }

  removeSource(source) {
    this.data.variants = this.data.variants.filter((v) => v.source !== source);
    this.save();
  }

  // Images whose set is finished (best version kept, or everything deleted). They are never listed
  // again, even if their folder is added again.
  markResolved(source, info) {
    this.data.resolved = this.data.resolved.filter((r) => r.source !== source);
    this.data.resolved.push({ source, at: new Date().toISOString(), ...(info || {}) });
    this.save();
  }

  resolvedSet() {
    return new Set(this.data.resolved.map((r) => r.source));
  }

  // Removes the record only. The image file stays on disk.
  remove(id) {
    this.data.variants = this.data.variants.filter((v) => v.id !== id);
    this.save();
  }
}

module.exports = { Store };
