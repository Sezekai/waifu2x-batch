'use strict';
// Installs the upscaling engine (embedded Python, PyTorch, nunif and its models) into the app's
// data folder, so the user never needs to install Python or run commands themselves.
// Progress is reported through report({ log }) for log lines and report({ text, pct }) for the bar.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { downloadFile } = require('./download');

const PY_VERSION = '3.11.9';
const PY_ZIP = `https://www.python.org/ftp/python/${PY_VERSION}/python-${PY_VERSION}-embed-amd64.zip`;
const GET_PIP = 'https://bootstrap.pypa.io/get-pip.py';
const NUNIF_ZIP = 'https://github.com/nagadomi/nunif/archive/refs/heads/master.zip';
const TORCH_INDEX = 'https://download.pytorch.org/whl/cu121';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function fmtBytes(b) {
  if (!b) return '0 MB';
  return b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(0)} MB`;
}

// pip and torch print progress like "45.2/2.5 GB" or "45%". Pull out a percentage if there is one.
function pctFromLine(line) {
  const m = line.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(kB|MB|GB)/);
  if (m && Number(m[2]) > 0) return Math.min(100, (Number(m[1]) / Number(m[2])) * 100);
  const p = line.match(/(\d{1,3})%/);
  return p ? Number(p[1]) : null;
}

function runCmd(cmd, args, cwd, report) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });
    const onData = (d) => {
      const text = String(d);
      report({ log: text });
      const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
      if (lines.length) {
        const last = lines[lines.length - 1];
        report({ text: last.slice(0, 140), pct: pctFromLine(last) });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited with code ${code}`));
    });
  });
}

const ps = (command, cwd, report) =>
  runCmd('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], cwd, report);
const unzip = (zip, dest, report) =>
  ps(`Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(dest)} -Force`, undefined, report);

// Safe to run again: finished steps are skipped.
async function installEngine(dataDir, report) {
  const say = (t) => report({ log: `${t}\n` });
  const step = (label) => {
    say(label);
    report({ text: label, pct: null });
  };
  const dl = (url, dest, label) =>
    downloadFile(url, dest, (got, total) =>
      report({
        text: `${label}: ${fmtBytes(got)}${total ? ` of ${fmtBytes(total)}` : ''}`,
        pct: total ? (got / total) * 100 : null,
      })
    );

  const root = path.join(dataDir, 'engine');
  const pyDir = path.join(root, 'python');
  const nunifDir = path.join(root, 'nunif');
  const py = path.join(pyDir, 'python.exe');
  fs.mkdirSync(root, { recursive: true });

  if (!fs.existsSync(py)) {
    step(`Downloading Python ${PY_VERSION}`);
    const zip = path.join(root, 'python.zip');
    await dl(PY_ZIP, zip, 'Python');
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

    step('Installing pip');
    const getPip = path.join(pyDir, 'get-pip.py');
    await dl(GET_PIP, getPip, 'pip installer');
    await runCmd(py, [getPip], pyDir, report);
  }

  if (!fs.existsSync(nunifDir)) {
    step('Downloading nunif');
    const zip = path.join(root, 'nunif.zip');
    await dl(NUNIF_ZIP, zip, 'nunif');
    step('Unpacking nunif');
    await unzip(zip, root, report);
    fs.rmSync(zip, { force: true });
    fs.renameSync(path.join(root, 'nunif-master'), nunifDir);
  }

  step('Installing PyTorch with CUDA (several GB, the slowest step)');
  await runCmd(py, ['-m', 'pip', 'install', '--upgrade', 'torch', 'torchvision', '--index-url', TORCH_INDEX], root, report);

  const req = path.join(nunifDir, 'requirements.txt');
  step('Installing other requirements');
  if (fs.existsSync(req)) {
    await runCmd(py, ['-m', 'pip', 'install', '-r', req], root, report);
  } else {
    await runCmd(py, ['-m', 'pip', 'install', 'pillow', 'numpy'], root, report);
  }

  step('Downloading waifu2x models');
  await runCmd(py, ['-u', '-m', 'waifu2x.download_models'], nunifDir, report);

  report({ text: 'Engine ready', pct: 100 });
  return { python: py, nunifPath: nunifDir };
}

module.exports = { installEngine, fmtBytes };
