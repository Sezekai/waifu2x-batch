(function (root) {
  'use strict';
  // Shared formatting for progress panels. Used by the main process (logs) and the renderer (panels).

  function fmtBytes(b) {
    if (b == null || !isFinite(b)) return '–';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = Math.max(0, b);
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    const d = i === 0 || n >= 100 ? 0 : n >= 10 ? 1 : 2;
    return `${n.toFixed(d)} ${units[i]}`;
  }

  // Seconds -> "m:ss" or "h:mm:ss"
  function fmtTime(sec) {
    if (sec == null || !isFinite(sec)) return '–';
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const pad = (x) => String(x).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
  }

  function fmtVal(v, unit) {
    if (unit === 'bytes') return fmtBytes(v);
    return Number(v).toLocaleString();
  }

  function fmtRate(r, unit) {
    if (!(r > 0)) return '';
    if (unit === 'bytes') return `${fmtBytes(r)}/s`;
    return `${r < 10 ? r.toFixed(2) : Math.round(r)} ${unit}/s`;
  }

  const api = { fmtBytes, fmtTime, fmtVal, fmtRate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Progress = api;
})(typeof window !== 'undefined' ? window : globalThis);
