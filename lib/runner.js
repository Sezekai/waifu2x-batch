'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { buildArgs, tagFor, normalize } = require('./presets');
const { uniquePath } = require('./fsutil');

// Groups files by folder. nunif writes all outputs of one run into one folder,
// so each source folder gets its own run and its outputs are moved back next to the sources.
function groupByDir(files) {
  const m = new Map();
  for (const f of files) {
    const d = path.dirname(f);
    if (!m.has(d)) m.set(d, []);
    m.get(d).push(f);
  }
  return [...m.values()];
}

function countPng(dir) {
  try {
    return fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.png')).length;
  } catch (_) {
    return 0;
  }
}

function runJob({ jobId, items, settings, python, nunifPath, stagingRoot, store, onProgress }) {
  const s = normalize(settings);
  const tag = tagFor(s);
  const jobDir = path.join(stagingRoot, jobId);
  const ctl = { cancelled: false, proc: null };
  const c = { total: items.length, processed: 0, skipped: 0, made: 0, failed: 0 };
  const emit = (extra) => onProgress({ jobId, ...c, ...(extra || {}) });

  const promise = (async () => {
    fs.mkdirSync(jobDir, { recursive: true });

    const todo = [];
    for (const f of items) {
      if (store.findOutput(f, tag)) {
        c.skipped++;
        c.processed++;
      } else {
        todo.push(f);
      }
    }
    emit({ message: `${todo.length} to upscale, ${c.skipped} already done with these settings` });

    let gi = 0;
    for (const group of groupByDir(todo)) {
      if (ctl.cancelled) break;
      gi++;
      const stage = path.join(jobDir, `out${gi}`);
      fs.mkdirSync(stage, { recursive: true });
      const listFile = path.join(jobDir, `list${gi}.txt`);
      fs.writeFileSync(listFile, group.join('\n'), 'utf8');

      const base = c.processed;
      const log = [];
      const pushLog = (buf) => {
        for (const line of String(buf).split(/\r?\n/)) if (line.trim()) log.push(line);
        if (log.length > 40) log.splice(0, log.length - 40);
      };

      const timer = setInterval(() => {
        emit({ processed: base + Math.min(countPng(stage), group.length) });
      }, 1000);

      const code = await new Promise((resolve) => {
        let proc;
        try {
          proc = spawn(python, ['-u', '-m', 'waifu2x.cli', ...buildArgs(s, listFile, stage)], {
            cwd: nunifPath,
            windowsHide: true,
            env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
          });
        } catch (e) {
          log.push(e.message);
          return resolve(-1);
        }
        ctl.proc = proc;
        proc.stdout.on('data', pushLog);
        proc.stderr.on('data', pushLog);
        proc.on('error', (e) => {
          log.push(e.message);
          resolve(-1);
        });
        proc.on('close', (exitCode) => resolve(exitCode));
      });
      clearInterval(timer);

      const produced = new Map();
      try {
        for (const n of fs.readdirSync(stage)) {
          if (n.toLowerCase().endsWith('.png')) produced.set(path.parse(n).name, n);
        }
      } catch (_) {
        // nothing produced
      }

      const recs = [];
      for (const f of group) {
        const name = path.parse(f).name;
        const hit = produced.get(name);
        if (hit) {
          const from = path.join(stage, hit);
          const dest = uniquePath(path.dirname(f), name, tag);
          fs.copyFileSync(from, dest); // copy then delete: staging may be on another drive
          fs.unlinkSync(from);
          recs.push({ source: f, output: dest, tag, settings: s, createdAt: new Date().toISOString() });
          c.made++;
          c.processed++;
        } else if (!ctl.cancelled) {
          c.failed++;
          c.processed++;
        }
      }
      store.addMany(recs);

      if (code !== 0 && !ctl.cancelled) {
        emit({ message: `Folder ${gi} stopped with exit code ${code}:\n${log.slice(-8).join('\n')}` });
      } else {
        emit({});
      }
      fs.rmSync(stage, { recursive: true, force: true });
    }

    fs.rmSync(jobDir, { recursive: true, force: true });
    emit({
      finished: true,
      cancelled: ctl.cancelled,
      message: ctl.cancelled
        ? 'Cancelled.'
        : `Finished: ${c.made} made, ${c.skipped} skipped, ${c.failed} failed.`,
    });
  })().catch((e) => emit({ finished: true, message: `Error: ${e.message}` }));

  return {
    promise,
    cancel() {
      ctl.cancelled = true;
      if (ctl.proc) {
        try {
          ctl.proc.kill();
        } catch (_) {
          // already exited
        }
      }
    },
  };
}

module.exports = { runJob, groupByDir };
