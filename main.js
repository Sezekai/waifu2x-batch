'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { Store } = require('./lib/store');
const { listImages, pngSize, imageSize, copyTree } = require('./lib/fsutil');
const gpu = require('./lib/gpu');
const sets = require('./lib/sets');
const { runJob } = require('./lib/runner');
const { installEngine, fmtBytes } = require('./lib/engine');
const { pyArgs, cleanEnv } = require('./lib/pyenv');
const { FONT_EXT, describeFontFile } = require('./lib/fontfile');

// The app's data folder can be moved (e.g. to an external drive). A small pointer file in the
// default folder records where it is. This must run before the app is ready.
const DEFAULT_DATA_DIR = app.getPath('userData');
const POINTER_FILE = path.join(DEFAULT_DATA_DIR, 'location.json');
let missingDataDir = null;
(function applyDataLocation() {
  try {
    const p = JSON.parse(fs.readFileSync(POINTER_FILE, 'utf8')).dataDir;
    if (!p) return;
    if (fs.existsSync(p)) app.setPath('userData', p);
    else missingDataDir = p; // e.g. the external drive is unplugged: fall back to the default folder
  } catch (_) {
    // no pointer file: use the default location
  }
})();

let win = null;
let store = null;
let dataDir = null;
let settingsFile = null;
let engineBusy = false;

// Upscale jobs run one at a time. Starting another while one runs puts it in the queue.
const queue = [];
let running = null;
const busy = () => !!running || queue.length > 0;

const DEFAULT_SETTINGS = { python: 'python', nunifPath: '', gpu: 'auto' };

const CHECK_CODE = [
  'import sys, os',
  'print("python", sys.version.split()[0])',
  'import torch',
  'print("torch", torch.__version__, "| CUDA available:", torch.cuda.is_available())',
  'print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none (CPU only)")',
  'import waifu2x.cli',
  'print("waifu2x import: OK")',
  'print("pretrained models folder found:", os.path.isdir("waifu2x/pretrained_models"))',
].join('\n');

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(s) {
  fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

// Runs a short python command in the engine folder. Used for the setup check.
function runPython(args) {
  const cfg = readSettings();
  return new Promise((resolve) => {
    if (!cfg.nunifPath) return resolve({ code: -1, output: 'The engine is not installed yet. Use "Install engine" first.' });
    let out = '';
    let proc;
    try {
      proc = spawn(cfg.python, pyArgs(args), {
        cwd: cfg.nunifPath,
        windowsHide: true,
        env: cleanEnv(),
      });
    } catch (e) {
      return resolve({ code: -1, output: e.message });
    }
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (out += d));
    proc.on('error', (e) => resolve({ code: -1, output: `${out}\n${e.message}` }));
    proc.on('close', (code) => resolve({ code, output: out }));
  });
}

// ---------- appearance: theme settings and the user's own fonts, kept in the app data folder ----------
function appearanceFile() {
  return path.join(dataDir, 'appearance.json');
}
function readAppearance() {
  try {
    return JSON.parse(fs.readFileSync(appearanceFile(), 'utf8'));
  } catch (_) {
    return null;
  }
}
function fontsDir() {
  return path.join(dataDir, 'fonts');
}
function fontIndexFile() {
  return path.join(fontsDir(), 'index.json');
}
function readFontIndex() {
  try {
    const d = JSON.parse(fs.readFileSync(fontIndexFile(), 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch (_) {
    return [];
  }
}
function writeFontIndex(list) {
  fs.mkdirSync(fontsDir(), { recursive: true });
  fs.writeFileSync(fontIndexFile(), JSON.stringify(list, null, 2));
}
// The window has no menu bar. Its title bar is drawn by the page in the theme's colours; Windows
// still draws the minimise, maximise and close buttons, coloured to match (see 'window:titlebar').
// The overlay (Windows' own buttons) is 1px shorter than the page's 32px strip, so the strip's bottom
// line runs the full width, under the buttons too.
const TITLEBAR_HEIGHT = 32;
const OVERLAY_HEIGHT = TITLEBAR_HEIGHT - 1;
function titleBarColors(look) {
  const bg = (look && look.current && look.current.background) || {};
  return { color: bg.ground || '#0a0a0b', symbolColor: bg.sec || '#a0a0a7', height: OVERLAY_HEIGHT };
}

// Shortcuts kept from the old menu bar: Ctrl+Shift+I developer tools, Ctrl+Shift+R reload the window.
// F and F11 (full screen) are handled by the page, since what they do depends on the screen.
function windowShortcuts(e, input) {
  if (input.type !== 'keyDown') return;
  const key = String(input.key || '').toLowerCase();
  if (input.control && input.shift && key === 'i') {
    win.webContents.toggleDevTools();
    e.preventDefault();
  } else if (input.control && input.shift && key === 'r') {
    if (!busy() && !engineBusy) win.webContents.reload();
    e.preventDefault();
  }
}

function createWindow() {
  const look = readAppearance();
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: titleBarColors(look).color,
    title: 'Waifu2x Batch',
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarColors(look),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.on('before-input-event', windowShortcuts);
  win.on('enter-full-screen', () => send('window:state', { fullScreen: true }));
  win.on('leave-full-screen', () => send('window:state', { fullScreen: false }));
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (process.env.W2X_SMOKE) smokeTest(process.env.W2X_SMOKE);
}

// Startup check used by CI: prints renderer errors, saves a screenshot, and exits non-zero
// if the page script did not start (nothing would be clickable).
function smokeTest(outFile) {
  const errors = [];
  if (process.env.W2X_SMOKE_SIZE) {
    const [w, h] = process.env.W2X_SMOKE_SIZE.split('x').map(Number);
    win.setMinimumSize(Math.min(w, 1100), Math.min(h, 680));
    win.setSize(w, h);
  }
  const lines = [];
  const say = (t) => {
    console.log(t);
    lines.push(t);
  };
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    say(`[renderer:${level}] ${message} (${source}:${line})`);
    if (level >= 3) errors.push(message);
  });
  win.webContents.on('preload-error', (_e, p, err) => {
    say(`[preload-error] ${p}: ${err && err.stack}`);
    errors.push(String(err));
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => errors.push(`load failed ${code} ${desc} ${url}`));
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      let ready = false;
      try {
        ready = await win.webContents.executeJavaScript('window.__appReady === true');
      } catch (e) {
        errors.push(e.message);
      }
      try {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(outFile, img.toPNG());
      } catch (_) {}
      // Optional scripted steps (W2X_SMOKE_STEPS: a .js file exporting [{ name, js, wait }]): each runs
      // in the page, then a screenshot named after the step is saved next to the main one.
      if (ready && process.env.W2X_SMOKE_STEPS) {
        const steps = require(path.resolve(process.env.W2X_SMOKE_STEPS));
        for (const st of steps) {
          try {
            const out = await win.webContents.executeJavaScript(`(async () => { ${st.js || ''} })()`, true);
            if (out !== undefined) say(`[step ${st.name}] ${typeof out === 'string' ? out : JSON.stringify(out)}`);
          } catch (e) {
            errors.push(`step ${st.name}: ${e.message}`);
          }
          await new Promise((r) => setTimeout(r, st.wait || 400));
          if (st.shot !== false) {
            try {
              const img = await win.webContents.capturePage();
              fs.writeFileSync(outFile.replace(/\.png$/i, '') + `-${st.name}.png`, img.toPNG());
            } catch (_) {}
          }
        }
      }
      say(`SMOKE ready=${ready} errors=${errors.length}`);
      for (const e of errors) say(`  error: ${e}`);
      try {
        fs.writeFileSync(outFile.replace(/\.png$/i, '') + '.log', lines.join('\n') + '\n');
      } catch (_) {}
      app.exit(ready && !errors.length ? 0 : 1);
    }, 2500);
  });
}

// The install log is kept in the data folder, so you can open it to see what is happening.
function engineLogFile() {
  return path.join(dataDir, 'engine', 'install.log');
}
function writeLog(text) {
  try {
    fs.mkdirSync(path.dirname(engineLogFile()), { recursive: true });
    fs.appendFileSync(engineLogFile(), text);
  } catch (_) {
    // logging must never stop the install
  }
}

// Only true once the whole install has finished. python.exe alone is not enough, since PyTorch comes later.
function engineInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, 'engine', 'ready.json'), 'utf8'));
  } catch (_) {
    return null;
  }
}

// GPU state: the newest of the install test (ready.json) and the last Diagnose GPU (gpu.json).
function gpuFile() {
  return path.join(dataDir, 'engine', 'gpu.json');
}
function gpuReportFile() {
  return path.join(dataDir, 'engine', 'gpu-report.txt');
}
function lastDiag() {
  try {
    return JSON.parse(fs.readFileSync(gpuFile(), 'utf8'));
  } catch (_) {
    return null;
  }
}
function gpuStatus() {
  const ready = engineInfo();
  const diag = lastDiag();
  const readyAt = ready ? Date.parse(ready.installedAt) || 0 : 0;
  const diagAt = diag ? Date.parse(diag.at) || 0 : 0;
  if (diag && diag.result && diagAt >= readyAt && diag.result.status !== 'unknown') {
    const dev = (diag.result.devices || [])[0];
    return { available: diag.result.status === 'ok', device: dev ? dev.name : null, devices: diag.result.devices || [], from: 'diagnose', at: diag.at };
  }
  if (ready) return { available: !!ready.cuda, device: ready.gpu || null, devices: ready.gpu ? [{ index: 0, name: ready.gpu }] : [], from: 'install', at: ready.installedAt };
  return { available: null, device: null, devices: [], from: null };
}
// Which device a job uses. Auto: the NVIDIA GPU when PyTorch can see it, otherwise the CPU.
function gpuChoice() {
  const want = readSettings().gpu;
  const stat = gpuStatus();
  if (want === 'cpu') return { gpu: -1, device: 'CPU', chosen: true };
  if (Number.isInteger(want)) {
    const d = stat.devices.find((x) => x.index === want);
    return { gpu: want, device: d ? d.name : `GPU ${want}`, chosen: true };
  }
  if (stat.available === false) return { gpu: -1, device: 'CPU', fallback: true };
  return { gpu: undefined, device: stat.device || 'NVIDIA GPU' };
}

function engineInstalled() {
  return (
    fs.existsSync(path.join(dataDir, 'engine', 'ready.json')) &&
    fs.existsSync(path.join(dataDir, 'engine', 'python', 'python.exe'))
  );
}

// Moves the whole app data folder (engine, settings, version list) to a new place.
// Order matters: copy, then update settings and pointer, then delete the old copy. If anything
// fails before the delete, the old data is still intact.
async function moveDataFolder() {
  if (busy() || engineBusy) throw new Error('Stop the running task first.');
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose a folder on the external drive',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled) return { ok: false, cancelled: true };

  const target = path.join(r.filePaths[0], 'Waifu2x Batch Data');
  const same = path.resolve(target) === path.resolve(dataDir);
  if (same) throw new Error('The app data is already in that folder.');
  if (target.startsWith(dataDir + path.sep)) throw new Error('Choose a folder outside the current app data folder.');
  if (fs.existsSync(target) && fs.readdirSync(target).length) {
    throw new Error(`That folder already has files: ${target}. Choose another location or empty it first.`);
  }

  engineBusy = true;
  try {
    fs.mkdirSync(target, { recursive: true });
    const stats = copyTree(
      dataDir,
      target,
      (done, total) => send('task:progress', { task: 'move', label: `Copying app data to ${target}`, done, total, unit: 'bytes' }),
      (rel) => rel.split(path.sep)[0] === 'staging'
    );

    // Engine paths in settings were absolute, so point them at the new folder.
    const s = readSettings();
    const remap = (p) => (p && p.startsWith(dataDir) ? path.join(target, p.slice(dataDir.length)) : p);
    fs.writeFileSync(
      path.join(target, 'settings.json'),
      JSON.stringify({ ...s, python: remap(s.python), nunifPath: remap(s.nunifPath) }, null, 2)
    );

    // Pointer file lives in the default folder, which always exists.
    fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
    fs.writeFileSync(POINTER_FILE, JSON.stringify({ dataDir: target }, null, 2));

    // Remove the old copy to free space on the drive it was on.
    if (path.resolve(dataDir) === path.resolve(DEFAULT_DATA_DIR)) {
      for (const n of fs.readdirSync(dataDir)) {
        if (n !== 'location.json') fs.rmSync(path.join(dataDir, n), { recursive: true, force: true });
      }
    } else {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }

    setTimeout(() => app.quit(), 1500);
    return { ok: true, target, files: stats.files, bytes: stats.bytes };
  } finally {
    engineBusy = false;
  }
}

function registerIpc() {
  ipcMain.handle('dialog:pickFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('app:info', () => {
    const d = lastDiag();
    return {
      version: app.getVersion(),
      dataDir,
      engineInstalled: engineInstalled(),
      engine: engineInfo(),
      missingDataDir,
      logFile: engineLogFile(),
      gpu: gpuStatus(),
      gpuDiag: d ? { ...d.result, at: d.at, reportFile: gpuReportFile() } : null,
      gpuChoice: gpuChoice(),
    };
  });

  // ---- GPU ----
  ipcMain.handle('gpu:diagnose', async () => {
    const cfg = readSettings();
    const installed = engineInstalled() || (cfg.nunifPath && cfg.python !== 'python');
    const d = await gpu.diagnose({
      python: installed ? cfg.python : null,
      cwd: cfg.nunifPath || undefined,
      onStep: (label, done, total) => send('task:progress', { task: 'gpu', label, done, total, unit: 'checks' }),
    });
    const report = gpu.reportText(d);
    try {
      fs.mkdirSync(path.dirname(gpuFile()), { recursive: true });
      fs.writeFileSync(gpuFile(), JSON.stringify({ at: d.raw.at, result: d.result }, null, 2));
      fs.writeFileSync(gpuReportFile(), report);
    } catch (_) {
      // the report is still returned
    }
    return { ...d.result, at: d.raw.at, report, reportFile: gpuReportFile(), choice: gpuChoice() };
  });
  ipcMain.handle('gpu:usage', async () => {
    const want = readSettings().gpu;
    return gpu.gpuUsage(Number.isInteger(want) ? want : 0);
  });

  // One image's entry for the lists. A set whose original was deleted but still has versions is
  // described from its newest version (missing: true), so it can still be compared and finished.
  function describeItem(p, root, bySrc) {
    const vars = (bySrc.get(p) || []).filter((v) => fs.existsSync(v.output));
    let st = null;
    try {
      st = fs.statSync(p);
    } catch (_) {
      // original gone
    }
    if (st && st.isFile()) {
      const size = imageSize(p);
      return { path: p, name: path.basename(p), dir: path.dirname(p), root, url: pathToFileURL(p).href, bytes: st.size, mtime: st.mtimeMs,
        w: size ? size.w : null, h: size ? size.h : null, variantTags: vars.map((v) => v.tag), versions: vars.length };
    }
    if (!vars.length) return null;
    const last = vars[vars.length - 1];
    const size = imageSize(last.output);
    const f = ({ none: 1, '2x': 2, '4x': 4 })[(last.settings && last.settings.scale) || '2x'] || 2;
    return { path: p, name: path.basename(p), dir: path.dirname(p), root, url: pathToFileURL(last.output).href, bytes: 0, mtime: 0,
      w: size ? Math.round(size.w / f) : null, h: size ? Math.round(size.h / f) : null, variantTags: vars.map((v) => v.tag), versions: vars.length, missing: true };
  }

  // Lists every image in the given folders. Upscaled versions, finished sets and the "Upscaled Images"
  // folders are left out. Reports progress, since reading thousands of image headers takes a moment.
  ipcMain.handle('files:scan', async (_e, folders, recursive) => {
    const roots = (Array.isArray(folders) ? folders : [folders]).filter(Boolean);
    const bySrc = store.bySource();
    const outs = store.outputSet();
    const resolved = store.resolvedSet();
    const seen = new Set();
    const items = [];
    const errors = [];
    const under = (p, root) => {
      const rel = path.relative(root, p);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
      return recursive ? true : !rel.includes(path.sep);
    };
    const todo = [];
    send('task:progress', { task: 'scan', label: 'Listing image files', done: 0, total: null, unit: 'images' });
    for (const root of roots) {
      try {
        if (!fs.statSync(root).isDirectory()) throw new Error('not a folder');
      } catch (e) {
        errors.push({ root, message: e.code === 'ENOENT' ? 'Folder not found (moved, renamed, or the drive is not connected)' : e.message });
        continue;
      }
      for (const p of listImages(root, !!recursive)) {
        if (seen.has(p) || outs.has(p) || resolved.has(p)) continue;
        seen.add(p);
        todo.push([p, root]);
      }
      for (const [src] of bySrc) {
        if (seen.has(src) || resolved.has(src) || !under(src, root) || fs.existsSync(src)) continue;
        seen.add(src);
        todo.push([src, root]);
      }
    }
    for (let i = 0; i < todo.length; i++) {
      const it = describeItem(todo[i][0], todo[i][1], bySrc);
      if (it) items.push(it);
      if (i % 150 === 149) {
        send('task:progress', { task: 'scan', label: 'Reading image sizes', done: i + 1, total: todo.length, unit: 'images' });
        await new Promise((r) => setImmediate(r));
      }
    }
    send('task:progress', { task: 'scan', label: 'Reading image sizes', done: todo.length, total: todo.length, unit: 'images', state: 'done' });
    return { items, errors };
  });

  // Fresh entries for a few images, after an upscale or a keep / delete. null = the set is gone.
  ipcMain.handle('files:describe', (_e, entries) => {
    const bySrc = store.bySource();
    const resolved = store.resolvedSet();
    return (entries || []).map(([p, root]) => (resolved.has(p) ? null : describeItem(p, root, bySrc)));
  });

  ipcMain.handle('variants:list', (_e, source) =>
    store
      .forSource(source)
      .filter((v) => fs.existsSync(v.output))
      .map((v) => ({ ...v, url: pathToFileURL(v.output).href, size: pngSize(v.output) }))
  );

  ipcMain.handle('variants:remove', (_e, id) => {
    store.remove(id);
    return true;
  });

  // Finishing a set: keep the best version (with or without the original), or delete one file.
  // Deleting always goes to the Recycle Bin.
  const trash = (p) => shell.trashItem(p);
  ipcMain.handle('set:keep', async (_e, source, variantId, keepOriginal) => {
    if (running && running.items.includes(source)) throw new Error('This image is being upscaled right now. Wait for it to finish.');
    return sets.keepBest({ store, source, variantId, keepOriginal: !!keepOriginal, trash });
  });
  ipcMain.handle('set:delete', async (_e, source, which) => {
    if (running && running.items.includes(source)) throw new Error('This image is being upscaled right now. Wait for it to finish.');
    return sets.deleteFile({ store, source, which, trash });
  });

  // ---- the job queue ----
  const queueState = () => ({ running: running ? { jobId: running.jobId, count: running.items.length, label: running.label } : null,
    queued: queue.map((q) => ({ jobId: q.jobId, count: q.items.length, label: q.label })) });
  const sendQueue = () => send('job:queue', queueState());
  function pump() {
    if (running || engineBusy || !queue.length) return sendQueue();
    const q = queue.shift();
    const cfg = readSettings();
    const choice = gpuChoice();
    running = q;
    send('job:event', { jobId: q.jobId, started: true, total: q.items.length, processed: 0, device: choice.device, cpuFallback: !!choice.fallback });
    q.job = runJob({
      jobId: q.jobId,
      items: q.items,
      settings: q.settings,
      python: cfg.python,
      nunifPath: cfg.nunifPath,
      stagingRoot: path.join(dataDir, 'staging'),
      store,
      gpu: choice.gpu,
      onProgress: (ev) => send('job:event', { ...ev, device: choice.device }),
    });
    sendQueue();
    q.job.promise.finally(() => {
      running = null;
      pump();
    });
  }
  ipcMain.handle('job:start', (_e, items, settings, label) => {
    if (engineBusy) throw new Error('The engine is being installed. Wait for it to finish.');
    if (!Array.isArray(items) || !items.length) throw new Error('No images selected.');
    if (!readSettings().nunifPath) throw new Error('The engine is not installed yet. Open Engine and click "Install engine".');
    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    queue.push({ jobId, items, settings, label: String(label || '') });
    const position = running ? queue.length : 0;
    pump();
    return { jobId, queued: position };
  });
  ipcMain.handle('job:cancel', (_e, jobId) => {
    if (running && running.jobId === jobId) {
      running.job.cancel();
      return true;
    }
    const i = queue.findIndex((q) => q.jobId === jobId);
    if (i >= 0) {
      const [q] = queue.splice(i, 1);
      send('job:event', { jobId, finished: true, cancelled: true, removed: true, total: q.items.length, processed: 0, made: 0, skipped: 0, failed: 0, doneFiles: [], failedFiles: [], message: 'Removed from the queue.' });
      sendQueue();
    }
    return true;
  });
  // Stop: empties the queue, then cancels the running job.
  ipcMain.handle('job:cancelAll', () => {
    for (const q of queue.splice(0)) {
      send('job:event', { jobId: q.jobId, finished: true, cancelled: true, removed: true, total: q.items.length, processed: 0, made: 0, skipped: 0, failed: 0, doneFiles: [], failedFiles: [], message: 'Removed from the queue.' });
    }
    if (running) running.job.cancel();
    sendQueue();
    return true;
  });
  ipcMain.handle('job:queue', () => queueState());

  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (_e, s) => {
    writeSettings({ ...readSettings(), ...s });
    return true;
  });

  ipcMain.handle('engine:install', (_e, opts) => runInstall(opts || {}));
  async function runInstall(opts) {
    if (busy() || engineBusy) throw new Error('Wait for the upscaling queue to finish first.');
    engineBusy = true;
    const repair = !!opts.torchOnly;
    const report = (ev) => {
      if (ev.log) writeLog(ev.log);
      send('task:progress', { task: 'engine', ...ev });
    };
    writeLog(`\n===== ${repair ? 'GPU repair' : 'Install'} started ${new Date().toLocaleString()} =====\n`);
    // Not ready until this install finishes, even if an earlier one did.
    fs.rmSync(path.join(dataDir, 'engine', 'ready.json'), { force: true });
    try {
      const r = await installEngine(dataDir, report, opts);
      writeSettings({ ...readSettings(), python: r.python, nunifPath: r.nunifPath });
      fs.writeFileSync(
        path.join(dataDir, 'engine', 'ready.json'),
        JSON.stringify({ installedAt: new Date().toISOString(), cuda: r.cuda, gpu: r.gpu, torch: r.torch, build: r.build, driverCuda: r.driverCuda }, null, 2)
      );
      writeLog('\nEngine installed and ready.\n');
      report({
        label: 'Engine ready',
        done: 1,
        total: 1,
        unit: 'items',
        state: 'done',
        message: r.cuda
          ? `${repair ? 'GPU support repaired' : 'Engine installed'} and tested. Upscaling runs on ${r.gpu}.`
          : `${repair ? 'Repair finished' : 'Engine installed and tested'}, but PyTorch still can't use the GPU, so upscaling runs on the CPU (slow). Diagnose GPU on the Engine screen shows why.`,
        cuda: r.cuda,
      });
      return { ok: true, cuda: r.cuda };
    } catch (e) {
      writeLog(`\nInstall stopped: ${e.message}\n`);
      report({
        label: 'Install stopped',
        done: 0,
        total: null,
        unit: 'items',
        state: 'error',
        message: `Stopped: ${e.message}. Click "${repair ? 'Repair GPU support' : 'Install engine'}" to try again.`,
      });
      return { ok: false };
    } finally {
      engineBusy = false;
      pump();
    }
  }

  ipcMain.handle('data:move', () => moveDataFolder());

  ipcMain.handle('appearance:get', () => readAppearance());
  ipcMain.handle('appearance:set', (_e, data) => {
    fs.writeFileSync(appearanceFile(), JSON.stringify(data, null, 2));
    return true;
  });

  // Step 1 of adding a font: pick the files. Returns what was guessed from each file name.
  ipcMain.handle('fonts:pick', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Choose font files (all the weights of one font)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Fonts', extensions: FONT_EXT.map((e) => e.slice(1)) }],
    });
    if (r.canceled || !r.filePaths.length) return null;
    return r.filePaths.map(describeFontFile);
  });
  // Step 2: copy them into the app data folder under the family name the user confirmed.
  ipcMain.handle('fonts:install', (_e, family, files) => {
    family = String(family || '').trim();
    if (!family) throw new Error('Give the font a name.');
    if (!Array.isArray(files) || !files.length) throw new Error('No font files chosen.');
    const id = family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'font';
    const dir = path.join(fontsDir(), id);
    fs.mkdirSync(dir, { recursive: true });
    const entries = [];
    for (const f of files) {
      if (!FONT_EXT.includes(path.extname(f.file).toLowerCase())) continue;
      const name = path.basename(f.file);
      fs.copyFileSync(f.file, path.join(dir, name));
      entries.push({ name, weight: f.weight, style: f.style });
    }
    if (!entries.length) throw new Error('None of those files is a font (.ttf, .otf, .woff or .woff2).');
    const list = readFontIndex().filter((x) => x.id !== id);
    list.push({ id, family, files: entries, addedAt: new Date().toISOString() });
    writeFontIndex(list);
    return list;
  });
  ipcMain.handle('fonts:list', () => readFontIndex());
  ipcMain.handle('fonts:read', (_e, id, name) => {
    const p = path.join(fontsDir(), id, path.basename(name));
    if (!p.startsWith(fontsDir())) throw new Error('Bad font path');
    return fs.readFileSync(p);
  });
  ipcMain.handle('fonts:remove', (_e, id) => {
    fs.rmSync(path.join(fontsDir(), path.basename(id)), { recursive: true, force: true });
    const list = readFontIndex().filter((x) => x.id !== id);
    writeFontIndex(list);
    return list;
  });

  // Theme files: the same format for every app in the suite (see DESIGN.md).
  ipcMain.handle('theme:export', async (_e, theme) => {
    const safe = String(theme.name || 'theme').replace(/[\\/:*?"<>|]+/g, '_');
    const r = await dialog.showSaveDialog(win, {
      title: 'Save theme file',
      defaultPath: `${safe}.theme.json`,
      filters: [{ name: 'Theme', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, JSON.stringify(theme, null, 2));
    return r.filePath;
  });
  ipcMain.handle('theme:import', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Open theme files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Theme', extensions: ['json'] }],
    });
    if (r.canceled) return null;
    const out = [];
    for (const f of r.filePaths) {
      try {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        (Array.isArray(d) ? d : [d]).forEach((t) => out.push(t));
      } catch (e) {
        throw new Error(`${path.basename(f)} is not a theme file (${e.message}).`);
      }
    }
    return out;
  });
  ipcMain.handle('shell:open', (_e, p) => require('electron').shell.openPath(p));
  ipcMain.handle('shell:show', (_e, p) => require('electron').shell.showItemInFolder(p));
  ipcMain.handle('shell:external', (_e, url) => {
    if (!/^https:\/\/[\w.-]+\.(nvidia|microsoft|lenovo)\.com\//i.test(String(url))) throw new Error('Only known help pages can be opened.');
    return shell.openExternal(url);
  });

  ipcMain.handle('setup:check', async () => {
    const r = await runPython(['-c', CHECK_CODE]);
    return { ok: r.code === 0, output: r.output };
  });

  // Clears the app's own data (version list and settings). Never touches your images.
  ipcMain.handle('window:titlebar', (_e, c) => {
    const ok = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
    if (!win || !c || !ok(c.color) || !ok(c.symbolColor)) return false;
    try {
      win.setTitleBarOverlay({ color: c.color, symbolColor: c.symbolColor, height: OVERLAY_HEIGHT });
      win.setBackgroundColor(c.color);
    } catch (_) {
      return false; // not supported on this platform
    }
    return true;
  });
  ipcMain.handle('window:fullscreen', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
    return win ? win.isFullScreen() : false;
  });
  ipcMain.handle('window:devtools', () => {
    if (win) win.webContents.toggleDevTools();
    return true;
  });

  ipcMain.handle('app:reset', () => {
    if (busy() || engineBusy) throw new Error('Stop the running task first.');
    store.data = { variants: [], resolved: [] };
    store.save();
    fs.rmSync(settingsFile, { force: true });
    return true;
  });
}

app.whenReady().then(() => {
  dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  settingsFile = path.join(dataDir, 'settings.json');
  store = new Store(path.join(dataDir, 'variants.json'));
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  queue.length = 0;
  if (running) running.job.cancel();
  app.quit();
});
