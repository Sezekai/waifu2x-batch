'use strict';
// Installs the upscaling engine into the app's data folder, so the user never installs Python
// or runs commands themselves.
//
// The steps copy nunif's own Windows installer (nunif/windows_package/update.bat):
//   1. Python 3.12.10 embeddable, with "..\nunif" and "import site" in its ._pth file
//   2. pip
//   3. pip install -r requirements-torch.txt   (PyTorch with CUDA 13.2)
//   4. pip install -r requirements.txt         (everything else nunif imports, including av)
// then downloads the waifu2x models and upscales a small test image to prove it all works.
//
// Every report is { task, label, done, total, unit, log?, state?, message? }.
// done/total are bytes; total null means the size is not known.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { downloadFile } = require('./download');
const { fmtBytes } = require('./progress');
const { pngSize } = require('./fsutil');
const { pyArgs, cleanEnv, lineSplitter } = require('./pyenv');

const PY_VERSION = '3.12.10';
const PY_TAG = '312';
const PY_ZIP = `https://www.python.org/ftp/python/${PY_VERSION}/python-${PY_VERSION}-embed-amd64.zip`;
const GET_PIP = 'https://bootstrap.pypa.io/get-pip.py';
const NUNIF_ZIP = 'https://github.com/nagadomi/nunif/archive/refs/heads/master.zip';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Total size of every file under a folder. Used to measure a pip download as it lands in the temp folder.
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

// pip prints this before each download, with the exact size:
//   Downloading torch-2.14.1%2Bcu132-cp312-cp312-win_amd64.whl (3012.4 MB)
//   Downloading https://download.pytorch.org/whl/cu132/torch-2.14.1%2Bcu132-....whl (3012.4 MB)
const PIP_UNITS = { kB: 1e3, KB: 1e3, MB: 1e6, GB: 1e9 };
function parsePipDownload(line) {
  const m = line.match(/Downloading\s+(\S+)\s+\(([\d.]+)\s*(kB|KB|MB|GB)\)/);
  if (!m) return null;
  let name = m[1].split('/').pop();
  try {
    name = decodeURIComponent(name);
  } catch (_) {
    // keep the raw name
  }
  return { name, bytes: Math.round(Number(m[2]) * PIP_UNITS[m[3]]) };
}

// nunif's model downloader uses tqdm, which prints lines like:
//   Waifu2x Models:  45%|####5     | 12.3MiB/27.1MiB [00:05<00:06, 2.40MiB/s]
const TQDM_UNITS = { '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
function parseTqdm(line) {
  const m = line.match(/^(.*?):?\s*(\d{1,3})%\|.*?\|\s*([\d.]+)([kKMGT]?)i?B\/([\d.]+)([kKMGT]?)i?B/);
  if (!m) return null;
  return {
    name: m[1].trim() || 'Download',
    pct: Number(m[2]),
    done: Math.round(Number(m[3]) * TQDM_UNITS[m[4]]),
    total: Math.round(Number(m[5]) * TQDM_UNITS[m[6]]),
  };
}

// The embedded Python only searches the folders listed in its ._pth file. nunif's installer adds
// "..\nunif" (so "import waifu2x" works from anywhere) and "import site" (so pip packages load).
// Safe to run on every install: it rewrites the file to the same result each time.
function fixPth(pyDir) {
  const name = fs.readdirSync(pyDir).find((f) => /^python\d+\._pth$/i.test(f));
  if (!name) throw new Error(`No ._pth file found in ${pyDir}`);
  const file = path.join(pyDir, name);
  const keep = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^#?\s*import site$/i.test(l) && l.toLowerCase() !== '..\\nunif');
  keep.push('..\\nunif', 'import site');
  fs.writeFileSync(file, keep.join('\r\n') + '\r\n');
  return file;
}

// Runs a process. Output is split into lines: each line is logged (unless skipLog says not to)
// and passed to onLine for progress parsing.
function runCmd(cmd, args, { cwd, env, report, onLine, skipLog } = {}) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(cmd, args, { cwd, windowsHide: true, env: env || cleanEnv() });
    } catch (e) {
      return reject(e);
    }
    const lines = lineSplitter((line) => {
      if (!(skipLog && skipLog(line))) report({ log: `${line}\n` });
      if (onLine) onLine(line);
    });
    proc.stdout.on('data', (d) => lines.push(d));
    proc.stderr.on('data', (d) => lines.push(d));
    proc.on('error', reject);
    proc.on('close', (code) => {
      lines.flush();
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} ${args.slice(0, 4).join(' ')} exited with code ${code}`));
    });
  });
}

const SELFTEST_CODE = [
  'import os, sys',
  'import torch',
  'print("TORCH=" + torch.__version__)',
  'print("CUDA_AVAILABLE=" + ("1" if torch.cuda.is_available() else "0"))',
  'print("GPU=" + (torch.cuda.get_device_name(0) if torch.cuda.is_available() else ""))',
  'import waifu2x.cli',
  'print("WAIFU2X_IMPORT=OK")',
  'from PIL import Image',
  'd = sys.argv[1]',
  'os.makedirs(d, exist_ok=True)',
  'Image.new("RGB", (48, 48), (200, 120, 60)).save(os.path.join(d, "test.png"))',
].join('\n');

// Safe to run again: finished steps are skipped or finish quickly.
async function installEngine(dataDir, report) {
  const root = path.join(dataDir, 'engine');
  const pyDir = path.join(root, 'python');
  const nunifDir = path.join(root, 'nunif');
  const py = path.join(pyDir, 'python.exe');
  const tmp = path.join(root, 'tmp');
  fs.mkdirSync(root, { recursive: true });

  // Every report carries the id of the step it belongs to: python, pip, nunif, torch, reqs, models, test.
  const outer = report;
  let curStep = null;
  report = (ev) => outer({ stepId: curStep, ...ev });
  const step = (label, id) => {
    if (id) curStep = id;
    report({ task: 'engine', label, done: 0, total: null, unit: 'bytes', log: `\n== ${label}\n` });
  };
  const dl = (url, dest, label) =>
    downloadFile(url, dest, (got, total) => report({ task: 'engine', label, done: got, total: total || null, unit: 'bytes' }));
  const runPy = (args, opts = {}) => runCmd(py, pyArgs(args), { report, ...opts });

  // pip with a progress bar: the size comes from pip's "Downloading x (size)" line, and the bytes
  // received come from watching the temp folder pip downloads into.
  async function pipStep(label, pipArgs, id) {
    fs.mkdirSync(tmp, { recursive: true });
    let cur = null;
    let phase = 'checking which packages are needed';
    const emit = () => {
      if (cur) {
        const done = Math.min(cur.bytes, Math.max(0, dirBytes(tmp) - cur.base));
        report({ task: 'engine', label: `${label}: downloading ${cur.name}`, done, total: cur.bytes, unit: 'bytes' });
      } else {
        report({ task: 'engine', label: `${label}: ${phase}`, done: 0, total: null, unit: 'bytes' });
      }
    };
    const onLine = (line) => {
      const d = parsePipDownload(line);
      if (d) {
        cur = { ...d, base: dirBytes(tmp) };
        emit();
      } else if (/^\s*Installing collected packages/.test(line)) {
        cur = null;
        phase = 'installing (unpacking files; this step has no size to report)';
        emit();
      }
    };
    step(label, id);
    emit();
    const timer = setInterval(emit, 1000);
    try {
      await runPy(['-m', 'pip', ...pipArgs], {
        cwd: root,
        env: cleanEnv({ TEMP: tmp, TMP: tmp, TMPDIR: tmp }),
        onLine,
      });
    } finally {
      clearInterval(timer);
    }
  }

  // Earlier versions of this app installed Python 3.11, which can't install nunif's requirements
  // (av 19 needs 3.12). Remove it and the old pip cache, which held a second copy of PyTorch.
  if (fs.existsSync(pyDir) && !fs.existsSync(path.join(pyDir, `python${PY_TAG}._pth`))) {
    step('Removing the old Python 3.11 engine (nunif needs Python 3.12)', 'python');
    fs.rmSync(pyDir, { recursive: true, force: true });
  }
  for (const old of ['pip-cache', 'requirements-app.txt', 'tmp']) {
    fs.rmSync(path.join(root, old), { recursive: true, force: true });
  }

  // 1. Python
  if (!fs.existsSync(py)) {
    const label = `Downloading Python ${PY_VERSION}`;
    step(label, 'python');
    const zip = path.join(root, 'python.zip');
    await dl(PY_ZIP, zip, label);
    step('Unpacking Python', 'python');
    await runCmd('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(pyDir)} -Force`], { report });
    fs.rmSync(zip, { force: true });
  }
  report({ log: `Python path file: ${fixPth(pyDir)}\n` });

  // 2. pip
  if (!fs.existsSync(path.join(pyDir, 'Lib', 'site-packages', 'pip'))) {
    const getPip = path.join(pyDir, 'get-pip.py');
    curStep = 'pip';
    await dl(GET_PIP, getPip, 'Downloading pip installer');
    step('Installing pip', 'pip');
    await runPy([getPip], { cwd: pyDir });
  }

  // nunif code. An older copy without requirements-torch.txt is replaced.
  if (!fs.existsSync(path.join(nunifDir, 'requirements-torch.txt'))) {
    fs.rmSync(nunifDir, { recursive: true, force: true });
    fs.rmSync(path.join(root, 'nunif-master'), { recursive: true, force: true });
    const label = 'Downloading nunif (waifu2x code)';
    step(label, 'nunif');
    const zip = path.join(root, 'nunif.zip');
    await dl(NUNIF_ZIP, zip, label);
    step('Unpacking nunif', 'nunif');
    await runCmd('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(root)} -Force`], { report });
    fs.rmSync(zip, { force: true });
    fs.renameSync(path.join(root, 'nunif-master'), nunifDir);
  }

  // 3 and 4. Python packages, exactly as nunif's installer does it.
  await pipStep('Updating pip', ['install', '--no-cache-dir', '--upgrade', 'pip'], 'torch');
  await pipStep('Installing PyTorch (CUDA 13.2)', ['install', '--no-cache-dir', '--upgrade', '-r', path.join(nunifDir, 'requirements-torch.txt')], 'torch');
  await pipStep('Installing nunif requirements', ['install', '--no-cache-dir', '--upgrade', '-r', path.join(nunifDir, 'requirements.txt')], 'reqs');
  fs.rmSync(tmp, { recursive: true, force: true });

  // Models
  step('Downloading waifu2x models', 'models');
  await runPy(['-m', 'waifu2x.download_models'], {
    cwd: nunifDir,
    skipLog: (line) => {
      const t = parseTqdm(line);
      return !!t && t.pct < 100;
    },
    onLine: (line) => {
      const t = parseTqdm(line);
      if (t) report({ task: 'engine', label: `Downloading waifu2x models: ${t.name}`, done: t.done, total: t.total, unit: 'bytes' });
    },
  });

  // Test: load everything, then upscale a 48x48 image to 96x96 with the real command the app uses.
  step('Testing an upscale on a small image', 'test');
  const testDir = path.join(root, 'selftest');
  fs.rmSync(testDir, { recursive: true, force: true });
  const info = {};
  await runPy(['-c', SELFTEST_CODE, testDir], {
    cwd: nunifDir,
    onLine: (line) => {
      const m = line.match(/^(TORCH|CUDA_AVAILABLE|GPU|WAIFU2X_IMPORT)=(.*)$/);
      if (m) info[m[1]] = m[2].trim();
    },
  });
  const outDir = path.join(testDir, 'out');
  await runPy(['-m', 'waifu2x.cli', '-m', 'noise_scale', '-n', '1', '--style', 'art', '-i', path.join(testDir, 'test.png'), '-o', outDir], {
    cwd: nunifDir,
  });
  const size = pngSize(path.join(outDir, 'test.png'));
  if (!size || size.w !== 96 || size.h !== 96) {
    throw new Error(`Test upscale did not produce the expected 96x96 image (got ${size ? `${size.w}x${size.h}` : 'no file'})`);
  }
  report({ log: `Test upscale OK: 48x48 -> ${size.w}x${size.h}\n` });
  fs.rmSync(testDir, { recursive: true, force: true });

  const cuda = info.CUDA_AVAILABLE === '1';
  report({
    log: cuda
      ? `GPU: ${info.GPU} (PyTorch ${info.TORCH})\n`
      : `WARNING: PyTorch ${info.TORCH} cannot use the GPU. Upscaling will run on the CPU and be much slower. Updating the NVIDIA driver usually fixes this.\n`,
  });
  return { python: py, nunifPath: nunifDir, cuda, gpu: info.GPU || '', torch: info.TORCH || '' };
}

module.exports = { installEngine, fmtBytes, parsePipDownload, parseTqdm, fixPth, dirBytes };
