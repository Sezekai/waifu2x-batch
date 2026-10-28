'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { Store } = require('./lib/store');
const { listImages, pngSize } = require('./lib/fsutil');
const { runJob } = require('./lib/runner');
const { installEngine } = require('./lib/engine');

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
      proc = spawn(cfg.python, ['-u', ...args], {
        cwd: cfg.nunifPath,
        windowsHide: true,
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
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

function registerIpc() {
  ipcMain.handle('dialog:pickFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('app:info', () => ({ dataDir, engineInstalled: fs.existsSync(path.join(dataDir, 'engine', 'python', 'python.exe')) }));

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
    try {
      const r = await installEngine(dataDir, (t) => send('setup:log', t));
      writeSettings({ ...readSettings(), python: r.python, nunifPath: r.nunifPath });
      send('setup:log', '\nEngine installed and ready.\n');
      return { ok: true };
    } catch (e) {
      send('setup:log', `\nInstall stopped: ${e.message}\nRun "Install engine" again to continue from where it stopped.\n`);
      return { ok: false };
    } finally {
      engineBusy = false;
    }
  });

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
