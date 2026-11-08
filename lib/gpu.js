'use strict';
// Everything about the GPU: which PyTorch build suits the NVIDIA driver, a full diagnosis when
// PyTorch can't use the GPU, and live usage while upscaling.
//
// Background (why this exists): PyTorch only ever talks to the NVIDIA GPU through CUDA. On a laptop
// with an AMD or Intel integrated GPU as well, the integrated GPU is invisible to CUDA, so it can't be
// picked by mistake. What does go wrong:
//   - the driver is older than the CUDA version PyTorch was built for (CUDA 13 needs driver 580+)
//   - the NVIDIA GPU is disabled or erroring in Device Manager, or switched off by the laptop
//   - the NVIDIA driver isn't installed (Windows' basic display driver instead)
//   - CUDA_VISIBLE_DEVICES hides the GPU
//   - a CPU-only PyTorch build was installed
// When CUDA isn't available, waifu2x quietly runs on the CPU (its --gpu default becomes -1), which is
// many times slower. The app now says which device is used and shows live GPU load while upscaling.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pyArgs, cleanEnv } = require('./pyenv');

// PyTorch builds this app can install, newest first. `cuda` is the CUDA version as the driver reports
// it (major * 1000 + minor * 10). A build runs when the driver supports at least that CUDA version.
const TORCH_BUILDS = [
  { id: 'cu132', cuda: 13020, label: 'CUDA 13.2' },
  { id: 'cu130', cuda: 13000, label: 'CUDA 13.0' },
  { id: 'cu126', cuda: 12000, label: 'CUDA 12.6' }, // CUDA 12 minor-version compatibility: any 12.x driver
];
const BUILD_IDS = TORCH_BUILDS.map((b) => b.id);

const cudaText = (v) => (v ? `${Math.floor(v / 1000)}.${Math.round((v % 1000) / 10)}` : 'unknown');
function parseCudaText(s) {
  const m = String(s || '').match(/(\d+)\.(\d+)/);
  return m ? Number(m[1]) * 1000 + Number(m[2]) * 10 : null;
}

// The newest build the driver can run, or null when the driver is too old for all of them.
function chooseBuild(driverCuda) {
  if (!driverCuda) return null;
  const b = TORCH_BUILDS.find((x) => driverCuda >= x.cuda);
  return b ? b.id : null;
}
const buildInfo = (id) => TORCH_BUILDS.find((b) => b.id === id) || null;

// "2.14.1+cu132" -> "cu132", "2.14.1+cpu" -> "cpu", "2.14.1" -> null
function buildOfTorch(version) {
  const m = String(version || '').match(/\+(cu\d+|cpu)\b/);
  return m ? m[1] : null;
}

// nunif's requirements-torch.txt pins one CUDA build (e.g. +cu132). The same torch version exists for
// the other builds, so the build tag is swapped everywhere, including the --extra-index-url line.
function torchRequirements(nunifText, build) {
  if (!BUILD_IDS.includes(build)) throw new Error(`Unknown PyTorch build ${build}`);
  return String(nunifText).replace(/\bcu1\d\d\b/g, build);
}

// nvidia-smi prints "CUDA Version: 13.0" in its header and the driver version in a query.
function parseSmiHeader(text) {
  const cuda = String(text).match(/CUDA Version:\s*([\d.]+)/i);
  const drv = String(text).match(/Driver Version:\s*([\d.]+)/i);
  return { cuda: cuda ? parseCudaText(cuda[1]) : null, driver: drv ? drv[1] : null };
}
function parseSmiQuery(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(',').map((x) => x.trim()))
    .filter((p) => p.length >= 5)
    .map(([index, name, driver, memTotal, util, memUsed, temp]) => ({
      index: Number(index),
      name,
      driver,
      memTotal: Number(memTotal) || null,
      util: util === undefined ? null : Number(util),
      memUsed: memUsed === undefined ? null : Number(memUsed),
      temp: temp === undefined ? null : Number(temp),
    }));
}

// Windows reports NVIDIA driver versions as 32.0.15.9597; the NVIDIA version is the last five digits: 595.97.
function nvidiaVersionFromWindows(v) {
  const digits = String(v || '').replace(/\D/g, '');
  if (digits.length < 5) return null;
  const last = digits.slice(-5);
  return `${Number(last.slice(0, 3))}.${last.slice(3)}`;
}

function run(cmd, args, { timeout = 20000, env, cwd } = {}) {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { timeout, windowsHide: true, env: env || process.env, cwd, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
        resolve({ ok: !err, code: err ? (typeof err.code === 'number' ? err.code : -1) : 0, out: String(stdout || ''), err: String(stderr || ''), missing: !!(err && err.code === 'ENOENT') });
      });
    } catch (e) {
      resolve({ ok: false, code: -1, out: '', err: e.message, missing: true });
    }
  });
}

const SMI_PATHS = ['nvidia-smi', 'C:\\Windows\\System32\\nvidia-smi.exe', 'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe'];
let smiPath;
async function findSmi() {
  if (smiPath !== undefined) return smiPath;
  for (const p of SMI_PATHS) {
    if (p.includes('\\') && process.platform === 'win32' && !fs.existsSync(p)) continue;
    const r = await run(p, ['-L'], { timeout: 8000 });
    if (!r.missing) {
      smiPath = p;
      return p;
    }
  }
  smiPath = null;
  return null;
}

// nvidia-smi: is the driver there, which version, which CUDA version it supports, which GPUs.
async function smiInfo() {
  const exe = await findSmi();
  if (!exe) return null;
  const head = await run(exe, [], { timeout: 15000 });
  if (!head.ok) return { exe, error: (head.out + head.err).trim().split(/\r?\n/).slice(0, 3).join(' ') || `nvidia-smi exited with code ${head.code}` };
  const h = parseSmiHeader(head.out);
  const q = await run(exe, ['--query-gpu=index,name,driver_version,memory.total,utilization.gpu,memory.used,temperature.gpu', '--format=csv,noheader,nounits'], { timeout: 15000 });
  return { exe, driver: h.driver, cuda: h.cuda, gpus: q.ok ? parseSmiQuery(q.out) : [] };
}

// Live usage while upscaling (first NVIDIA GPU, or the one being used).
async function gpuUsage(index = 0) {
  const exe = await findSmi();
  if (!exe) return null;
  const q = await run(exe, ['--query-gpu=index,name,driver_version,memory.total,utilization.gpu,memory.used,temperature.gpu', '--format=csv,noheader,nounits'], { timeout: 5000 });
  if (!q.ok) return null;
  const gpus = parseSmiQuery(q.out);
  return gpus.find((g) => g.index === index) || gpus[0] || null;
}

// Every display adapter Windows knows about, including disabled ones and their Device Manager error code.
async function windowsAdapters() {
  if (process.platform !== 'win32') return null;
  const ps = [
    '$ErrorActionPreference = "SilentlyContinue"',
    '$v = @(Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, Status, ConfigManagerErrorCode, PNPDeviceID)',
    '$p = @(Get-PnpDevice -Class Display | Select-Object FriendlyName, Status, @{n="Problem";e={[int]$_.Problem}}, InstanceId, Present)',
    '@{ video = $v; pnp = $p } | ConvertTo-Json -Depth 3 -Compress',
  ].join('; ');
  const r = await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { timeout: 25000 });
  if (!r.ok) return { error: (r.err || r.out).trim().slice(0, 300) || 'PowerShell did not answer' };
  try {
    return mergeAdapters(JSON.parse(r.out));
  } catch (e) {
    return { error: `Could not read the adapter list (${e.message})` };
  }
}

const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
function mergeAdapters(d) {
  const list = [];
  for (const p of asArray(d && d.pnp)) {
    const v = asArray(d.video).find((x) => x.PNPDeviceID && p.InstanceId && x.PNPDeviceID.toUpperCase() === p.InstanceId.toUpperCase());
    list.push({
      name: p.FriendlyName || (v && v.Name) || 'Unknown adapter',
      status: p.Status || (v && v.Status) || '',
      problem: Number(p.Problem || (v && v.ConfigManagerErrorCode) || 0),
      present: p.Present !== false,
      driverVersion: (v && v.DriverVersion) || '',
    });
  }
  // Adapters only WMI knows about
  for (const v of asArray(d && d.video)) {
    if (list.some((a) => a.name === v.Name)) continue;
    list.push({ name: v.Name, status: v.Status || '', problem: Number(v.ConfigManagerErrorCode || 0), present: true, driverVersion: v.DriverVersion || '' });
  }
  return { adapters: list };
}

// Runs inside the engine's Python. Prints one line: DIAG=<json>.
const DIAG_CODE = String.raw`
import json, os, sys, ctypes, warnings
r = {"python": sys.version.split()[0], "env_cvd": os.environ.get("CUDA_VISIBLE_DEVICES"), "warnings": []}
try:
    lib = ctypes.WinDLL("nvcuda.dll") if os.name == "nt" else ctypes.CDLL("libcuda.so.1")
    r["nvcuda"] = True
    v = ctypes.c_int(0)
    r["driver_cuda"] = v.value if lib.cuDriverGetVersion(ctypes.byref(v)) == 0 else None
    r["cu_init"] = int(lib.cuInit(0))
    n = ctypes.c_int(0)
    r["cu_devices"] = n.value if lib.cuDeviceGetCount(ctypes.byref(n)) == 0 else None
except Exception as e:
    r["nvcuda"] = False
    r["nvcuda_error"] = "%s: %s" % (type(e).__name__, e)
try:
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        import torch
        r["torch"] = torch.__version__
        r["torch_cuda"] = torch.version.cuda
        r["available"] = bool(torch.cuda.is_available())
        r["count"] = int(torch.cuda.device_count()) if r["available"] else 0
    r["warnings"] = [str(x.message).strip() for x in w if "cuda" in str(x.message).lower()]
    if not r["available"] and torch.version.cuda:
        try:
            torch.cuda.init()
        except Exception as e:
            r["init_error"] = "%s: %s" % (type(e).__name__, str(e).strip())
    if r["available"]:
        r["arch_list"] = torch.cuda.get_arch_list()
        r["devices"] = []
        for i in range(r["count"]):
            p = torch.cuda.get_device_properties(i)
            r["devices"].append({"index": i, "name": p.name, "cap": "%d.%d" % (p.major, p.minor), "mem": int(p.total_memory)})
        try:
            x = torch.ones(256, 256, device="cuda")
            r["compute_ok"] = abs(float((x @ x).sum().item()) - 256.0 ** 3) < 1
        except Exception as e:
            r["compute_ok"] = False
            r["compute_error"] = "%s: %s" % (type(e).__name__, str(e).strip())
except Exception as e:
    r["torch_error"] = "%s: %s" % (type(e).__name__, str(e).strip())
print("DIAG=" + json.dumps(r))
`;

async function pythonDiag(python, cwd) {
  if (!python || (python.includes(path.sep) && !fs.existsSync(python))) return { skipped: 'The engine is not installed yet.' };
  const r = await run(python, pyArgs(['-c', DIAG_CODE]), { timeout: 120000, env: cleanEnv(), cwd });
  const line = (r.out + '\n' + r.err).split(/\r?\n/).find((l) => l.startsWith('DIAG='));
  if (!line) return { torch_error: `Python did not finish the check (exit ${r.code}): ${(r.err || r.out).trim().split(/\r?\n/).slice(-3).join(' ')}` };
  try {
    return JSON.parse(line.slice(5));
  } catch (e) {
    return { torch_error: `Unreadable check result: ${e.message}` };
  }
}

// Driver's CUDA version from Python's view of nvcuda.dll, without importing torch. Used by the installer.
const DRIVER_CODE = String.raw`
import ctypes, os
try:
    lib = ctypes.WinDLL("nvcuda.dll") if os.name == "nt" else ctypes.CDLL("libcuda.so.1")
    v = ctypes.c_int(0)
    print("DRIVER_CUDA=%d" % (v.value if lib.cuDriverGetVersion(ctypes.byref(v)) == 0 else 0))
except Exception as e:
    print("DRIVER_CUDA=0")
`;
async function driverCuda(python) {
  if (python) {
    const r = await run(python, pyArgs(['-c', DRIVER_CODE]), { timeout: 30000, env: cleanEnv() });
    const m = r.out.match(/DRIVER_CUDA=(\d+)/);
    if (m && Number(m[1]) > 0) return Number(m[1]);
  }
  const s = await smiInfo();
  return (s && s.cuda) || null;
}

const PROBLEMS = {
  10: 'the device cannot start',
  12: 'not enough free resources',
  18: 'its drivers need reinstalling',
  22: 'it is disabled',
  24: 'it is not present or not working',
  28: 'no driver is installed for it',
  31: 'it is not working properly (driver could not be loaded)',
  43: 'Windows stopped it because it reported problems (usually a driver crash)',
  45: 'it is not connected (switched off or missing)',
  52: 'its driver signature could not be verified',
};
const CU_ERRORS = {
  1: 'invalid value', 2: 'out of memory', 3: 'not initialised', 46: 'the device is busy or unavailable', 100: 'no CUDA-capable device was found',
  101: 'invalid device', 222: 'the driver does not support this PTX version', 800: 'not permitted', 801: 'not supported',
  802: 'the system is not ready (driver still starting)', 803: 'the driver and CUDA library versions do not match', 804: 'forward compatibility is not supported on this device',
  999: 'unknown error',
};

const DRIVER_URL = 'https://www.nvidia.com/en-us/drivers/';

// Turns the raw checks into plain findings, in order of importance, and a verdict.
function analyze(d) {
  const findings = [];
  const add = (level, title, text = '', extra = {}) => findings.push({ level, title, text, ...extra });
  const py = d.python || {};
  const smi = d.smi;
  const win = d.windows;
  const adapters = (win && win.adapters) || [];
  const nv = adapters.filter((a) => /nvidia/i.test(a.name));
  const other = adapters.filter((a) => !/nvidia/i.test(a.name) && !/basic display|remote|virtual|parsec|meta|spacedesk/i.test(a.name));
  const basic = adapters.filter((a) => /basic display/i.test(a.name));
  const torchBuild = buildOfTorch(py.torch);
  const torchCuda = parseCudaText(py.torch_cuda);
  const drvCuda = py.driver_cuda || (smi && smi.cuda) || null;
  const drvVersion = (smi && smi.driver) || (nv[0] && nvidiaVersionFromWindows(nv[0].driverVersion)) || null;
  const best = chooseBuild(drvCuda);
  const available = !!py.available && py.compute_ok !== false;

  // 1. Does Windows see the NVIDIA GPU, and is it healthy?
  if (win && !win.error) {
    if (!nv.length) {
      add('error', "Windows doesn't see an NVIDIA GPU",
        `Display adapters found: ${adapters.map((a) => a.name).join(', ') || 'none'}. On a laptop this usually means the NVIDIA GPU is switched off, or its driver is missing so Windows shows it as "Microsoft Basic Display Adapter".`,
        { fix: 'Shut the laptop down fully (not restart) and start it again. In Lenovo Vantage, check the GPU / Hybrid mode settings and make sure the NVIDIA GPU is not switched off. Then install the latest driver from nvidia.com and run this check again.', link: DRIVER_URL });
    }
    for (const a of nv) {
      if (!a.present || a.problem === 45) {
        add('error', `${a.name} is switched off or not connected`, 'Device Manager lists it but says it is not connected right now (code 45).',
          { fix: 'Shut down fully and start again. If it stays like this, check Lenovo Vantage (GPU / Hybrid mode) and the BIOS graphics setting.' });
      } else if (a.problem) {
        add('error', `${a.name}: ${PROBLEMS[a.problem] || `Device Manager error code ${a.problem}`}`, `Device Manager reports code ${a.problem} for the NVIDIA GPU.`,
          { fix: a.problem === 22 ? 'Open Device Manager, expand Display adapters, right-click the NVIDIA GPU and choose Enable device.' : 'Do a clean driver install: download the latest driver from nvidia.com, choose Custom install and tick "Perform a clean installation". Then restart.', link: DRIVER_URL });
      }
    }
    if (basic.length && nv.length === 0) {
      add('warn', 'Windows is using the Basic Display Adapter', 'That means a graphics driver is missing.', { fix: 'Install the NVIDIA driver from nvidia.com.', link: DRIVER_URL });
    }
  } else if (win && win.error) {
    add('info', "Couldn't read the adapter list from Windows", win.error);
  }

  // 2. Is the NVIDIA driver installed and answering?
  if (smi === null && process.platform === 'win32' && nv.length) {
    add('error', 'The NVIDIA driver tools are missing', 'nvidia-smi.exe, which every NVIDIA driver installs, was not found. The driver is probably not installed properly.', { fix: 'Install the latest Game Ready or Studio driver from nvidia.com.', link: DRIVER_URL });
  } else if (smi && smi.error) {
    add('error', "The NVIDIA driver isn't responding", smi.error, { fix: 'Restart the laptop. If it still fails, do a clean driver install from nvidia.com.', link: DRIVER_URL });
  } else if (drvVersion || drvCuda) {
    add('ok', `NVIDIA driver ${drvVersion || ''}`.trim(), `Supports CUDA up to ${cudaText(drvCuda)}.`);
  }

  // 3. Does the PyTorch build match the driver?
  if (py.skipped) {
    add('info', 'PyTorch not checked', py.skipped);
  } else if (py.torch_error) {
    add('error', "PyTorch didn't load", py.torch_error, { fix: 'Reinstall the engine.' });
  } else if (py.torch) {
    if (torchBuild === 'cpu' || !py.torch_cuda) {
      add('error', `PyTorch ${py.torch} is the CPU-only build`, 'It can never use the GPU.', { fix: best ? `Click Repair GPU support to install the ${buildInfo(best).label} build.` : 'Update the NVIDIA driver, then click Repair GPU support.', action: best ? 'repair' : null });
    } else if (drvCuda && torchCuda && drvCuda < Math.floor(torchCuda / 1000) * 1000) {
      add('error', `PyTorch needs CUDA ${cudaText(torchCuda)}, but the driver only supports CUDA ${cudaText(drvCuda)}`,
        `PyTorch ${py.torch} was built for CUDA ${cudaText(torchCuda)}${torchCuda >= 13000 ? ', which needs NVIDIA driver 580 or newer' : ''}.`,
        { fix: best ? `Click Repair GPU support to switch to the ${buildInfo(best).label} build, which works with your driver. Or update the driver from nvidia.com.` : 'Update the NVIDIA driver from nvidia.com, then click Repair GPU support.', action: best ? 'repair' : null, link: DRIVER_URL });
    } else if (drvCuda && torchCuda && drvCuda < torchCuda && !available) {
      add('warn', `The driver supports CUDA ${cudaText(drvCuda)}; PyTorch was built for ${cudaText(torchCuda)}`,
        'This usually still works, but not always.', { fix: best && best !== torchBuild ? `Click Repair GPU support to install the ${buildInfo(best).label} build, an exact match.` : 'Update the NVIDIA driver.', action: best && best !== torchBuild ? 'repair' : null });
    } else {
      add('ok', `PyTorch ${py.torch}`, `Built for CUDA ${cudaText(torchCuda)}.`);
    }
  }

  // 4. Anything hiding the GPU from CUDA?
  if (py.env_cvd !== undefined && py.env_cvd !== null && !/^\s*\d/.test(py.env_cvd)) {
    add('error', 'CUDA_VISIBLE_DEVICES hides the GPU', `The environment variable CUDA_VISIBLE_DEVICES is set to "${py.env_cvd}".`,
      { fix: 'Open Windows Settings > System > About > Advanced system settings > Environment Variables, delete CUDA_VISIBLE_DEVICES, then restart the app.' });
  }
  if (py.nvcuda === false && !py.skipped) {
    add('error', "The CUDA driver library (nvcuda.dll) couldn't be loaded", py.nvcuda_error || '', { fix: 'Install or reinstall the NVIDIA driver.', link: DRIVER_URL });
  } else if (py.cu_init !== undefined && py.cu_init !== 0) {
    add('error', `CUDA couldn't start: ${CU_ERRORS[py.cu_init] || `error ${py.cu_init}`}`, `cuInit returned ${py.cu_init}.`,
      { fix: py.cu_init === 100 ? 'The NVIDIA GPU is not available to programs: check it is switched on (see above) and restart.' : 'Restart the laptop, then do a clean driver install if it still fails.', link: DRIVER_URL });
  }

  // 5. The result that matters
  if (available) {
    const dev = (py.devices || [])[0];
    add('ok', `PyTorch can use ${dev ? dev.name : 'the GPU'}`, dev ? `Compute capability ${dev.cap}, ${(dev.mem / 1073741824).toFixed(1)} GB of video memory. A test calculation on the GPU worked.` : '');
    if (dev && py.arch_list && py.arch_list.length && !py.arch_list.some((a) => a.replace('sm_', '') === dev.cap.replace('.', ''))) {
      add('warn', 'This PyTorch build has no code compiled for this GPU', `GPU is sm_${dev.cap.replace('.', '')}; the build has ${py.arch_list.join(', ')}.`, { action: best ? 'repair' : null });
    }
  } else if (py.available && py.compute_ok === false) {
    add('error', 'The GPU was found, but a test calculation failed', py.compute_error || '', { fix: 'Restart, then do a clean driver install from nvidia.com.', link: DRIVER_URL });
  } else if (py.torch && !py.torch_error) {
    const why = [py.init_error, ...(py.warnings || [])].filter(Boolean).join('\n');
    add('error', "PyTorch can't use the GPU", why || 'PyTorch reports that CUDA is not available.');
  }

  // 6. The two-GPU question
  if (nv.length && other.length) {
    add('info', `Two GPUs: ${nv[0].name} and ${other[0].name}`,
      `That's normal and isn't the problem by itself. CUDA only works on the NVIDIA GPU, so upscaling always runs there and never on the ${other[0].name}. In Task Manager the NVIDIA GPU is usually "GPU 1", and its graphs show 3D work by default. Click a graph's title and pick "Cuda" or "Compute_0" to see upscaling load.`);
  }

  const status = available ? 'ok' : py.skipped ? 'unknown' : 'cpu';
  const errors = findings.filter((f) => f.level === 'error');
  let summary;
  if (status === 'ok') summary = `Upscaling runs on ${((py.devices || [])[0] || {}).name || 'the NVIDIA GPU'}.`;
  else if (status === 'unknown') summary = py.skipped;
  else summary = errors.length ? `PyTorch can't use the GPU. Main problem: ${errors[0].title}.` : "PyTorch can't use the GPU.";
  const canRepair = !!best && (torchBuild !== best || findings.some((f) => f.action === 'repair'));
  return { status, summary, findings, driverCuda: drvCuda, driver: drvVersion, torch: py.torch || null, torchBuild, bestBuild: best, canRepair, devices: py.devices || [] };
}

// Three checks, one after the other so progress can be reported: Windows' adapter list, the NVIDIA
// driver (nvidia-smi), then CUDA and PyTorch inside the engine's Python.
async function diagnose({ python, cwd, onStep }) {
  const step = onStep || (() => {});
  step('Reading the display adapters from Windows', 0, 3);
  const windows = await windowsAdapters();
  step('Asking the NVIDIA driver (nvidia-smi)', 1, 3);
  const smi = await smiInfo();
  step('Testing CUDA and PyTorch on the GPU', 2, 3);
  const py = await pythonDiag(python, cwd);
  step('Done', 3, 3);
  const raw = { at: new Date().toISOString(), platform: `${process.platform} ${process.arch}`, windows, smi, python: py };
  return { raw, result: analyze(raw) };
}

// A plain-text report the user can open or copy.
function reportText({ raw, result }) {
  const lines = [`Waifu2x Batch GPU diagnosis, ${new Date(raw.at).toLocaleString()}`, '', `Result: ${result.summary}`, ''];
  for (const f of result.findings) {
    lines.push(`[${f.level.toUpperCase()}] ${f.title}`);
    if (f.text) lines.push(`    ${f.text.replace(/\n/g, '\n    ')}`);
    if (f.fix) lines.push(`    Fix: ${f.fix}`);
  }
  lines.push('', '--- raw data ---', JSON.stringify(raw, null, 2));
  return lines.join('\n') + '\n';
}

module.exports = {
  TORCH_BUILDS, chooseBuild, buildInfo, buildOfTorch, torchRequirements, cudaText, parseCudaText,
  parseSmiHeader, parseSmiQuery, nvidiaVersionFromWindows, mergeAdapters, analyze, diagnose, reportText,
  smiInfo, gpuUsage, driverCuda,
};
