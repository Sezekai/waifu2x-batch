'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { buildArgs, tagFor, normalize } = require('./presets');
const { uniquePath } = require('./fsutil');
const { pyArgs, cleanEnv } = require('./pyenv');

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

// nunif names each output "<name without extension>.png", so "a.jpg" and "a.png" in one folder
// would overwrite each other within one run. Windows names ignore case, so "A.jpg" and "a.png"
// clash too. Files are split into runs so no two in the same run share a name.
function planRuns(files) {
  const runs = [];
  for (const group of groupByDir(files)) {
    const batches = [];
    for (const f of group) {
      const stem = path.parse(f).name.toLowerCase();
      let b = batches.find((x) => !x.stems.has(stem));
      if (!b) {
        b = { stems: new Set(), files: [] };
        batches.push(b);
      }
      b.stems.add(stem);
      b.files.push(f);
    }
    for (const b of batches) runs.push(b.files);
  }
  return runs;
}

// nunif reads the list file with Python's csv module, so a comma in a filename would split the
// path. Every path is written as a quoted CSV field. Windows paths can't contain quotes, but any
// quote is doubled anyway, as CSV requires.
function listFileText(files) {
  return files.map((f) => `"${f.replace(/"/g, '""')}"`).join('\n') + '\n';
}

function producedStems(dir) {
  try {
    return new Set(fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.png')).map((n) => path.parse(n).name.toLowerCase()));
  } catch (_) {
    return new Set();
  }
}

// Turns the usual waifu2x failures into something actionable.
function explainFailure(log) {
  const text = log.join('\n');
  if (/out of memory/i.test(text)) return 'The GPU ran out of video memory. Choose a smaller Tile size (for example 128) and run it again.';
  if (/No cuda\/mps\/xpu available/i.test(text)) return "PyTorch can't see the NVIDIA GPU. Open Engine and click Diagnose GPU.";
  if (/invalid device ordinal/i.test(text)) return 'That GPU number does not exist. On the Engine screen, set "Upscale on" to Auto.';
  return null;
}

function runJob({ jobId, items, settings, python, nunifPath, stagingRoot, store, onProgress, gpu }) {
  const s = normalize(settings);
  const tag = tagFor(s);
  const jobDir = path.join(stagingRoot, jobId);
  const ctl = { cancelled: false, proc: null };
  const c = { total: items.length, processed: 0, skipped: 0, made: 0, failed: 0 };
  const emit = (extra) => onProgress({ jobId, ...c, ...(extra || {}) });

  const promise = (async () => {
    fs.mkdirSync(jobDir, { recursive: true });

    const todo = [];
    const finished = [];
    const failed = [];
    for (const f of items) {
      if (store.findOutput(f, tag)) {
        c.skipped++;
        c.processed++;
        finished.push(f);
      } else {
        todo.push(f);
      }
    }
    emit({ message: `${todo.length} to upscale, ${c.skipped} already done with these settings` });

    let gi = 0;
    for (const group of planRuns(todo)) {
      if (ctl.cancelled) break;
      gi++;
      const stage = path.join(jobDir, `out${gi}`);
      fs.mkdirSync(stage, { recursive: true });
      const listFile = path.join(jobDir, `list${gi}.txt`);
      fs.writeFileSync(listFile, listFileText(group), 'utf8');

      const base = c.processed;
      const log = [];
      const pushLog = (buf) => {
        for (const line of String(buf).split(/\r\n|\r|\n/)) if (line.trim()) log.push(line);
        if (log.length > 40) log.splice(0, log.length - 40);
      };

      // Every second: which files of this run have an output yet, and which one is being worked on.
      const timer = setInterval(() => {
        const made = producedStems(stage);
        const doneNow = group.filter((f) => made.has(path.parse(f).name.toLowerCase()));
        const current = group.find((f) => !made.has(path.parse(f).name.toLowerCase())) || null;
        emit({ processed: base + Math.min(doneNow.length, group.length), doneFiles: [...finished, ...doneNow], failedFiles: [...failed], current });
      }, 1000);

      const code = await new Promise((resolve) => {
        let proc;
        try {
          proc = spawn(python, pyArgs(['-m', 'waifu2x.cli', ...buildArgs(s, listFile, stage, { gpu })]), {
            cwd: nunifPath,
            windowsHide: true,
            env: cleanEnv(),
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
          if (n.toLowerCase().endsWith('.png')) produced.set(path.parse(n).name.toLowerCase(), n);
        }
      } catch (_) {
        // nothing produced
      }

      const recs = [];
      for (const f of group) {
        const name = path.parse(f).name;
        const hit = produced.get(name.toLowerCase());
        if (hit) {
          const from = path.join(stage, hit);
          const dest = uniquePath(path.dirname(f), name, tag);
          fs.copyFileSync(from, dest); // copy then delete: staging may be on another drive
          fs.unlinkSync(from);
          recs.push({ source: f, output: dest, tag, settings: s, createdAt: new Date().toISOString() });
          finished.push(f);
          c.made++;
          c.processed++;
        } else if (!ctl.cancelled) {
          failed.push(f);
          c.failed++;
          c.processed++;
        }
      }
      store.addMany(recs);

      if (code !== 0 && !ctl.cancelled) {
        const why = explainFailure(log);
        emit({ error: true, gpuProblem: !!why && /GPU|PyTorch/.test(why), doneFiles: [...finished], failedFiles: [...failed], current: null,
          message: `${why ? why + '\n' : ''}Run ${gi} stopped with exit code ${code}:\n${log.slice(-8).join('\n')}` });
      } else {
        emit({ doneFiles: [...finished], failedFiles: [...failed], current: null });
      }
      fs.rmSync(stage, { recursive: true, force: true });
    }

    fs.rmSync(jobDir, { recursive: true, force: true });
    emit({
      finished: true,
      cancelled: ctl.cancelled,
      doneFiles: [...finished],
      failedFiles: [...failed],
      current: null,
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

module.exports = { runJob, groupByDir, planRuns, listFileText, explainFailure };
