'use strict';
// How every Python process is started.
//
// The embedded Python runs in isolated mode because of its ._pth file. That means it ignores
// PYTHONPATH, PYTHONUTF8 and other PYTHON* variables, so the settings that matter are passed
// as command-line flags instead:
//   -X utf8  read and write files (like the image list) as UTF-8, so Japanese filenames work
//   -u       unbuffered output, so progress lines arrive as they happen
// The environment is also cleared of Python variables, the same way nunif's setenv.bat does it.

const PY_FLAGS = ['-X', 'utf8', '-u'];

function pyArgs(args) {
  return [...PY_FLAGS, ...args];
}

function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of ['PYTHONHOME', 'PYTHONPATH', 'PYTHONSTARTUP', 'PYTHONUSERBASE', 'PYTHONEXECUTABLE', 'PIP_TARGET']) {
    delete env[k];
  }
  return { ...env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', ...extra };
}

// Splits a stream into lines. Progress bars redraw with \r, so \r counts as a line end too.
function lineSplitter(onLine) {
  let buf = '';
  return {
    push(chunk) {
      buf += String(chunk);
      const parts = buf.split(/\r\n|\r|\n/);
      buf = parts.pop();
      for (const p of parts) if (p.trim()) onLine(p);
    },
    flush() {
      if (buf.trim()) onLine(buf);
      buf = '';
    },
  };
}

module.exports = { PY_FLAGS, pyArgs, cleanEnv, lineSplitter };
