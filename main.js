'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { Store } = require('./lib/store');
const { listImages, pngSize, copyTree } = require('./lib/fsutil');
const { runJob } = require('./lib/runner');
const { installEngine, fmtBytes } = require('./lib/engine');
const { pyArgs, cleanEnv } = require('./lib/pyenv');

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
const jobs = new Map();

const DEFAULT_SETTINGS = { python: 'python', nunifPath: '' };

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

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 920,
    backgroundColor: '#15161a',
    title: 'Waifu2x Batch',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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
  if (jobs.size || engineBusy) throw new Error('Stop the running task first.');
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

  ipcMain.handle('app:info', () => ({
    dataDir,
    engineInstalled: engineInstalled(),
    engine: engineInfo(),
    missingDataDir,
    logFile: engineLogFile(),
  }));

  ipcMain.handle('files:scan', (_e, folder, recursive) => {
    const bySrc = store.bySource();
    const outs = store.outputSet();
    return listImages(folder, !!recursive).map((p) => ({
      path: p,
      name: path.basename(p),
      url: pathToFileURL(p).href,
      isVariant: outs.has(p),
      variantTags: (bySrc.get(p) || []).map((v) => v.tag),
    }));
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

  ipcMain.handle('job:start', (_e, items, settings) => {
    if (jobs.size || engineBusy) throw new Error('Another task is running. Wait for it or cancel it.');
    if (!Array.isArray(items) || !items.length) throw new Error('No images selected.');
    const cfg = readSettings();
    if (!cfg.nunifPath) throw new Error('The engine is not installed yet. Open the Setup tab and click "Install engine".');
    const jobId = Date.now().toString(36);
    const job = runJob({
      jobId,
      items,
      settings,
      python: cfg.python,
      nunifPath: cfg.nunifPath,
      stagingRoot: path.join(dataDir, 'staging'),
      store,
      onProgress: (ev) => send('job:event', ev),
    });
    jobs.set(jobId, job);
    job.promise.finally(() => jobs.delete(jobId));
    return { jobId };
  });

  ipcMain.handle('job:cancel', (_e, jobId) => {
    const j = jobs.get(jobId);
    if (j) j.cancel();
    return true;
  });

  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (_e, s) => {
    writeSettings({ ...readSettings(), ...s });
    return true;
  });

  ipcMain.handle('engine:install', async () => {
    if (jobs.size || engineBusy) throw new Error('Another task is running.');
    engineBusy = true;
    const report = (ev) => {
      if (ev.log) writeLog(ev.log);
      send('task:progress', { task: 'engine', ...ev });
    };
    writeLog(`\n===== Install started ${new Date().toLocaleString()} =====\n`);
    // Not ready until this install finishes, even if an earlier one did.
    fs.rmSync(path.join(dataDir, 'engine', 'ready.json'), { force: true });
    try {
      const r = await installEngine(dataDir, report);
      writeSettings({ ...readSettings(), python: r.python, nunifPath: r.nunifPath });
      fs.writeFileSync(
        path.join(dataDir, 'engine', 'ready.json'),
        JSON.stringify({ installedAt: new Date().toISOString(), cuda: r.cuda, gpu: r.gpu, torch: r.torch }, null, 2)
      );
      writeLog('\nEngine installed and ready.\n');
      report({
        label: 'Engine ready',
        done: 1,
        total: 1,
        unit: 'items',
        state: 'done',
        message: r.cuda
          ? `Engine installed and tested. Using ${r.gpu}.`
          : 'Engine installed and tested, but the GPU is not available, so upscaling will use the CPU (slow). Updating the NVIDIA driver usually fixes this.',
      });
      return { ok: true };
    } catch (e) {
      writeLog(`\nInstall stopped: ${e.message}\n`);
      report({
        label: 'Install stopped',
        done: 0,
        total: null,
        unit: 'items',
        state: 'error',
        message: `Stopped: ${e.message}. Click "Install engine" to resume from where it stopped.`,
      });
      return { ok: false };
    } finally {
      engineBusy = false;
    }
  });

  ipcMain.handle('data:move', () => moveDataFolder());

  ipcMain.handle('setup:check', async () => {
    const r = await runPython(['-c', CHECK_CODE]);
    return { ok: r.code === 0, output: r.output };
  });

  // Clears the app's own data (version list and settings). Never touches your images.
  ipcMain.handle('app:reset', () => {
    if (jobs.size || engineBusy) throw new Error('Stop the running task first.');
    store.data = { variants: [] };
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
  for (const j of jobs.values()) j.cancel();
  app.quit();
});
