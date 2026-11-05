'use strict';
// Installs the upscaling engine (embedded Python, PyTorch, nunif and its models) into the app's
// data folder, so the user never needs to install Python or run commands themselves.
//
// Every report is one of:
//   { task, label, done, total, unit, log?, state?, message? }
// done/total are bytes ('bytes') or counts. total null means the size is not known yet.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { downloadFile } = require('./download');
const { fmtBytes } = require('./progress');

const PY_VERSION = '3.11.9';
const PY_ZIP = `https://www.python.org/ftp/python/${PY_VERSION}/python-${PY_VERSION}-embed-amd64.zip`;
const GET_PIP = 'https://bootstrap.pypa.io/get-pip.py';
const NUNIF_ZIP = 'https://github.com/nagadomi/nunif/archive/refs/heads/master.zip';
const TORCH_INDEX = 'https://download.pytorch.org/whl/cu121';

// pip does not report the size of what it downloads, so the PyTorch percentage is an estimate
// based on this figure. Time left is worked out from the real bytes received.
const TORCH_EST_BYTES = 2.6e9;

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Total size of every file under a folder. Used to watch pip download into its temp folder.
function dirBytes(dir) {
  let total = 0;
  const walk = (d) => {
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const e of ents) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else {
        try {
          total += fs.statSync(f).size;
        } catch (_) {
          // file vanished while counting
        }
      }
    }
  };
  walk(dir);
  return total;
}

function runCmd(cmd, args, cwd, report, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', ...extraEnv },
    });
    const onData = (d) => report({ log: String(d) });
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited with code ${code}`));
    });
  });
}

const ps = (command, report) =>
  runCmd('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], undefined, report);
const unzip = (zip, dest, report) =>
  ps(`Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(dest)} -Force`, report);

// Runs a pip command and watches its temp folder, so the bar moves while the wheel downloads.
async function pipStep(py, args, cwd, label, root, expectedBytes, report) {
  const tmp = path.join(root, 'tmp');
  const cache = path.join(root, 'pip-cache');
  fs.mkdirSync(tmp, { recursive: true });
  let peak = 0;
  const tick = () => {
    peak = Math.max(peak, dirBytes(tmp));
    report({ task: 'engine', label, done: peak, total: expectedBytes, unit: 'bytes' });
  };
  tick();
  const timer = setInterval(tick, 1000);
  try {
    await runCmd(py, args, cwd, report, { TEMP: tmp, TMP: tmp, TMPDIR: tmp, PIP_CACHE_DIR: cache });
  } finally {
    clearInterval(timer);
  }
}

// Safe to run again: finished steps are skipped.
async function installEngine(dataDir, report) {
  const root = path.join(dataDir, 'engine');
  const pyDir = path.join(root, 'python');
  const nunifDir = path.join(root, 'nunif');
  const py = path.join(pyDir, 'python.exe');
  fs.mkdirSync(root, { recursive: true });

  const step = (label, total = null) => {
    report({ task: 'engine', label, done: 0, total, unit: 'bytes', log: `\n== ${label}\n` });
  };
  // Download with byte progress. The label stays the same for the whole download.
  const dl = (url, dest, label) =>
    downloadFile(url, dest, (got, total) =>
      report({ task: 'engine', label, done: got, total: total || null, unit: 'bytes' })
    );

  if (!fs.existsSync(py)) {
    const label = `Downloading Python ${PY_VERSION}`;
    step(label);
    const zip = path.join(root, 'python.zip');
    await dl(PY_ZIP, zip, label);
    step('Unpacking Python');
    await unzip(zip, pyDir, report);
    fs.rmSync(zip, { force: true });

    // The embeddable build ignores site-packages until "import site" is enabled.
    const pth = fs.readdirSync(pyDir).find((f) => /^python\d+\._pth$/.test(f));
    if (!pth) throw new Error('Python package has no ._pth file');
    const pthFile = path.join(pyDir, pth);
    let text = fs.readFileSync(pthFile, 'utf8').replace(/^#\s*import site/m, 'import site');
    if (!/^import site/m.test(text)) text += '\nimport site\n';
    fs.writeFileSync(pthFile, text);

    const getPip = path.join(pyDir, 'get-pip.py');
    await dl(GET_PIP, getPip, 'Downloading pip installer');
    step('Installing pip');
    await runCmd(py, [getPip], pyDir, report);
  }

  if (!fs.existsSync(nunifDir)) {
    const label = 'Downloading nunif (waifu2x code)';
    step(label);
    const zip = path.join(root, 'nunif.zip');
    await dl(NUNIF_ZIP, zip, label);
    step('Unpacking nunif');
    await unzip(zip, root, report);
    fs.rmSync(zip, { force: true });
    fs.renameSync(path.join(root, 'nunif-master'), nunifDir);
  }

  step('Installing PyTorch with CUDA (about 2.5 GB download, the slowest step)', TORCH_EST_BYTES);
  await pipStep(
    py,
    ['-u', '-m', 'pip', 'install', '--upgrade', 'torch', 'torchvision', '--index-url', TORCH_INDEX],
    root,
    'Installing PyTorch with CUDA (about 2.5 GB download, the slowest step)',
    root,
    TORCH_EST_BYTES,
    report
  );

  // nunif's requirements list "av" (video decoding), which needs Python 3.12 or newer. This app
  // only upscales images, so that one line is left out. Everything else installs as normal.
  const req = path.join(nunifDir, 'requirements.txt');
  let reqArgs;
  if (fs.existsSync(req)) {
    const appReq = path.join(root, 'requirements-app.txt');
    const lines = fs.readFileSync(req, 'utf8').split(/\r?\n/).filter((l) => !/^\s*av\b/i.test(l));
    fs.writeFileSync(appReq, lines.join('\n'));
    reqArgs = ['-u', '-m', 'pip', 'install', '-r', appReq];
  } else {
    reqArgs = ['-u', '-m', 'pip', 'install', 'pillow', 'numpy'];
  }
  step('Installing other requirements');
  await pipStep(py, reqArgs, root, 'Installing other requirements', root, null, report);

  // Check the upscaler can load before the install is marked as finished.
  step('Checking waifu2x loads');
  await runCmd(py, ['-u', '-c', 'import waifu2x.cli; print("waifu2x OK")'], nunifDir, report);

  step('Downloading waifu2x models');
  await runCmd(py, ['-u', '-m', 'waifu2x.download_models'], nunifDir, report);

  return { python: py, nunifPath: nunifDir };
}

module.exports = { installEngine, fmtBytes };
