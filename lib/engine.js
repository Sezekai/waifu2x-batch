'use strict';
// Installs the upscaling engine (embedded Python, PyTorch, nunif and its models) into the app's
// data folder, so the user never needs to install Python or run commands themselves.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PY_VERSION = '3.11.9';
const PY_ZIP = `https://www.python.org/ftp/python/${PY_VERSION}/python-${PY_VERSION}-embed-amd64.zip`;
const GET_PIP = 'https://bootstrap.pypa.io/get-pip.py';
const NUNIF_ZIP = 'https://github.com/nagadomi/nunif/archive/refs/heads/master.zip';
const TORCH_INDEX = 'https://download.pytorch.org/whl/cu121';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function run(cmd, args, cwd, log) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });
    const onData = (d) => log(String(d));
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited with code ${code}`));
    });
  });
}

const ps = (command, log) =>
  run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], undefined, log);
const download = (url, out, log) =>
  ps(`$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri ${q(url)} -OutFile ${q(out)}`, log);
const unzip = (zip, dest, log) =>
  ps(`Expand-Archive -LiteralPath ${q(zip)} -DestinationPath ${q(dest)} -Force`, log);

// Safe to run again: finished steps are skipped.
async function installEngine(dataDir, log) {
  const root = path.join(dataDir, 'engine');
  const pyDir = path.join(root, 'python');
  const nunifDir = path.join(root, 'nunif');
  const py = path.join(pyDir, 'python.exe');
  fs.mkdirSync(root, { recursive: true });

  if (!fs.existsSync(py)) {
    log(`Downloading Python ${PY_VERSION}…\n`);
    const zip = path.join(root, 'python.zip');
    await download(PY_ZIP, zip, log);
    await unzip(zip, pyDir, log);
    fs.rmSync(zip, { force: true });

    // The embeddable build ignores site-packages until "import site" is enabled.
    const pth = fs.readdirSync(pyDir).find((f) => /^python\d+\._pth$/.test(f));
    if (!pth) throw new Error('Python package has no ._pth file');
    const pthFile = path.join(pyDir, pth);
    let text = fs.readFileSync(pthFile, 'utf8').replace(/^#\s*import site/m, 'import site');
    if (!/^import site/m.test(text)) text += '\nimport site\n';
    fs.writeFileSync(pthFile, text);

    log('Installing pip…\n');
    const getPip = path.join(pyDir, 'get-pip.py');
    await download(GET_PIP, getPip, log);
    await run(py, [getPip], pyDir, log);
  }

  if (!fs.existsSync(nunifDir)) {
    log('Downloading nunif…\n');
    const zip = path.join(root, 'nunif.zip');
    await download(NUNIF_ZIP, zip, log);
    await unzip(zip, root, log);
    fs.rmSync(zip, { force: true });
    fs.renameSync(path.join(root, 'nunif-master'), nunifDir);
  }

  log('Installing PyTorch with CUDA (large download, several GB)…\n');
  await run(py, ['-m', 'pip', 'install', '--upgrade', 'torch', 'torchvision', '--index-url', TORCH_INDEX], root, log);

  const req = path.join(nunifDir, 'requirements.txt');
  log('Installing other requirements…\n');
  if (fs.existsSync(req)) {
    await run(py, ['-m', 'pip', 'install', '-r', req], root, log);
  } else {
    await run(py, ['-m', 'pip', 'install', 'pillow', 'numpy'], root, log);
  }

  log('Downloading waifu2x models…\n');
  await run(py, ['-u', '-m', 'waifu2x.download_models'], nunifDir, log);

  return { python: py, nunifPath: nunifDir };
}

module.exports = { installEngine };
