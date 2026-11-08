(() => {
  'use strict';
  const api = window.api;
  const P = window.Presets;
  const PR = window.Progress;
  const T = window.Theme;

  /* =====================================================================================
     helpers
     ===================================================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baseName = (p) => String(p).split(/[\\/]/).pop();
  const dirName = (p) => String(p).replace(/[\\/][^\\/]*$/, '');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } },
  };

  const ICONS = {
    logo: '<rect x="3" y="11" width="9" height="9" rx="1.6"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H16"/>',
    batch: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    engine: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8.2-9-8.2Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
    keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>',
    log: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    folderopen: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1"/><path d="M3 19 5.5 11h16L19 19H3Z"/>',
    upscale: '<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>',
    again: '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    hold: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 2v20"/><path d="m9 10-2 2 2 2M15 10l2 2-2 2"/>',
    side: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
    zin: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
    zout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/>',
    dot: '<circle cx="12" cy="12" r="3.2"/>',
    font: '<path d="M5 19 11 5h2l6 14M8 14h8"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    chevr: '<path d="m9 6 6 6-6 6"/>',
    chevl: '<path d="m15 6-6 6 6 6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><rect x="3.5" y="4.5" width="3" height="3" rx=".6"/><rect x="3.5" y="10.5" width="3" height="3" rx=".6"/><rect x="3.5" y="16.5" width="3" height="3" rx=".6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.4"/><rect x="13" y="4" width="7" height="7" rx="1.4"/><rect x="4" y="13" width="7" height="7" rx="1.4"/><rect x="13" y="13" width="7" height="7" rx="1.4"/>',
    imgsm: '<rect x="7" y="8" width="10" height="8" rx="1.4"/><path d="m17 14-3-3-5 5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    seq: '<rect x="7" y="5" width="10" height="14" rx="1.5"/><path d="M3 8v8M21 8v8"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z"/>',
    stack: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    sortup: '<path d="M8 19V5M4 9l4-4 4 4M14 7h6M14 12h4M14 17h2"/>',
    sortdown: '<path d="M8 5v14M4 15l4 4 4-4M14 7h2M14 12h4M14 17h6"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const svg = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const paintIcons = (root = document) => $$('[data-ic]', root).forEach((el) => { el.innerHTML = svg(el.dataset.ic); });

  /* =====================================================================================
     toasts and in-app dialogs (no Windows pop-ups)
     ===================================================================================== */
  function toast(msg, kind = 'info', ms = 4500) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = `${svg(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'info')}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  let dialogOpen = null;
  function dialog({ title, body = '', ok = 'OK', cancel = 'Cancel', danger = false, input = null, extra = '', wide = false }) {
    return new Promise((resolve) => {
      const box = $('#dialog');
      box.classList.toggle('wide', wide);
      box.innerHTML = `<h3>${esc(title)}</h3>${body ? `<p>${body}</p>` : ''}${extra}
        ${input ? `<input class="input" id="dlg-in" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}" aria-label="${esc(input.label || title)}">` : ''}
        <div class="acts">${cancel ? `<button class="btn" id="dlg-no">${esc(cancel)}</button>` : ''}<button class="btn ${danger ? 'danger' : 'primary'}" id="dlg-ok">${esc(ok)}</button></div>`;
      $('#overlay').hidden = false;
      const close = (res) => { $('#overlay').hidden = true; dialogOpen = null; resolve(res); };
      dialogOpen = close;
      $('#dlg-ok').onclick = () => close({ ok: true, value: input ? $('#dlg-in').value.trim() : undefined });
      if (cancel) $('#dlg-no').onclick = () => close({ ok: false });
      const f = input ? $('#dlg-in') : $('#dlg-ok');
      setTimeout(() => { f.focus(); if (input) f.select(); }, 20);
    });
  }
  $('#overlay').addEventListener('mousedown', (e) => { if (e.target.id === 'overlay' && dialogOpen) dialogOpen({ ok: false }); });

  /* =====================================================================================
     log drawer
     ===================================================================================== */
  const LOG_MAX = 3000;
  const logLines = [];
  function log(text, kind = '') {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    for (const line of String(text).split(/\r?\n/)) {
      if (!line.trim()) continue;
      logLines.push({ time, line, kind });
    }
    if (logLines.length > LOG_MAX) logLines.splice(0, logLines.length - LOG_MAX);
    if (ui.logOpen) renderLog();
  }
  function renderLog() {
    const pre = $('#logtext');
    const atBottom = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 30;
    pre.innerHTML = logLines.map((l) => `<span class="t">[${l.time}]</span> <span class="${l.kind}">${esc(l.line)}</span>`).join('\n');
    if (atBottom) pre.scrollTop = pre.scrollHeight;
  }
  function setLog(open) {
    ui.logOpen = open;
    $('#drawer').classList.toggle('open', open);
    $('#s-log').classList.toggle('on', open);
    $('#rb-log').classList.toggle('on', open);
    if (open) renderLog();
  }
  $('#s-log').onclick = () => setLog(!ui.logOpen);
  $('#rb-log').onclick = () => setLog(!ui.logOpen);
  $('#d-close').onclick = () => setLog(false);
  $('#d-clear').onclick = () => { logLines.length = 0; renderLog(); };
  $('#d-copy').onclick = () => {
    const text = logLines.map((l) => `[${l.time}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text).then(() => toast('Log copied', 'ok')).catch(() => toast('Could not copy the log', 'err'));
  };

  /* =====================================================================================
     status bar: one running task at a time, with %, elapsed and time left
     ===================================================================================== */
  const ui = { screen: 'batch', logOpen: false };
  const task = { kind: null, key: '', label: '', name: '', done: 0, total: null, unit: 'items', state: 'idle', message: '', start: 0, firstDone: 0, lastDone: null, lastChange: 0, endAt: 0 };

  // p.key names the task for timing: elapsed and time left keep running while the label changes
  // ("Upscaling 3 of 40", "Upscaling 4 of 40"...). Without a key the label is the key.
  function setTask(kind, p) {
    const now = Date.now();
    const key = p.key || p.label;
    const restart = task.kind !== kind || task.key !== key || task.state !== 'running' || (p.done != null && task.lastDone != null && p.done < task.lastDone);
    if (restart && (p.state || 'running') === 'running') {
      Object.assign(task, { kind, key, label: p.label, start: now, firstDone: p.done || 0, lastDone: null, lastChange: now, endAt: 0 });
    }
    task.kind = kind;
    task.label = p.label;
    if (p.name !== undefined) task.name = p.name;
    if (p.done != null && p.done !== task.lastDone) { task.lastDone = p.done; task.lastChange = now; }
    task.done = p.done || 0;
    task.total = p.total || null;
    task.unit = p.unit || 'items';
    task.state = p.state || 'running';
    task.message = p.message || '';
    if (task.state !== 'running' && !task.endAt) task.endAt = now;
    renderStatus();
  }

  function taskNumbers() {
    const now = task.endAt || Date.now();
    const elapsed = (now - task.start) / 1000;
    const rate = elapsed > 0.5 ? (task.done - task.firstDone) / elapsed : 0;
    const pct = task.total ? Math.min(task.state === 'running' ? 99 : 100, (task.done / task.total) * 100) : null;
    const left = task.total && rate > 0 && task.state === 'running' ? Math.max(0, (task.total - task.done) / rate) : null;
    const idle = (Date.now() - task.lastChange) / 1000;
    return { elapsed, rate, pct, left, idle };
  }

  function renderStatus() {
    const bar = $('#status');
    bar.classList.toggle('err', task.state === 'error');
    $('#s-review').hidden = !(task.kind === 'job' && task.state === 'done' && ui.lastMade && ui.lastMade.length);
    $('#s-stop').hidden = !(typeof st !== 'undefined' && st.jobs && st.jobs.size);
    const nameEl = $('#s-name');
    nameEl.classList.remove('warn');
    if (task.state === 'idle' || !task.kind) {
      $('#s-job').textContent = 'Ready';
      nameEl.textContent = ui.lastSummary || '';
      $('#s-bar').style.width = '0%';
      $('.track').classList.remove('indet');
      $('#s-pct').textContent = '–';
      $('#s-time').textContent = 'Nothing running';
      return;
    }
    const n = taskNumbers();
    if (task.state === 'running') {
      $('#s-job').textContent = task.label;
      if (n.idle > 20) {
        nameEl.textContent = `No new progress for ${PR.fmtTime(n.idle)}. It may be a slow step; the log shows what is happening.`;
        nameEl.classList.add('warn');
      } else nameEl.textContent = task.name;
      $('.track').classList.toggle('indet', n.pct === null);
      $('#s-bar').style.width = n.pct === null ? '' : n.pct + '%';
      $('#s-pct').textContent = n.pct === null ? '' : Math.floor(n.pct) + '%';
      $('#s-time').textContent = `${PR.fmtTime(n.elapsed)} elapsed · ${n.left != null ? 'about ' + PR.fmtTime(n.left) + ' left' : task.total ? 'working out time left…' : 'size not known yet'}`;
    } else {
      $('#s-job').textContent = task.state === 'error' ? 'Stopped' : 'Finished';
      nameEl.textContent = task.message;
      $('.track').classList.remove('indet');
      $('#s-bar').style.width = task.state === 'done' ? '100%' : (n.pct || 0) + '%';
      $('#s-pct').textContent = task.state === 'done' ? '100%' : n.pct === null ? '' : Math.floor(n.pct) + '%';
      $('#s-time').textContent = `took ${PR.fmtTime(n.elapsed)}`;
    }
  }
  setInterval(() => {
    if (task.state === 'running') renderStatus();
    if (ui.screen === 'engine' && eng.installing) renderEngineProgress();
  }, 1000);

  /* =====================================================================================
     appearance: themes, presets, custom colours and fonts
     ===================================================================================== */
  const DEFAULT_ID = 'default';
  const look = { current: T.normalize(T.DEFAULT_THEME), activeId: DEFAULT_ID, saved: [] };
  let customFonts = [];
  const loadedCustom = new Set();

  function applyTheme() {
    const v = T.cssVars(look.current);
    const root = document.documentElement.style;
    for (const [k, val] of Object.entries(v)) {
      if (k === 'scheme') document.documentElement.style.colorScheme = val;
      else root.setProperty('--' + k, val);
    }
    // the window's own minimise / maximise / close buttons follow the theme too
    const bg = look.current.background;
    if (api.setTitleBar) api.setTitleBar({ color: bg.ground, symbolColor: bg.sec }).catch(() => {});
  }
  let saveTimer = null;
  function persistLook() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => api.setAppearance({ version: 1, current: look.current, activeId: look.activeId, saved: look.saved }).catch(() => {}), 300);
  }
  async function loadAppearance() {
    try {
      const d = await api.getAppearance();
      if (d && d.current) {
        look.current = T.normalize(d.current);
        look.activeId = d.activeId || null;
        look.saved = Array.isArray(d.saved) ? d.saved.filter((s) => s && s.id && s.theme).map((s) => ({ id: s.id, name: String(s.name || 'Theme'), theme: T.normalize(s.theme) })) : [];
      }
    } catch (_) { /* first run: defaults */ }
    await loadCustomFonts();
    applyTheme();
  }
  async function loadCustomFonts() {
    try { customFonts = await api.listFonts(); } catch (_) { customFonts = []; }
    for (const f of customFonts) {
      for (const file of f.files || []) {
        const key = f.id + '/' + file.name;
        if (loadedCustom.has(key)) continue;
        try {
          const buf = await api.readFont(f.id, file.name);
          const face = new FontFace(f.family, buf, { weight: String(file.weight), style: file.style || 'normal' });
          await face.load();
          document.fonts.add(face);
          loadedCustom.add(key);
        } catch (e) {
          log(`Could not load font ${file.name}: ${e.message}`, 'e');
        }
      }
    }
  }
  // A system font counts as installed when text set in it measures differently from the fallbacks.
  const installedCache = new Map();
  function systemFontInstalled(family) {
    if (installedCache.has(family)) return installedCache.get(family);
    const c = document.createElement('canvas').getContext('2d');
    const text = 'mmmmmmmmmmlli1WQ waifu2x 0123 AaBbGg';
    const ok = ['monospace', 'serif'].some((fb) => { c.font = `20px ${fb}`; const w0 = c.measureText(text).width; c.font = `20px '${family}', ${fb}`; return c.measureText(text).width !== w0; });
    installedCache.set(family, ok);
    return ok;
  }
  function savedTheme(id) {
    if (id === DEFAULT_ID) return { id: DEFAULT_ID, name: 'Default', theme: T.normalize(T.DEFAULT_THEME), builtIn: true };
    return look.saved.find((s) => s.id === id) || null;
  }
  const themeKey = (t) => JSON.stringify({ ...T.normalize(t), name: '' });
  function setLook(next, { rerender = true } = {}) {
    look.current = T.normalize({ ...next, name: look.current.name });
    applyTheme();
    persistLook();
    if (rerender && ui.screen === 'appearance') renderAppearance();
    else if (ui.screen === 'appearance') { renderThemeList(); $('#a-desc').textContent = T.describe(look.current).text; }
    if (ui.screen === 'compare') requestAnimationFrame(applyView);
  }

  /* =====================================================================================
     settings forms (Batch and Compare keep their own saved settings)
     ===================================================================================== */
  const OPTS = {
    style: [['artwork', 'Artwork'], ['artwork_scan', 'Artwork/Scans'], ['photo', 'Photo']],
    noise: [['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['highest', 'Highest']],
    scale: [['none', 'None'], ['2x', '2x'], ['4x', '4x']],
    tileSize: [[128, '128'], [256, '256'], [384, '384'], [512, '512'], [640, '640']],
  };
  const optLabel = (k, v) => (OPTS[k].find(([x]) => String(x) === String(v)) || [v, v])[1];
  const selectHtml = (k, value, title) => `<span class="sel" title="${esc(title || '')}"><select data-k="${k}">${OPTS[k].map(([v, l]) => `<option value="${v}"${String(v) === String(value) ? ' selected' : ''}>${l}</option>`).join('')}</select>${svg('chev')}</span>`;
  function buildSettings(host, key, onChange, { tile = true, tileFrom = null } = {}) {
    let s;
    try { s = P.normalize(store.get(key, {})); } catch (_) { s = P.normalize({}); }
    host.innerHTML = `<span class="inl">Style</span>${selectHtml('style', s.style)}
      <span class="inl">Noise</span>${selectHtml('noise', s.noise, 'Noise reduction. Use it only if the image has JPEG noise.')}
      <span class="inl">Upscale</span>${selectHtml('scale', s.scale)}
      ${tile ? `<span class="inl">Tile</span>${selectHtml('tileSize', s.tileSize, 'Tile size. Lower it if the GPU runs out of memory.')}` : ''}
      <label class="cb" title="Test-time augmentation: a little better, about 8 times slower"><input type="checkbox" data-k="tta"${s.tta ? ' checked' : ''}>TTA (slower)</label>`;
    const read = () => P.normalize({
      style: $('[data-k=style]', host).value, noise: $('[data-k=noise]', host).value, scale: $('[data-k=scale]', host).value,
      tileSize: tile ? $('[data-k=tileSize]', host).value : tileFrom ? tileFrom().tileSize : 256, tta: $('[data-k=tta]', host).checked,
    });
    host.addEventListener('change', () => {
      let s2;
      try { s2 = read(); P.chooseMethod(P.NOISE_LEVEL[s2.noise], P.SCALE_FACTOR[s2.scale]); } catch (e) { toast(e.message, 'err'); }
      store.set(key, read());
      if (onChange) onChange();
    });
    return read;
  }
  const settingsText = (s) => `${optLabel('style', s.style)} · ${optLabel('noise', s.noise)} · ${optLabel('scale', s.scale)}${s.tta ? ' · TTA' : ''}`;

  /* =====================================================================================
     state shared by screens
     ===================================================================================== */
  const legacyFolder = store.get('w2x-folder', null);
  const st = {
    folders: store.get('w2x-folders', legacyFolder ? [legacyFolder] : []),
    recursive: !!store.get('w2x-recursive', false),
    items: [],
    byPath: new Map(),
    rows: [],
    der: new Map(),
    scanErrors: [],
    ticked: new Set(),
    anchor: null,
    focus: null,
    filter: 'all',
    dir: null,
    sort: store.get('w2x-sort', { key: 'name', dir: 1 }),
    view: store.get('w2x-view', 'list'),
    listSize: store.get('w2x-listsize', 24),
    gridSize: store.get('w2x-gridsize', 190),
    over: store.get('w2x-overrides', {}),
    opts: { clickTicks: false, hoverPreview: true, previewSize: 340, ...store.get('w2x-batch-opts', {}) },
    collapsed: new Set(store.get('w2x-collapsed', [])),
    jobs: new Map(),
    failedRecent: new Set(),
    queueInfo: null,
    session: null,
  };
  const dims = new Map();
  const dimWaiters = new Map();
  function getDims(url) {
    if (dims.has(url)) return Promise.resolve(dims.get(url));
    if (dimWaiters.has(url)) return dimWaiters.get(url);
    const p = new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { const d = { w: im.naturalWidth, h: im.naturalHeight }; dims.set(url, d); resolve(d); };
      im.onerror = () => resolve({ w: 1, h: 1 });
      im.src = url;
    });
    dimWaiters.set(url, p);
    return p;
  }
  const eng = { installed: false, info: null, installing: false, step: null, error: false, ran: false, appInfo: null };
  const engineReady = () => eng.installed;

  /* =====================================================================================
     navigation
     ===================================================================================== */
  function go(screen) {
    if (ui.screen !== screen) leaveFull();
    ui.screen = screen;
    hidePreview();
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 's-' + screen));
    $$('.rb[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === screen));
    store.set('w2x-screen', screen);
    $('#t-screen').textContent = { batch: 'Batch', compare: 'Compare', engine: 'Engine', appearance: 'Appearance' }[screen] || '';
    if (screen === 'compare') { renderCompareList(); renderVersions(); requestAnimationFrame(fitView); }
    if (screen === 'engine') { renderEngine(); maybeAutoDiagnose(); }
    if (screen === 'batch' && st.view === 'gallery') requestAnimationFrame(gFit);
    if (screen === 'appearance') renderAppearance();
  }
  $$('.rb[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));

  function renderBanners() {
    const html = `${svg('engine')}<div class="t"><b>The upscaling engine isn't installed yet.</b> <span>It's a one-time download of about 3 GB. Upscaling is turned off until it's ready.</span></div><button class="btn primary" data-go-engine>Install engine</button>`;
    for (const id of ['#b-banner', '#c-banner']) {
      const el = $(id);
      el.hidden = engineReady() || eng.installing;
      if (!el.hidden && !el.dataset.filled) { el.innerHTML = html; el.dataset.filled = '1'; $('[data-go-engine]', el).onclick = () => go('engine'); }
    }
    $('#rb-engine .dot')?.remove();
    if (!engineReady()) $('#rb-engine').insertAdjacentHTML('beforeend', '<span class="dot" title="Not installed"></span>');
  }

  /* =====================================================================================
     BATCH: folders, folder tree, list / grid / gallery, own settings per image, the queue
     ===================================================================================== */
  const batchRead = buildSettings($('#b-settings'), 'w2x-batch-settings', () => renderBatch());
  $('#b-recursive').checked = st.recursive;
  const SEP_RE = /[\\/]/;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const itemByPath = (p) => st.byPath.get(p);
  const fmtDim = (w, h) => (w && h ? `${w} × ${h}` : '–');
  const trimSep = (p) => String(p).replace(/[\\/]+$/, '');
  const inDir = (it, d) => !d || it.dir === d || it.dir.startsWith(trimSep(d) + '\\') || it.dir.startsWith(trimSep(d) + '/');
  const hasOver = (p) => !!st.over[p] && Object.keys(st.over[p]).length > 0;
  const saveOver = () => store.set('w2x-overrides', st.over);
  const jobsActive = () => st.jobs.size > 0;

  // The settings an image is upscaled with: the defaults, plus anything set for that image.
  function effFor(p) {
    const d = batchRead();
    if (!hasOver(p)) return d;
    try { return P.normalize({ ...d, ...st.over[p] }); } catch (_) { return d; }
  }

  // Where an image is in the queue, if it's in it.
  function jobState(p) {
    for (const j of st.jobs.values()) {
      if (!j.items.has(p)) continue;
      if (j.failed.has(p)) return 'failed';
      if (j.done.has(p)) return 'done';
      if (j.state === 'running' && j.current === p) return 'running';
      return 'queued';
    }
    return st.failedRecent.has(p) ? 'failed' : null;
  }
  const STATUS_RANK = { running: 0, queued: 1, failed: 2, todo: 3, other: 4, done: 5 };
  function computeDerived() {
    const d = batchRead();
    const dtag = P.tagFor(d);
    st.der = new Map();
    for (const it of st.items) {
      let eff = d;
      let tag = dtag;
      const over = hasOver(it.path);
      if (over) { try { eff = P.normalize({ ...d, ...st.over[it.path] }); tag = P.tagFor(eff); } catch (_) { /* keep defaults */ } }
      const js = jobState(it.path);
      const status = js || (it.variantTags.includes(tag) ? 'done' : it.variantTags.length ? 'other' : 'todo');
      st.der.set(it.path, { eff, tag, status, over, factor: P.SCALE_FACTOR[eff.scale] });
    }
  }
  const der = (it) => st.der.get(it.path) || { eff: batchRead(), tag: '', status: 'todo', over: false, factor: 2 };
  function statusHtml(k) {
    switch (k) {
      case 'failed': return `<span class="st bad">${svg('alert')}Failed</span>`;
      case 'done': return `<span class="st ok">${svg('check')}Done</span>`;
      case 'running': return '<span class="st run"><span class="mini"><i></i></span>Upscaling</span>';
      case 'queued': return '<span class="st wait">Queued</span>';
      case 'other': return '<span class="st wait" title="Has versions made with other settings">Other settings</span>';
      default: return '<span class="st wait">Not done</span>';
    }
  }

  /* ---------- sorting and filtering ---------- */
  const SORTS = [['name', 'Name'], ['size', 'Size'], ['out', 'Output size'], ['settings', 'Settings'], ['versions', 'Versions'], ['status', 'Status'], ['bytes', 'File size'], ['mtime', 'Date modified'], ['folder', 'Folder']];
  const px = (it) => (it.w && it.h ? it.w * it.h : -1);
  function comparer(key) {
    const byName = (a, b) => collator.compare(a.name, b.name);
    switch (key) {
      case 'size': return (a, b) => px(a) - px(b);
      case 'out': return (a, b) => px(a) * der(a).factor ** 2 - px(b) * der(b).factor ** 2;
      case 'settings': return (a, b) => collator.compare(settingsText(der(a).eff), settingsText(der(b).eff));
      case 'versions': return (a, b) => (a.versions || 0) - (b.versions || 0);
      case 'status': return (a, b) => STATUS_RANK[der(a).status] - STATUS_RANK[der(b).status];
      case 'bytes': return (a, b) => (a.bytes || 0) - (b.bytes || 0);
      case 'mtime': return (a, b) => (a.mtime || 0) - (b.mtime || 0);
      case 'folder': return (a, b) => collator.compare(a.dir, b.dir);
      default: return byName;
    }
  }
  // Images in the chosen folder, sorted. Compare uses this too.
  function scopeItems() {
    const rows = st.items.filter((it) => inDir(it, st.dir));
    const cmp = comparer(st.sort.key);
    const dir = st.sort.dir;
    rows.sort((a, b) => cmp(a, b) * dir || collator.compare(a.name, b.name) || collator.compare(a.path, b.path));
    return rows;
  }
  function visibleItems() {
    const rows = scopeItems();
    if (st.filter === 'all') return rows;
    return rows.filter((it) => (st.filter === 'done') === (der(it).status === 'done'));
  }

  /* ---------- folders ---------- */
  function sepOf(p) { return String(p).includes('\\') ? '\\' : '/'; }
  function buildTree() {
    const roots = st.folders.map((r) => ({ path: r, name: trimSep(r).split(SEP_RE).pop() || r, own: 0, total: 0, kids: new Map(), root: true }));
    const byRoot = new Map(roots.map((n) => [n.path, n]));
    for (const it of st.items) {
      const r = byRoot.get(it.root);
      if (!r) continue;
      let node = r;
      const rel = it.dir.length > trimSep(r.path).length ? it.dir.slice(trimSep(r.path).length).replace(/^[\\/]+/, '') : '';
      if (rel) {
        for (const seg of rel.split(SEP_RE)) {
          const k = seg.toLowerCase();
          if (!node.kids.has(k)) node.kids.set(k, { path: trimSep(node.path) + sepOf(r.path) + seg, name: seg, own: 0, total: 0, kids: new Map() });
          node = node.kids.get(k);
        }
      }
      node.own++;
    }
    const tot = (n) => (n.total = n.own + [...n.kids.values()].reduce((a, k) => a + tot(k), 0));
    roots.forEach(tot);
    return roots;
  }
  function treeHtml(n, depth) {
    const kids = [...n.kids.values()].sort((a, b) => collator.compare(a.name, b.name));
    const open = !st.collapsed.has(n.path);
    const on = st.dir === n.path;
    const err = n.root && (st.scanErrors || []).find((e) => e.root === n.path);
    let h = `<div class="tn${on ? ' on' : ''}${err ? ' bad' : ''}" data-dir="${esc(n.path)}" style="--d:${depth}" role="treeitem" aria-selected="${on}" title="${esc(err ? `${n.path}\n${err.message}` : n.path)}">
      ${kids.length ? `<button class="tw${open ? ' open' : ''}" data-tw="${esc(n.path)}" aria-label="${open ? 'Collapse' : 'Expand'}">${svg('chevr')}</button>` : '<span class="tw"></span>'}
      ${svg(err ? 'alert' : 'folder')}<span class="nm">${esc(n.name)}</span><span class="n">${err ? 'missing' : n.total}</span>
      ${n.root ? `<button class="rmf" data-rmroot="${esc(n.path)}" title="Take this folder off the list (nothing is deleted)" aria-label="Remove folder">${svg('x')}</button>` : ''}</div>`;
    if (open) h += kids.map((k) => treeHtml(k, depth + 1)).join('');
    return h;
  }
  function renderFolders() {
    const n = st.folders.length;
    const f = $('#b-fsum');
    f.innerHTML = n ? `<b>${n} folder${n === 1 ? '' : 's'}</b><span class="faint">&nbsp;·&nbsp;${esc(st.folders.join(' · '))}</span>` : '<span class="ph">Add a folder of images</span>';
    f.title = n ? st.folders.join('\n') : 'Add a folder';
    $('#b-tree').innerHTML = n
      ? `<div class="tn all${!st.dir ? ' on' : ''}" data-dir="" role="treeitem"><span class="tw"></span>${svg('stack')}<span class="nm">All folders</span><span class="n">${st.items.length}</span></div>` + buildTree().map((r) => treeHtml(r, 0)).join('')
      : '';
  }
  async function addFolder() {
    const f = await api.pickFolder();
    if (!f) return;
    if (st.folders.some((x) => x.toLowerCase() === f.toLowerCase())) { toast('That folder is already in the list.', 'info'); return; }
    st.folders.push(f);
    store.set('w2x-folders', st.folders);
    await loadFolders();
  }
  $('#b-add').onclick = addFolder;
  $('#b-fsum').onclick = addFolder;
  $('#b-recursive').onchange = (e) => { st.recursive = e.target.checked; store.set('w2x-recursive', st.recursive); loadFolders(); };
  $('#b-tree').addEventListener('click', (e) => {
    const tw = e.target.closest('[data-tw]');
    if (tw) {
      e.stopPropagation();
      const p = tw.dataset.tw;
      st.collapsed.has(p) ? st.collapsed.delete(p) : st.collapsed.add(p);
      store.set('w2x-collapsed', [...st.collapsed]);
      renderFolders();
      return;
    }
    const rm = e.target.closest('[data-rmroot]');
    if (rm) {
      e.stopPropagation();
      const p = rm.dataset.rmroot;
      st.folders = st.folders.filter((x) => x !== p);
      store.set('w2x-folders', st.folders);
      if (st.dir && (st.dir === p || inDir({ dir: st.dir }, p))) st.dir = null;
      toast(`Took ${trimSep(p).split(SEP_RE).pop()} off the list. Nothing was deleted.`, 'ok');
      loadFolders();
      return;
    }
    const n = e.target.closest('.tn');
    if (!n) return;
    st.dir = n.dataset.dir || null;
    renderBatch();
    renderCompareList();
  });

  async function loadFolders() {
    if (!st.folders.length) {
      st.items = []; st.byPath = new Map(); st.scanErrors = [];
    } else {
      try {
        const r = await api.scan(st.folders, st.recursive);
        st.items = r.items;
        st.scanErrors = r.errors || [];
      } catch (e) {
        st.items = [];
        toast(`Couldn't read the folders: ${e.message}`, 'err');
      }
      st.byPath = new Map(st.items.map((i) => [i.path, i]));
      for (const e of st.scanErrors) log(`${e.root}: ${e.message}`, 'e');
      if (st.scanErrors.length) toast(`${st.scanErrors.length} folder${st.scanErrors.length === 1 ? '' : 's'} couldn't be read. Hover it in the folder list to see why.`, 'err', 7000);
    }
    for (const p of [...st.ticked]) if (!st.byPath.has(p)) st.ticked.delete(p);
    if (st.dir && !st.items.some((it) => inDir(it, st.dir))) st.dir = null;
    if (jobsActive()) updateJobTask();
    renderBatch();
    renderCompareList();
  }

  // Fresh entries for some images (after an upscale, or a keep / delete) without rescanning everything.
  async function refreshItems(paths) {
    const entries = paths.map((p) => [p, (itemByPath(p) || {}).root || '']).filter(([p]) => st.byPath.has(p));
    if (!entries.length) return;
    let fresh = [];
    try { fresh = await api.describe(entries); } catch (_) { return; }
    entries.forEach(([p], i) => {
      const f = fresh[i];
      if (!f) removeItem(p);
      else Object.assign(itemByPath(p), f, { root: itemByPath(p).root });
    });
  }
  function removeItem(p) {
    st.items = st.items.filter((it) => it.path !== p);
    st.byPath.delete(p);
    st.ticked.delete(p);
    delete st.over[p];
    saveOver();
    if (st.focus === p) st.focus = null;
  }

  /* ---------- rendering ---------- */
  function renderBatch() {
    computeDerived();
    renderFolders();
    const rows = visibleItems();
    st.rows = rows;
    const scope = st.items.filter((it) => inDir(it, st.dir));
    const doneN = scope.filter((it) => der(it).status === 'done').length;
    $('#b-filter').innerHTML = [['all', 'All', scope.length], ['todo', 'Not done', scope.length - doneN], ['done', 'Done', doneN]]
      .map(([k, l, n]) => `<button data-f="${k}" class="${st.filter === k ? 'on' : ''}" role="tab" aria-selected="${st.filter === k}">${l}<span class="n">${n}</span></button>`).join('');
    $$('#b-views button').forEach((b) => b.classList.toggle('on', b.dataset.view === st.view));
    $('#b-sort').innerHTML = SORTS.map(([k, l]) => `<option value="${k}"${st.sort.key === k ? ' selected' : ''}>${l}</option>`).join('');
    $('#b-sortdir').innerHTML = svg(st.sort.dir > 0 ? 'sortup' : 'sortdown');
    $('#b-sortdir').title = st.sort.dir > 0 ? 'Ascending: click to reverse' : 'Descending: click to reverse';
    $$('#b-list th[data-sort]').forEach((th) => {
      th.classList.toggle('sorted', th.dataset.sort === st.sort.key);
      th.dataset.dir = th.dataset.sort === st.sort.key ? (st.sort.dir > 0 ? 'asc' : 'desc') : '';
    });
    const gal = st.view === 'gallery';
    $('#b-list').hidden = st.view !== 'list';
    $('#b-grid').hidden = st.view !== 'grid';
    $('#b-gal').hidden = !gal;
    $('#b-treep').hidden = !st.folders.length || gal;
    $('#b-sizer').hidden = gal;
    applySize();
    if (st.view === 'list') renderList(rows);
    else if (st.view === 'grid') renderGrid(rows);
    else renderGallery();
    renderSummary();
    renderSelbar();
    renderRunButton();
    renderGpuBanner();
    const empty = $('#b-empty');
    if (!st.folders.length) empty.innerHTML = `${svg('folder')}<div>Add a folder of images to upscale. You can add as many folders as you like.</div><button class="btn primary" id="b-empty-add">${svg('plus')}Add folder</button>`;
    else if (!st.items.length) empty.innerHTML = `${svg('image')}<div>No images in ${st.folders.length === 1 ? 'this folder' : 'these folders'}${st.recursive ? ' or their subfolders' : ''}.<br><span class="faint">PNG, JPG, WebP and BMP files are listed.${st.recursive ? '' : ' Tick Include subfolders to look deeper.'}</span></div>`;
    else if (!rows.length) empty.innerHTML = `${svg('check')}<div>${st.filter === 'done' ? 'Nothing here is done yet.' : 'Everything here is done.'}</div>`;
    else empty.innerHTML = '';
    $('#b-empty-add')?.addEventListener('click', addFolder);
  }
  function renderSummary() {
    const t = st.ticked.size;
    const shown = st.rows ? st.rows.length : 0;
    $('#b-sum').innerHTML = st.items.length ? `<b>${shown}${shown !== st.items.length ? ` of ${st.items.length}` : ''} image${st.items.length === 1 ? '' : 's'}</b>${t ? ` · ${t} ticked` : ''}${st.dir ? ` · in ${esc(trimSep(st.dir).split(SEP_RE).pop())}` : ''}` : '';
  }
  function renderRunButton() {
    const t = [...st.ticked].filter((p) => st.byPath.has(p)).length;
    const shown = st.rows ? st.rows.length : 0;
    const n = t || shown;
    const what = t ? `${t} ticked` : `${shown} shown`;
    $('#b-run-t').textContent = jobsActive() ? `Add ${what} to the queue` : t ? `Upscale ${t} image${t === 1 ? '' : 's'}` : shown === st.items.length ? 'Upscale all' : `Upscale ${shown} shown`;
    $('#b-run').disabled = !engineReady() || !n;
    $('#b-run').title = !engineReady() ? 'Install the engine first' : t ? '' : 'Nothing is ticked, so every image shown is upscaled';
    $('#b-stop').hidden = !jobsActive();
  }
  function applySize() {
    $('#b-list').style.setProperty('--thumb', st.listSize + 'px');
    $('#b-grid').style.setProperty('--card', st.gridSize + 'px');
    const r = $('#b-size');
    const g = st.view === 'grid';
    r.min = g ? 110 : 18; r.max = g ? 480 : 160; r.step = g ? 10 : 2;
    r.value = g ? st.gridSize : st.listSize;
  }
  function setSize(v) {
    if (st.view === 'grid') { st.gridSize = Math.max(110, Math.min(480, v)); store.set('w2x-gridsize', st.gridSize); }
    else { st.listSize = Math.max(18, Math.min(160, v)); store.set('w2x-listsize', st.listSize); }
    applySize();
  }
  $('#b-size').addEventListener('input', (e) => setSize(+e.target.value));
  for (const id of ['#b-list', '#b-grid']) {
    $(id).addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setSize((st.view === 'grid' ? st.gridSize : st.listSize) + (e.deltaY < 0 ? 1 : -1) * (st.view === 'grid' ? 20 : 6));
    }, { passive: false });
  }

  function outText(it, d) { return d.factor === 1 ? 'same size' : it.w ? '→ ' + fmtDim(it.w * d.factor, it.h * d.factor) : '–'; }
  function renderList(rows) {
    $('#b-rows').innerHTML = rows.map((it) => {
      const d = der(it);
      const on = st.ticked.has(it.path);
      const cls = [on ? 'ticked' : '', st.focus === it.path ? 'focus' : '', d.status === 'running' ? 'current' : ''].join(' ');
      return `<tr class="${cls}" data-p="${esc(it.path)}"><td><input type="checkbox"${on ? ' checked' : ''} aria-label="Tick ${esc(it.name)}"></td>
        <td title="${esc(it.path)}"><span class="fcell"><img class="thumb" loading="lazy" decoding="async" src="${esc(it.url)}" alt="" draggable="false"><span class="fname">${esc(it.name)}</span>${it.missing ? '<span class="tag warn">original deleted</span>' : ''}</span></td>
        <td class="muted">${fmtDim(it.w, it.h)}</td><td class="muted">${outText(it, d)}</td>
        <td class="${d.over ? 'own' : 'muted'}" title="${d.over ? 'This image has its own settings' : 'Default settings'}">${esc(settingsText(d.eff))}</td>
        <td class="muted">${it.versions || '–'}</td><td class="c-st">${statusHtml(d.status)}</td></tr>`;
    }).join('');
    updateHeadChk();
  }
  function renderGrid(rows) {
    $('#b-grid').innerHTML = rows.map((it) => {
      const d = der(it);
      const on = st.ticked.has(it.path);
      const cls = ['gcard', on ? 'ticked' : '', st.focus === it.path ? 'focus' : '', d.status === 'running' ? 'current' : ''].join(' ');
      const v = it.versions || 0;
      return `<div class="${cls}" data-p="${esc(it.path)}" title="${esc(it.path)}">
        <div class="gthumb"><img loading="lazy" decoding="async" src="${esc(it.url)}" alt="" draggable="false"></div>
        <label class="gchk"><input type="checkbox"${on ? ' checked' : ''} aria-label="Tick ${esc(it.name)}"></label>
        <div class="gmeta"><b>${esc(it.name)}</b>
          <span>${fmtDim(it.w, it.h)} ${d.factor === 1 ? '' : outText(it, d)}</span>
          <span class="${d.over ? 'own' : ''}">${esc(settingsText(d.eff))}</span>
          <span class="gl">${statusHtml(d.status)}<span class="faint">${it.missing ? 'original deleted' : v ? `${v} version${v === 1 ? '' : 's'}` : 'no versions'}</span></span></div></div>`;
    }).join('');
  }
  function updateHeadChk() {
    const rows = st.rows || [];
    const head = $('#b-headchk');
    const n = rows.filter((it) => st.ticked.has(it.path)).length;
    head.checked = rows.length > 0 && n === rows.length;
    head.indeterminate = n > 0 && n < rows.length;
  }
  // Updates ticks and the selected image without rebuilding the list (fast with thousands of rows).
  function refreshMarks() {
    const sel = st.view === 'grid' ? '#b-grid .gcard' : '#b-rows tr';
    $$(sel).forEach((el) => {
      const p = el.dataset.p;
      const on = st.ticked.has(p);
      el.classList.toggle('ticked', on);
      el.classList.toggle('focus', st.focus === p);
      const cb = $('input[type=checkbox]', el);
      if (cb) cb.checked = on;
    });
    updateHeadChk();
    renderSummary();
    renderSelbar();
    renderRunButton();
  }
  // Refreshes statuses (during a run) without rebuilding.
  function updateStatuses() {
    computeDerived();
    if (st.view === 'list') {
      $$('#b-rows tr').forEach((tr) => {
        const it = itemByPath(tr.dataset.p);
        if (!it) return;
        const d = der(it);
        $('.c-st', tr).innerHTML = statusHtml(d.status);
        tr.classList.toggle('current', d.status === 'running');
      });
    } else if (st.view === 'grid') {
      $$('#b-grid .gcard').forEach((c) => {
        const it = itemByPath(c.dataset.p);
        if (!it) return;
        const d = der(it);
        const s = $('.gl .st', c);
        if (s) s.outerHTML = statusHtml(d.status);
        c.classList.toggle('current', d.status === 'running');
      });
    } else if (st.focus) renderGside(itemByPath(st.focus));
  }

  /* ---------- ticking and selecting ---------- */
  function toggleTick(p) { st.ticked.has(p) ? st.ticked.delete(p) : st.ticked.add(p); }
  function tickRange(a, b) {
    const order = (st.rows || []).map((it) => it.path);
    const i = order.indexOf(a);
    const j = order.indexOf(b);
    if (i < 0 || j < 0) { toggleTick(b); return; }
    const on = st.ticked.has(a);
    for (const q of order.slice(Math.min(i, j), Math.max(i, j) + 1)) on ? st.ticked.add(q) : st.ticked.delete(q);
  }
  // Default: a click selects the image; Ctrl+click or the tick box ticks it; Shift with either ticks
  // the range from the last ticked image. With "Clicking ticks", every click ticks.
  function itemClick(e, p) {
    const onBox = !!e.target.closest('input[type=checkbox], .gchk');
    if (onBox) e.preventDefault();
    const ticking = onBox || e.ctrlKey || e.metaKey || st.opts.clickTicks;
    if (ticking) {
      if (e.shiftKey && st.anchor && st.anchor !== p && st.byPath.has(st.anchor)) tickRange(st.anchor, p);
      else { toggleTick(p); st.anchor = p; }
      window.getSelection()?.removeAllRanges();
    }
    st.focus = p;
    // a prevented checkbox click restores its old state after this handler, so update afterwards
    onBox ? setTimeout(refreshMarks, 0) : refreshMarks();
  }
  $('#b-rows').addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (tr) itemClick(e, tr.dataset.p); });
  $('#b-grid').addEventListener('click', (e) => { const c = e.target.closest('.gcard'); if (c) itemClick(e, c.dataset.p); });
  $('#b-rows').addEventListener('dblclick', (e) => { const tr = e.target.closest('tr'); if (tr && !e.target.closest('input')) openGallery(tr.dataset.p); });
  $('#b-grid').addEventListener('dblclick', (e) => { const c = e.target.closest('.gcard'); if (c && !e.target.closest('.gchk')) openGallery(c.dataset.p); });
  $('#b-rows').addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); });
  $('#b-headchk').onchange = (e) => {
    (st.rows || []).forEach((it) => (e.target.checked ? st.ticked.add(it.path) : st.ticked.delete(it.path)));
    refreshMarks();
  };
  function tickAllShown() { (st.rows || []).forEach((it) => st.ticked.add(it.path)); refreshMarks(); }
  function untickAll() { st.ticked.clear(); refreshMarks(); }

  $('#b-filter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { st.filter = b.dataset.f; renderBatch(); } });
  $('#b-views').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  function setView(v) {
    st.view = v;
    store.set('w2x-view', v);
    hidePreview();
    renderBatch();
    if (v === 'gallery') setTimeout(() => $('#g-stage').focus({ preventScroll: true }), 0);
    else if (st.focus) setTimeout(() => $(`${v === 'grid' ? '#b-grid .gcard' : '#b-rows tr'}.focus`)?.scrollIntoView({ block: 'nearest' }), 0);
  }
  function setSort(key, dir) {
    st.sort = { key, dir };
    store.set('w2x-sort', st.sort);
    renderBatch();
    renderCompareList();
  }
  $('#b-sort').onchange = (e) => setSort(e.target.value, 1);
  $('#b-sortdir').onclick = () => setSort(st.sort.key, -st.sort.dir);
  $('#b-list thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (th) setSort(th.dataset.sort, st.sort.key === th.dataset.sort ? -st.sort.dir : 1);
  });

  /* ---------- own settings per image ---------- */
  function selTargets() {
    const t = [...st.ticked].filter((p) => st.byPath.has(p));
    if (t.length) return t;
    return st.focus && st.byPath.has(st.focus) ? [st.focus] : [];
  }
  function overrideControls(paths) {
    const effs = paths.map(effFor);
    const common = (k) => (effs.every((e) => String(e[k]) === String(effs[0][k])) ? effs[0][k] : null);
    const sel = (k, title) => {
      const v = common(k);
      return `<span class="sel"${title ? ` title="${esc(title)}"` : ''}><select data-ov="${k}">${v === null ? '<option value="" selected disabled>Mixed</option>' : ''}${OPTS[k].map(([val, l]) => `<option value="${val}"${v !== null && String(val) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select>${svg('chev')}</span>`;
    };
    const tta = common('tta');
    return `<span class="inl">Style</span>${sel('style')}<span class="inl">Noise</span>${sel('noise', 'Noise reduction. Use it only if the image has JPEG noise.')}<span class="inl">Upscale</span>${sel('scale')}<span class="inl">Tile</span>${sel('tileSize', 'Tile size. Lower it if the GPU runs out of memory.')}<label class="cb" title="Test-time augmentation: a little better, about 8 times slower"><input type="checkbox" data-ov="tta"${tta ? ' checked' : ''}${tta === null ? ' data-mixed="1"' : ''}>TTA</label>`;
  }
  function renderSelbar() {
    const bar = $('#b-selbar');
    const t = selTargets();
    if (!t.length || st.view === 'gallery') { bar.hidden = true; return; }
    bar.hidden = false;
    const ticked = st.ticked.size > 0;
    const anyOver = t.some(hasOver);
    const who = ticked ? `<b>${t.length} ticked</b>` : `<b title="${esc(t[0])}">${esc(itemByPath(t[0]).name)}</b>`;
    bar.innerHTML = `${who}<span class="faint">· settings for ${ticked ? (t.length === 1 ? 'it' : 'all of them') : 'this image'}</span>${overrideControls(t)}
      <button class="btn ghost" data-ovreset${anyOver ? '' : ' disabled'} title="Follow the default settings again">Use defaults</button>
      <span class="grow-r"></span>${ticked ? '<button class="btn ghost" data-untick>Untick all</button>' : '<button class="btn ghost" data-tickall>Tick all shown</button>'}`;
    $$('input[data-mixed]', bar).forEach((c) => (c.indeterminate = true));
  }
  function applyOverride(paths, key, value) {
    const d = batchRead();
    let bad = null;
    for (const p of paths) {
      const o = { ...(st.over[p] || {}), [key]: value };
      for (const k of Object.keys(o)) if (String(o[k]) === String(d[k])) delete o[k];
      try {
        const e = P.normalize({ ...d, ...o });
        P.chooseMethod(P.NOISE_LEVEL[e.noise], P.SCALE_FACTOR[e.scale]);
      } catch (err) { bad = err.message; }
      if (Object.keys(o).length) st.over[p] = o;
      else delete st.over[p];
    }
    if (bad) toast(bad, 'err');
    saveOver();
    renderBatch();
  }
  function resetOverrides(paths) {
    for (const p of paths) delete st.over[p];
    saveOver();
    renderBatch();
  }
  const ovValue = (el) => (el.type === 'checkbox' ? el.checked : el.dataset.ov === 'tileSize' ? Number(el.value) : el.value);
  $('#b-selbar').addEventListener('change', (e) => { const el = e.target.closest('[data-ov]'); if (el) applyOverride(selTargets(), el.dataset.ov, ovValue(el)); });
  $('#b-selbar').addEventListener('click', (e) => {
    if (e.target.closest('[data-ovreset]')) resetOverrides(selTargets());
    else if (e.target.closest('[data-untick]')) untickAll();
    else if (e.target.closest('[data-tickall]')) tickAllShown();
  });

  /* ---------- view options ---------- */
  const PREVIEW_SIZES = [[220, 'Small'], [340, 'Medium'], [480, 'Large']];
  function renderPop() {
    $('#b-pop').innerHTML = `<div class="ph">When you click an image</div>
      <label class="rd"><input type="radio" name="o-click" value="select"${!st.opts.clickTicks ? ' checked' : ''}><span><b>Select it</b><small>Ctrl+click or its tick box ticks it for upscaling. Hold Shift as well to tick everything in between.</small></span></label>
      <label class="rd"><input type="radio" name="o-click" value="tick"${st.opts.clickTicks ? ' checked' : ''}><span><b>Tick or untick it</b><small>Shift+click ticks everything in between.</small></span></label>
      <div class="ph">List view</div>
      <label class="cb"><input type="checkbox" id="o-hover"${st.opts.hoverPreview ? ' checked' : ''}>Show a larger preview when hovering a thumbnail or file name</label>
      <div class="trow"><span class="inl">Preview size</span><div class="seg" id="o-psize">${PREVIEW_SIZES.map(([v, l]) => `<button data-ps="${v}" class="${st.opts.previewSize === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  }
  const saveOpts = () => store.set('w2x-batch-opts', st.opts);
  $('#b-opts').onclick = (e) => {
    e.stopPropagation();
    const pop = $('#b-pop');
    if (!pop.hidden) { pop.hidden = true; return; }
    renderPop();
    pop.hidden = false;
  };
  $('#b-pop').addEventListener('click', (e) => {
    e.stopPropagation();
    const ps = e.target.closest('[data-ps]');
    if (ps) { st.opts.previewSize = +ps.dataset.ps; saveOpts(); renderPop(); }
  });
  $('#b-pop').addEventListener('change', (e) => {
    if (e.target.name === 'o-click') st.opts.clickTicks = e.target.value === 'tick';
    if (e.target.id === 'o-hover') st.opts.hoverPreview = e.target.checked;
    saveOpts();
  });
  document.addEventListener('click', () => { $('#b-pop').hidden = true; });

  /* ---------- hover preview (list view) ---------- */
  const hp = $('#hoverprev');
  function placePreview(e) {
    const sz = st.opts.previewSize;
    let x = e.clientX + 18;
    let y = e.clientY - sz / 2;
    if (x + sz + 12 > innerWidth) x = e.clientX - sz - 18;
    y = Math.max(8, Math.min(innerHeight - sz - 8, y));
    hp.style.left = x + 'px';
    hp.style.top = y + 'px';
  }
  function hidePreview() { hp.hidden = true; }
  $('#b-rows').addEventListener('mouseover', (e) => {
    if (!st.opts.hoverPreview) return;
    const t = e.target.closest('.thumb, .fname');
    if (!t) return;
    const it = itemByPath(t.closest('tr').dataset.p);
    if (!it) return;
    hp.style.setProperty('--ps', st.opts.previewSize + 'px');
    const img = $('img', hp);
    if (img.getAttribute('src') !== it.url) img.src = it.url;
    hp.hidden = false;
    placePreview(e);
  });
  $('#b-rows').addEventListener('mousemove', (e) => { if (!hp.hidden) placePreview(e); });
  $('#b-rows').addEventListener('mouseout', (e) => { if (e.target.closest('.thumb, .fname') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.thumb, .fname'))) hidePreview(); });
  $('#b-list').addEventListener('scroll', hidePreview);

  /* ---------- gallery ---------- */
  const G = { view: { s: 1, x: 0, y: 0 }, dims: { w: 1, h: 1 }, path: null, drag: null };
  function openGallery(p) { st.focus = p; setView('gallery'); }
  function galleryItem() {
    const rows = st.rows || [];
    if (!rows.length) return null;
    let it = st.focus && itemByPath(st.focus);
    if (!it || !rows.includes(it)) it = rows[0];
    st.focus = it.path;
    return it;
  }
  function renderGallery() {
    const it = galleryItem();
    const img = $('#g-img');
    if (!it) { img.removeAttribute('src'); G.path = null; $('#g-side').innerHTML = ''; return; }
    if (G.path !== it.path) {
      G.path = it.path;
      img.style.visibility = 'hidden';
      img.onload = () => { G.dims = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 }; img.style.visibility = ''; gFit(); };
      img.src = it.url;
    }
    renderGside(it);
  }
  function renderGside(it) {
    if (!it) return;
    const d = der(it);
    const rows = st.rows || [];
    const i = rows.indexOf(it);
    const on = st.ticked.has(it.path);
    $('#g-side').innerHTML = `
      <div class="gs-head"><b title="${esc(it.path)}">${esc(it.name)}</b><span class="faint">${i + 1} of ${rows.length}</span></div>
      <label class="cb gs-tick"><input type="checkbox" id="g-tick"${on ? ' checked' : ''}>Ticked for upscaling<span class="kbd">X</span></label>
      <div class="kv gs-kv">
        <span>Folder</span><code title="${esc(it.dir)}">${esc(it.dir)}</code>
        <span>Size</span><code>${fmtDim(it.w, it.h)}${it.missing ? ' (original deleted)' : ''}</code>
        <span>File size</span><code>${it.bytes ? PR.fmtBytes(it.bytes) : '–'}</code>
        <span>Modified</span><code>${it.mtime ? new Date(it.mtime).toLocaleString() : '–'}</code>
        <span>Output</span><code>${d.factor === 1 ? 'same size' : fmtDim(it.w * d.factor, it.h * d.factor)}</code>
        <span>Versions</span><code>${it.versions || 'none yet'}</code>
        <span>Status</span><span>${statusHtml(d.status)}</span>
      </div>
      <div class="gs-sec"><div class="subhead">Settings for this image ${d.over ? '<span class="tag acc">Own settings</span>' : '<span class="faint">· the defaults</span>'}</div>
        <div class="gs-set">${overrideControls([it.path])}</div>
        <div class="trow"><button class="btn ghost" data-ovreset${d.over ? '' : ' disabled'}>Use defaults</button></div></div>
      <div class="gs-sec"><button class="btn primary wide" id="g-run"${it.missing || !engineReady() ? ' disabled' : ''}>${svg('upscale')}${jobsActive() ? 'Add to the queue' : 'Upscale this image'}</button>
        <div class="trow two"><button class="btn" id="g-compare"${it.versions ? '' : ' disabled title="No versions yet"'}>${svg('compare')}Compare</button><button class="btn" id="g-show">${svg('folderopen')}Show in folder</button></div></div>
      <div class="gs-sec"><div class="subhead">View</div>
        <div class="trow"><button class="btn icon" id="g-zout" title="Zoom out (↓)" aria-label="Zoom out">${svg('zout')}</button><span class="zoomlab" id="g-zlab"></span><button class="btn icon" id="g-zin" title="Zoom in (↑)" aria-label="Zoom in">${svg('zin')}</button><button class="btn" id="g-fit" title="Fit (0)">Fit</button><button class="btn" id="g-z1" title="Actual pixels (1)">1:1</button><span class="grow-r"></span><button class="btn icon" id="g-full" title="Full screen (F)" aria-label="Full screen">${svg(document.body.classList.contains('gfull') ? 'shrink' : 'expand')}</button></div>
        <div class="trow two"><button class="btn" id="g-prev"${i <= 0 ? ' disabled' : ''}>${svg('chevl')}Previous</button><button class="btn" id="g-next"${i >= rows.length - 1 ? ' disabled' : ''}>Next${svg('chevr')}</button></div></div>
      <div class="gs-keys"><span><span class="kbd">←</span><span class="kbd">→</span> or <span class="kbd">PgUp</span><span class="kbd">PgDn</span></span><span>previous / next</span>
        <span><span class="kbd">Home</span><span class="kbd">End</span></span><span>first / last</span>
        <span><span class="kbd">↑</span><span class="kbd">↓</span> or wheel</span><span>zoom</span>
        <span><span class="kbd">X</span></span><span>tick for upscaling</span><span><span class="kbd">F</span></span><span>full screen</span></div>`;
    $$('#g-side input[data-mixed]').forEach((c) => (c.indeterminate = true));
    gLabel();
  }
  function gApply() {
    const { s, x, y } = G.view;
    const w = $('#g-world');
    w.style.width = G.dims.w + 'px';
    w.style.height = G.dims.h + 'px';
    w.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    w.classList.toggle('pixel', s >= 2);
    gLabel();
  }
  function gLabel() { const l = $('#g-zlab'); if (l) l.textContent = Math.round(G.view.s * 100) + '%'; }
  function gFit() {
    const b = $('#g-stage');
    const W = b.clientWidth;
    const H = b.clientHeight;
    if (!W || !H) return;
    const s = Math.min(W / G.dims.w, H / G.dims.h) * 0.98;
    G.view = { s, x: (W - G.dims.w * s) / 2, y: (H - G.dims.h * s) / 2 };
    gApply();
  }
  // Zoom keeps the middle of the window still, as asked (not the mouse position).
  function gZoom(f, abs) {
    const b = $('#g-stage');
    const cx = b.clientWidth / 2;
    const cy = b.clientHeight / 2;
    const v = G.view;
    const ns = Math.min(40, Math.max(0.02, abs ? f : v.s * f));
    const wx = (cx - v.x) / v.s;
    const wy = (cy - v.y) / v.s;
    G.view = { s: ns, x: cx - wx * ns, y: cy - wy * ns };
    gApply();
  }
  function gGo(i) {
    const rows = st.rows || [];
    if (!rows.length) return;
    const it = rows[Math.max(0, Math.min(rows.length - 1, i))];
    if (it.path === st.focus) return;
    st.focus = it.path;
    renderGallery();
  }
  const gIndex = () => (st.rows || []).findIndex((it) => it.path === st.focus);
  const gStep = (d) => gGo(gIndex() + d);
  function gTick() {
    if (!st.focus) return;
    toggleTick(st.focus);
    st.anchor = st.focus;
    renderGside(itemByPath(st.focus));
    renderSummary();
    renderRunButton();
  }
  function setGalleryFull(on) {
    document.body.classList.toggle('gfull', on);
    setFull(on);
    renderGside(itemByPath(st.focus));
    requestAnimationFrame(gFit);
  }
  const gStage = $('#g-stage');
  gStage.addEventListener('wheel', (e) => { e.preventDefault(); gZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  gStage.addEventListener('mousedown', (e) => {
    gStage.focus({ preventScroll: true });
    G.drag = { x: e.clientX, y: e.clientY };
    gStage.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!G.drag) return;
    G.view.x += e.clientX - G.drag.x;
    G.view.y += e.clientY - G.drag.y;
    G.drag = { x: e.clientX, y: e.clientY };
    gApply();
  });
  window.addEventListener('mouseup', () => { if (G.drag) { G.drag = null; gStage.classList.remove('dragging'); } });
  gStage.addEventListener('dblclick', () => gFit());
  new ResizeObserver(() => { if (ui.screen === 'batch' && st.view === 'gallery') gFit(); }).observe(gStage);
  $('#g-side').addEventListener('change', (e) => {
    if (e.target.id === 'g-tick') { gTick(); return; }
    const el = e.target.closest('[data-ov]');
    if (el && st.focus) { applyOverride([st.focus], el.dataset.ov, ovValue(el)); setTimeout(() => gStage.focus({ preventScroll: true }), 0); }
  });
  $('#g-side').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const it = itemByPath(st.focus);
    if (b.matches('[data-ovreset]')) resetOverrides([st.focus]);
    else if (b.id === 'g-run' && it) queueImages([it.path]);
    else if (b.id === 'g-compare' && it) { go('compare'); openImage(it.path); }
    else if (b.id === 'g-show' && it) (it.missing ? api.openPath(it.dir) : api.showInFolder(it.path));
    else if (b.id === 'g-zin') gZoom(1.25);
    else if (b.id === 'g-zout') gZoom(1 / 1.25);
    else if (b.id === 'g-fit') gFit();
    else if (b.id === 'g-z1') gZoom(1, true);
    else if (b.id === 'g-prev') gStep(-1);
    else if (b.id === 'g-next') gStep(1);
    else if (b.id === 'g-full') setGalleryFull(!document.body.classList.contains('gfull'));
    if (b.id !== 'g-run') gStage.focus({ preventScroll: true });
  });

  /* ---------- running: every run goes through the queue ---------- */
  $('#b-run').onclick = async () => {
    let paths = [...st.ticked].filter((p) => st.byPath.has(p));
    if (!paths.length) {
      const shown = (st.rows || []).map((it) => it.path);
      if (!shown.length) return;
      const all = shown.length === st.items.length;
      const r = await dialog({ title: `Upscale ${all ? 'all ' : ''}${shown.length} image${shown.length === 1 ? '' : 's'}?`, body: `Nothing is ticked, so every image ${all ? '' : 'shown '}is upscaled. Images already done with their settings are skipped.`, ok: `Upscale ${shown.length}` });
      if (!r.ok) return;
      paths = shown;
    }
    queueImages(paths);
  };
  const stopAll = () => api.cancelAllJobs();
  $('#b-stop').onclick = stopAll;
  $('#s-stop').onclick = stopAll;
  $('#s-review').onclick = () => { go('compare'); if (ui.lastMade && ui.lastMade[0]) openImage(ui.lastMade[0]); };

  // Queues images. Images with different settings become separate jobs, run one after another.
  async function queueImages(paths, settingsFor = effFor) {
    if (!engineReady()) { go('engine'); toast('Install the engine first.', 'info'); return; }
    paths = paths.filter((p) => { const it = itemByPath(p); return !it || !it.missing; });
    if (!paths.length) { toast("The original of that image was deleted, so it can't be upscaled again.", 'err'); return; }
    const groups = new Map();
    for (const p of paths) {
      const s = settingsFor(p);
      const tag = P.tagFor(s) + '|' + s.tileSize;
      if (!groups.has(tag)) groups.set(tag, { settings: s, items: [] });
      groups.get(tag).items.push(p);
    }
    const wasBusy = jobsActive();
    let added = 0;
    for (const g of groups.values()) {
      try {
        P.chooseMethod(P.NOISE_LEVEL[g.settings.noise], P.SCALE_FACTOR[g.settings.scale]);
      } catch (e) { toast(`${g.items.length} image${g.items.length === 1 ? '' : 's'} skipped: ${e.message}`, 'err'); continue; }
      try {
        if (!jobsActive()) st.session = { total: 0, finished: 0, made: 0, skipped: 0, failed: 0, cancelled: false, madeList: [] };
        const label = settingsText(g.settings);
        const r = await api.startJob(g.items, g.settings, label);
        const j = { id: r.jobId, items: new Set(g.items), list: g.items, settings: g.settings, label, state: 'queued', done: new Set(), failed: new Set(), current: null, total: g.items.length, processed: 0 };
        st.jobs.set(r.jobId, j);
        st.session.total += j.total;
        for (const p of g.items) st.failedRecent.delete(p);
        added += j.total;
        log(`Queued ${j.total} image${j.total === 1 ? '' : 's'} · ${label}`);
        for (const ev of pendingEv.get(r.jobId) || []) handleJobEvent(j, ev);
        pendingEv.delete(r.jobId);
      } catch (e) { toast(e.message, 'err'); }
    }
    if (!added) return;
    if (wasBusy) toast(`Added ${added} image${added === 1 ? '' : 's'} to the queue. They start when the current images finish.`, 'ok');
    updateJobTask();
    computeDerived();
    renderBatch();
    renderCompareButtons();
  }

  // One progress bar for everything queued: images done of images queued, across all jobs.
  function updateJobTask() {
    const js = [...st.jobs.values()];
    if (!js.length || !st.session) return;
    const done = st.session.finished + js.reduce((a, j) => a + j.processed, 0);
    const total = st.session.total;
    const run = js.find((j) => j.state === 'running');
    const waiting = js.filter((j) => j.state === 'queued').reduce((a, j) => a + j.total, 0);
    const cur = run && run.current ? baseName(run.current) : '';
    const name = [cur, run ? run.label : 'Starting…', waiting ? `${waiting} more queued` : ''].filter(Boolean).join(' · ');
    setTask('job', { key: 'jobs', label: `Upscaling ${Math.min(total, done + 1)} of ${total}`, name, done, total, unit: 'images' });
  }

  const pendingEv = new Map();
  api.onJob((ev) => {
    const j = st.jobs.get(ev.jobId);
    if (!j) {
      if (!pendingEv.has(ev.jobId)) pendingEv.set(ev.jobId, []);
      pendingEv.get(ev.jobId).push(ev);
      return;
    }
    handleJobEvent(j, ev);
  });
  api.onQueue((q) => { st.queueInfo = q; });

  function handleJobEvent(j, ev) {
    if (ev.started) {
      j.state = 'running';
      j.device = ev.device;
      log(`Started ${j.total} image${j.total === 1 ? '' : 's'} · ${j.label} · on ${ev.device}`);
      if (ev.cpuFallback && !ui.cpuWarned) {
        ui.cpuWarned = true;
        toast("Upscaling on the CPU (slow) because PyTorch can't use the NVIDIA GPU. Engine > Diagnose GPU finds out why.", 'err', 10000);
      }
      startGpuPoll();
    }
    if (ev.doneFiles) j.done = new Set(ev.doneFiles);
    if (ev.failedFiles) j.failed = new Set(ev.failedFiles);
    if ('current' in ev) j.current = ev.current;
    if (typeof ev.processed === 'number') j.processed = ev.processed;
    if (ev.message && !ev.started && !ev.removed) log(ev.message, ev.error ? 'e' : ev.finished ? 'o' : '');
    if (ev.error) {
      setLog(true);
      if (ev.gpuProblem) toast(ev.message.split('\n')[0], 'err', 10000);
    }
    if (ev.finished) { finishJob(j, ev); return; }
    updateJobTask();
    updateStatuses();
  }

  async function finishJob(j, ev) {
    st.jobs.delete(j.id);
    const s = st.session;
    for (const f of j.failed) st.failedRecent.add(f);
    if (ev.removed) s.total -= j.total;
    else {
      s.total -= j.total - (ev.processed || 0);
      s.finished += ev.processed || 0;
    }
    s.made += ev.made || 0;
    s.skipped += ev.skipped || 0;
    s.failed += ev.failed || 0;
    if (ev.cancelled) s.cancelled = true;
    s.madeList.push(...[...j.done].filter((p) => !j.failed.has(p)));
    await refreshItems(j.list);
    if (!jobsActive()) {
      stopGpuPoll();
      const msg = s.cancelled ? `Stopped. ${s.made} made, ${s.skipped} skipped, ${s.failed} failed.` : `Finished: ${s.made} made, ${s.skipped} skipped, ${s.failed} failed.`;
      ui.lastMade = s.madeList;
      ui.lastSummary = msg;
      setTask('job', { key: 'jobs', label: 'Upscaling', done: s.finished, total: Math.max(1, s.total), unit: 'images', state: s.failed && !s.made ? 'error' : 'done', message: msg });
      if (s.failed) toast(`${s.failed} image${s.failed === 1 ? '' : 's'} failed. The log has details.`, 'err', 7000);
    } else updateJobTask();
    renderBatch();
    renderCompareList();
    if (V.cur && j.items.has(V.cur) && st.byPath.has(V.cur)) openImage(V.cur, { keepView: true, newest: true });
  }

  /* ---------- live GPU load in the status bar while upscaling ---------- */
  let gpuTimer = null;
  const shortGpu = (n) => String(n || 'GPU').replace(/^NVIDIA\s+/i, '').replace(/^GeForce\s+/i, '');
  function startGpuPoll() {
    if (gpuTimer) return;
    const chip = $('#s-gpu');
    const tick = async () => {
      if (!jobsActive()) { stopGpuPoll(); return; }
      const run = [...st.jobs.values()].find((j) => j.state === 'running');
      if (run && run.device === 'CPU') {
        chip.hidden = false;
        chip.className = 'gpuchip warn';
        chip.textContent = 'On the CPU (slow)';
        chip.title = "PyTorch can't use the NVIDIA GPU. Engine > Diagnose GPU finds out why.";
        return;
      }
      try {
        const u = await api.gpuUsage();
        if (!u) return;
        chip.hidden = false;
        chip.className = 'gpuchip';
        chip.innerHTML = `<i style="--u:${u.util || 0}%"></i>${esc(shortGpu(u.name))} · ${u.util}% · ${(u.memUsed / 1024).toFixed(1)} / ${(u.memTotal / 1024).toFixed(1)} GB`;
        chip.title = `${u.name}: GPU load ${u.util}%, video memory ${u.memUsed} of ${u.memTotal} MB${u.temp != null ? `, ${u.temp}°C` : ''}. Updated every 2 seconds.`;
      } catch (_) { /* no nvidia-smi */ }
    };
    tick();
    gpuTimer = setInterval(tick, 2000);
  }
  function stopGpuPoll() { clearInterval(gpuTimer); gpuTimer = null; $('#s-gpu').hidden = true; }

  function renderGpuBanner() {
    const g = (eng.appInfo || {}).gpu || {};
    const el = $('#b-gpu');
    const show = engineReady() && g.available === false && ui.gpuSetting !== 'cpu';
    el.hidden = !show;
    if (show && !el.dataset.filled) {
      el.innerHTML = `${svg('alert')}<div class="t"><b>Upscaling runs on the CPU, which is much slower.</b> <span>PyTorch can't use the NVIDIA GPU. The diagnosis finds out why and how to fix it.</span></div><button class="btn" data-diag>${svg('search')}Diagnose GPU</button>`;
      el.dataset.filled = '1';
      $('[data-diag]', el).onclick = () => { go('engine'); runDiagnose(); };
    }
  }

  /* =====================================================================================
     COMPARE
     ===================================================================================== */
  const rerunRead = buildSettings($('#c-settings'), 'w2x-rerun-settings', null, { tile: false, tileFrom: () => batchRead() });
  const V = { cur: null, variants: [], curId: 'orig', eyes: new Set(['orig']), mode: store.get('w2x-mode', 'split'), filter: 'all', view: { s: 1, x: 0, y: 0 }, base: { w: 1, h: 1 }, orig: { w: 1, h: 1 }, split: 0.5, holding: false, drag: null, rows: [] };
  if (!['hold', 'split', 'side', 'seq'].includes(V.mode)) V.mode = 'split';

  // Compare lists the images of the folder chosen on the Batch screen, in the same order.
  function renderCompareList() {
    const scope = scopeItems();
    const has = scope.filter((i) => i.versions).length;
    const n = st.folders.length;
    $('#c-folder-name').textContent = st.dir ? trimSep(st.dir).split(SEP_RE).pop() : n ? (n === 1 ? trimSep(st.folders[0]).split(SEP_RE).pop() : `${n} folders`) : 'No folders yet';
    $('#c-folder-path').textContent = st.dir || (n ? st.folders.join(' · ') : 'Add folders on the Batch screen');
    $('#c-filter').innerHTML = [['all', 'All', scope.length], ['has', 'Has versions', has]]
      .map(([k, l, c]) => `<button class="pill${V.filter === k ? ' on' : ''}" data-f="${k}">${l} ${c}</button>`).join('');
    const rows = scope.filter((i) => V.filter === 'all' || i.versions);
    V.rows = rows;
    $('#c-list').innerHTML = rows.map((it) => {
      const v = it.versions || 0;
      return `<div class="irow${it.path === V.cur ? ' on' : ''}" data-p="${esc(it.path)}" title="${esc(it.path)}"><img loading="lazy" decoding="async" src="${esc(it.url)}" alt="">
        <div class="t"><b>${esc(it.name)}</b><span>${fmtDim(it.w, it.h)}${v ? ` · ${v} version${v === 1 ? '' : 's'}` : ''}${it.missing ? ' · original deleted' : ''}</span></div></div>`;
    }).join('') || `<div class="faint" style="padding:12px">${st.folders.length ? 'No images match.' : 'Add a folder on the Batch screen to see its images.'}</div>`;
    renderCompareButtons();
  }
  $('#c-filter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { V.filter = b.dataset.f; renderCompareList(); } });
  $('#c-list').addEventListener('click', (e) => { const r = e.target.closest('.irow'); if (r) openImage(r.dataset.p); });
  $('#c-folder').onclick = () => go('batch');

  function renderCompareButtons() {
    const it = V.cur && itemByPath(V.cur);
    $('#c-rerun').disabled = !it || !engineReady() || !!it.missing;
    $('#c-rerun').title = !engineReady() ? 'Install the engine first' : !it ? 'Choose an image first' : it.missing ? "The original was deleted, so it can't be upscaled again" : jobsActive() ? 'Something is running: this joins the queue' : 'Adds a new version of this image; nothing is overwritten';
    $('#c-show').disabled = !it;
  }

  const versionTitle = (v) => `${optLabel('noise', v.settings.noise)} · ${optLabel('scale', v.settings.scale)}${v.settings.tta ? ' · TTA' : ''}`;
  function age(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!Number.isFinite(s)) return '';
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(iso).toLocaleDateString();
  }
  // The original (unless it was deleted) followed by every version, oldest first.
  function versionsAll() {
    const it = itemByPath(V.cur);
    if (!it) return [];
    return [...(it.missing ? [] : [{ id: 'orig', title: 'Original', meta: `${V.orig.w} × ${V.orig.h}`, url: it.url, orig: true, path: it.path }]),
      ...V.variants.map((v) => ({ id: v.id, title: versionTitle(v), meta: `${optLabel('style', v.settings.style)} · ${v.size ? `${v.size.w} × ${v.size.h}` : ''} · ${age(v.createdAt)}`, url: v.url, path: v.output, label: settingsText(v.settings) }))];
  }
  const curVersion = () => versionsAll().find((v) => v.id === V.curId) || versionsAll()[0];

  async function openImage(path, { keepView = false, newest = false } = {}) {
    const it = itemByPath(path);
    if (!it) return;
    const prev = V.cur;
    V.cur = path;
    try { V.variants = (await api.listVariants(path)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); } catch (_) { V.variants = []; }
    if (prev !== path || newest || (V.curId !== 'orig' && !V.variants.some((v) => v.id === V.curId)) || (it.missing && V.curId === 'orig')) {
      V.curId = V.variants.length ? V.variants[V.variants.length - 1].id : 'orig';
      V.eyes = new Set(['orig', V.curId]);
    }
    V.orig = it.missing ? { w: it.w || 1, h: it.h || 1 } : await getDims(it.url);
    const cv = curVersion();
    V.base = cv && !cv.orig ? await getDims(cv.url) : V.orig;
    $$('#c-list .irow').forEach((r) => r.classList.toggle('on', r.dataset.p === path));
    $('#c-list .irow.on')?.scrollIntoView({ block: 'nearest' });
    renderVersions();
    buildPanes();
    if (!keepView || prev !== path) fitView(); else applyView();
    renderCompareButtons();
  }

  function renderVersions() {
    const host = $('#c-vers');
    if (!V.cur) { host.innerHTML = '<span class="faint" style="padding:10px 6px">Versions of the chosen image appear here.</span>'; return; }
    const it = itemByPath(V.cur);
    host.innerHTML = (it && it.missing ? `<div class="ver gone">${svg('trash')}<div class="t"><b>Original deleted</b><span>Keep a version or delete the rest to finish this image</span></div></div>` : '')
      + versionsAll().map((v) => `<div class="ver${v.id === V.curId ? ' cur' : ''}" data-v="${v.id}" title="${esc(v.orig ? 'The original image' : 'Click to show this version')}">
        <img src="${esc(v.url)}" alt=""${v.orig ? ' style="image-rendering:pixelated"' : ''}><div class="t"><b>${esc(v.title)}</b><span>${esc(v.meta)}</span></div>
        <button class="vb${V.eyes.has(v.id) ? ' on' : ''}" data-eye="${v.id}" title="${V.eyes.has(v.id) ? 'Shown' : 'Not shown'} in Side by side" aria-label="Toggle in side by side">${svg(V.eyes.has(v.id) ? 'eye' : 'eyeoff')}</button>
        <div class="vacts">${v.orig ? '' : `<button class="va keep" data-keep="${v.id}" title="Best version: move it to “Upscaled Images” and the original to “Upscaled Images - Originals”. Other versions go to the Recycle Bin.">${svg('star')}Keep + original</button>
          <button class="va keep" data-keeponly="${v.id}" title="Best version: move it to “Upscaled Images”. The original and other versions go to the Recycle Bin.">${svg('star')}Keep only this</button>`}
          <button class="va del" data-del="${v.id}" title="Send ${v.orig ? 'the original' : 'this version'} to the Recycle Bin" aria-label="Delete">${svg('trash')}</button></div></div>`).join('')
      + `<button class="ver add" id="c-addver">${svg('again')}Upscale again…</button>`;
    $('#c-addver').onclick = () => { const s = $('#c-settings select'); s.focus(); toast('Choose the settings, then click Upscale again.', 'info', 3000); };
  }
  $('#c-vers').addEventListener('click', async (e) => {
    const eye = e.target.closest('[data-eye]');
    if (eye) {
      e.stopPropagation();
      const id = eye.dataset.eye;
      V.eyes.has(id) ? V.eyes.delete(id) : V.eyes.add(id);
      renderVersions();
      buildPanes(); applyView();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); deleteVersion(del.dataset.del); return; }
    const keep = e.target.closest('[data-keep], [data-keeponly]');
    if (keep) { e.stopPropagation(); keepVersion(keep.dataset.keep || keep.dataset.keeponly, !!keep.dataset.keep); return; }
    const card = e.target.closest('.ver[data-v]');
    if (card) showVersion(card.dataset.v);
  });

  // Switching version keeps the zoom: the on-screen size stays the same even when the new version
  // has a different pixel size (the original vs a 2x version).
  async function showVersion(id) {
    V.curId = id;
    V.eyes.add(id);
    const cv = curVersion();
    if (!cv) return;
    const nb = cv.orig ? V.orig : await getDims(cv.url);
    if (nb.w !== V.base.w && V.base.w > 1) {
      const k = V.base.w / nb.w;
      V.view = { ...V.view, s: V.view.s * k };
    }
    V.base = nb;
    renderVersions();
    buildPanes();
    applyView();
  }
  function stepVersion(d) {
    const all = versionsAll();
    const i = all.findIndex((v) => v.id === V.curId);
    const n = all[Math.max(0, Math.min(all.length - 1, i + d))];
    if (n && n.id !== V.curId) showVersion(n.id);
  }

  // ---- finishing a set: delete (Recycle Bin) or keep the best version ----
  const fileOf = (p) => baseName(p);
  async function afterSetChange(src, res) {
    const idx = V.rows.findIndex((it) => it.path === src);
    if (res.resolved) {
      removeItem(src);
      const next = V.rows.filter((it) => it.path !== src)[Math.max(0, idx)] || null;
      V.cur = null;
      renderBatch();
      renderCompareList();
      if (next) openImage(next.path);
      else { buildPanes(); renderVersions(); renderCompareButtons(); }
    } else {
      await refreshItems([src]);
      renderBatch();
      renderCompareList();
      if (st.byPath.has(src)) openImage(src, { keepView: true });
    }
  }
  async function deleteVersion(id) {
    const it = itemByPath(V.cur);
    if (!it) return;
    const v = versionsAll().find((x) => x.id === id);
    if (!v) return;
    const others = versionsAll().filter((x) => x.id !== id).length;
    const r = await dialog({
      title: v.orig ? 'Send the original to the Recycle Bin?' : 'Send this version to the Recycle Bin?',
      body: `<b>${esc(fileOf(v.path))}</b> goes to the Recycle Bin, so you can still restore it. ${others ? (v.orig ? 'Its versions stay.' : '') : 'It is the last file of this image, so the image leaves the list.'}`,
      ok: 'Send to Recycle Bin', danger: true,
    });
    if (!r.ok) return;
    try {
      const res = await api.deleteSetFile(V.cur, id);
      toast(`${fileOf(res.trashed)} is in the Recycle Bin.${res.resolved ? ' Nothing of this image is left, so it left the list.' : ''}`, 'ok');
      log(`Recycle Bin: ${res.trashed}`);
      await afterSetChange(V.cur, res);
    } catch (e) { toast(e.message, 'err', 7000); }
  }
  async function keepVersion(id, keepOriginal) {
    const it = itemByPath(V.cur);
    const v = versionsAll().find((x) => x.id === id);
    if (!it || !v) return;
    const otherVersions = V.variants.filter((x) => x.id !== id).length;
    const folder = esc(it.dir);
    const trashList = [!keepOriginal && !it.missing ? 'the original' : '', otherVersions ? `the other ${otherVersions} version${otherVersions === 1 ? '' : 's'}` : ''].filter(Boolean);
    const r = await dialog({
      title: keepOriginal ? 'Keep this version and the original?' : 'Keep only this version?',
      body: `<b>${esc(fileOf(v.path))}</b> moves to <b>Upscaled Images</b>${keepOriginal && !it.missing ? ', and the original moves to <b>Upscaled Images - Originals</b>' : ''} (inside ${folder}).
        ${trashList.length ? `${trashList.join(' and ').replace(/^./, (c) => c.toUpperCase())} go${trashList.length === 1 && !/versions/.test(trashList[0]) ? 'es' : ''} to the Recycle Bin.` : ''} The image then leaves the list and won't be added again.`,
      ok: keepOriginal ? 'Keep both' : 'Keep only this', danger: !keepOriginal && !it.missing,
    });
    if (!r.ok) return;
    try {
      const res = await api.keepBest(V.cur, id, keepOriginal);
      log(`Kept ${res.kept}${res.original ? `; original moved to ${res.original}` : ''}${res.trashed.length ? `; Recycle Bin: ${res.trashed.join(', ')}` : ''}`, 'o');
      toast(`Kept ${fileOf(res.kept)} in Upscaled Images${res.original ? ', original in Upscaled Images - Originals' : ''}${res.trashed.length ? `. ${res.trashed.length} file${res.trashed.length === 1 ? '' : 's'} in the Recycle Bin` : ''}.`, 'ok', 7000);
      await afterSetChange(V.cur, res);
    } catch (e) { toast(e.message, 'err', 7000); }
  }

  function setMode(m) {
    V.mode = m;
    store.set('w2x-mode', m);
    $$('#c-modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    buildPanes();
    fitView();
  }
  $('#c-modes').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });

  function buildPanes() {
    const host = $('#panes');
    const empty = $('#c-empty');
    if (!V.cur) {
      host.innerHTML = '';
      empty.innerHTML = st.items.length ? `${svg('compare')}<div>Choose an image on the left to compare its versions.</div>` : `${svg('folder')}<div>Add a folder first.</div><button class="btn primary" id="c-empty-browse">${svg('plus')}Add folder</button>`;
      $('#c-empty-browse')?.addEventListener('click', addFolder);
      return;
    }
    empty.innerHTML = '';
    const all = versionsAll();
    if (!all.length) { host.innerHTML = ''; empty.innerHTML = `${svg('image')}<div>Nothing left of this image.</div>`; return; }
    const orig = all[0].orig ? all[0] : null; // null when the original was deleted
    const cur = curVersion();
    let panes;
    if (V.mode === 'side') {
      const shown = all.filter((v) => V.eyes.has(v.id));
      panes = (shown.length ? shown : [orig || cur]).map((v) => ({ main: v, label: v.orig ? 'Original' : v.label }));
    } else if (V.mode === 'seq') {
      const i = all.findIndex((v) => v.id === cur.id);
      panes = [{ main: cur, label: `${i + 1} of ${all.length} · ${cur.orig ? 'Original' : cur.label}`, seq: true }];
    } else panes = [{ main: cur, label: cur.orig ? 'Original' : cur.label }];
    const cols = panes.length <= 3 ? panes.length : Math.ceil(Math.sqrt(panes.length));
    host.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    host.style.gridTemplateRows = `repeat(${Math.ceil(panes.length / cols)}, minmax(0, 1fr))`;
    host.innerHTML = panes.map((p) => {
      const showSeam = V.mode === 'split' && !p.main.orig && orig;
      return `<div class="pane"><div class="world">${orig ? `<img class="o" src="${esc(orig.url)}" alt="" draggable="false">` : ''}${p.main.orig ? '' : `<img class="u" src="${esc(p.main.url)}" alt="" draggable="false">`}</div>
        ${showSeam ? `<div class="seam" data-seam><div class="grip">${svg('split')}</div></div>` : ''}
        ${showSeam ? `<span class="corner l">Original</span><span class="corner r">${esc(p.label)}</span>` : `<span class="corner ${V.mode === 'side' || p.seq ? 'l' : 'r'} lab">${esc(p.label)}</span>`}
        ${p.seq && all.length > 1 ? `<span class="corner r seqnav">${svg('chevl')}<span class="kbd">←</span><span class="kbd">→</span>${svg('chevr')}</span>` : ''}
        ${orig ? '<span class="corner hold" hidden>Original</span>' : ''}</div>`;
    }).join('') + `<span class="zoomnote" id="znote"></span>`;
    $$('#c-modes button').forEach((b) => b.classList.toggle('on', b.dataset.m === V.mode));
  }

  function applyView() {
    if (!V.cur) { $('#z-lab').textContent = '–'; return; }
    const { s, x, y } = V.view;
    const shown = (s * V.base.w) / V.orig.w; // on-screen size relative to the original's pixels
    $$('#panes .pane').forEach((pane) => {
      const w = $('.world', pane);
      w.style.width = V.base.w + 'px';
      w.style.height = V.base.h + 'px';
      w.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      w.classList.toggle('pixel', shown >= 2);
      const up = $('img.u', w);
      const o = $('img.o', w);
      if (up) {
        if (V.holding && o) { up.style.display = 'none'; up.style.clipPath = ''; }
        else { up.style.display = ''; up.style.clipPath = V.mode === 'split' && o ? `inset(0 0 0 ${V.split * 100}%)` : ''; }
      }
      if (o) o.style.visibility = up && !V.holding && V.mode !== 'split' ? 'hidden' : '';
      const seam = $('[data-seam]', pane);
      if (seam) { seam.style.left = x + V.split * V.base.w * s + 'px'; seam.hidden = V.holding; }
      const hb = $('.corner.hold', pane);
      if (hb) hb.hidden = !V.holding;
      $$('.corner:not(.hold)', pane).forEach((c) => (c.style.visibility = V.holding ? 'hidden' : ''));
    });
    $('#z-lab').textContent = Math.round(shown * 100) + '%';
    const note = $('#znote');
    if (note) note.innerHTML = `${Math.round(shown * 100)}% · ${V.mode === 'split' && $('#panes .seam') ? 'drag the seam · ' : V.mode === 'seq' ? '<span class="kbd">←</span><span class="kbd">→</span> step through · ' : ''}scroll to zoom · drag to pan · hold <span class="kbd">Space</span> for the original · <span class="kbd">H</span> ${document.body.classList.contains('cfull') ? 'show the panels' : 'just the images'}`;
  }
  function paneBox() {
    const p = $('#panes .pane');
    return p ? { w: p.clientWidth, h: p.clientHeight } : null;
  }
  function fitView() {
    const b = paneBox();
    if (!b || !b.w || !V.cur) { applyView(); return; }
    const s = Math.min(b.w / V.base.w, b.h / V.base.h) * 0.96;
    V.view = { s, x: (b.w - V.base.w * s) / 2, y: (b.h - V.base.h * s) / 2 };
    applyView();
  }
  function zoomAt(cx, cy, f) {
    const v = V.view;
    const ns = Math.min(40, Math.max(0.02, v.s * f));
    const wx = (cx - v.x) / v.s;
    const wy = (cy - v.y) / v.s;
    V.view = { s: ns, x: cx - wx * ns, y: cy - wy * ns };
    applyView();
  }
  const zoomCenter = (f) => { const b = paneBox(); if (b) zoomAt(b.w / 2, b.h / 2, f); };
  function zoomOriginalPixels(k) {
    const b = paneBox();
    if (!b) return;
    zoomAt(b.w / 2, b.h / 2, (k * V.orig.w) / V.base.w / V.view.s);
  }
  $('#z-in').onclick = () => zoomCenter(1.25);
  $('#z-out').onclick = () => zoomCenter(1 / 1.25);
  $('#z-fit').onclick = fitView;
  $('#z-1').onclick = () => zoomOriginalPixels(1);
  $('#c-show').onclick = () => { const v = curVersion(); if (v) api.showInFolder(v.path); };
  $('#c-rerun').onclick = () => { if (V.cur) queueImages([V.cur], () => rerunRead()); };
  $('#c-full').onclick = () => setCompareFull(!document.body.classList.contains('cfull'));
  new ResizeObserver(() => { if (ui.screen === 'compare' && V.cur) fitView(); }).observe($('#stage'));

  const stage = $('#stage');
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('wheel', (e) => {
    const pane = e.target.closest('.pane');
    if (!pane || !V.cur) return;
    e.preventDefault();
    const r = pane.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });
  stage.addEventListener('mousedown', (e) => {
    if (!V.cur) return;
    stage.focus({ preventScroll: true });
    const seam = e.target.closest('[data-seam]');
    if (seam && e.button === 0) { V.drag = { seam: true, pane: seam.closest('.pane') }; e.preventDefault(); return; }
    if (e.button === 0 && V.mode === 'hold') { V.holding = true; applyView(); }
    V.drag = { x: e.clientX, y: e.clientY, pane: e.target.closest('.pane') };
    V.drag.pane?.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!V.drag) return;
    if (V.drag.seam) {
      const r = V.drag.pane.getBoundingClientRect();
      V.split = Math.min(1, Math.max(0, (e.clientX - r.left - V.view.x) / (V.base.w * V.view.s)));
      applyView();
      return;
    }
    V.view.x += e.clientX - V.drag.x;
    V.view.y += e.clientY - V.drag.y;
    V.drag.x = e.clientX;
    V.drag.y = e.clientY;
    applyView();
  });
  const endDrag = () => {
    V.drag?.pane?.classList.remove('dragging');
    V.drag = null;
    if (V.holding && !spaceDown) { V.holding = false; applyView(); }
  };
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', () => { spaceDown = false; endDrag(); });
  function stepImage(d) {
    const rows = V.rows;
    const i = rows.findIndex((r) => r.path === V.cur);
    const n = rows[Math.max(0, Math.min(rows.length - 1, (i < 0 ? 0 : i + d)))];
    if (n && n.path !== V.cur) openImage(n.path, { keepView: false });
  }
  function setCompareFull(on) {
    document.body.classList.toggle('cfull', on);
    setFull(on);
    $('#c-full').innerHTML = svg(on ? 'shrink' : 'expand');
    requestAnimationFrame(fitView);
    applyView();
  }

  /* =====================================================================================
     ENGINE
     ===================================================================================== */
  const STEPS = [['python', 'Python 3.12'], ['pip', 'pip'], ['nunif', 'nunif (waifu2x code)'], ['torch', 'PyTorch with CUDA'], ['reqs', 'nunif requirements'], ['models', 'waifu2x models'], ['test', 'Test upscale']];
  const engProg = { label: '', done: 0, total: null, unit: 'bytes', start: 0, firstDone: 0, lastDone: null, lastChange: 0 };

  async function refreshAppInfo() {
    try {
      const info = await api.appInfo();
      eng.appInfo = info;
      eng.installed = !!info.engineInstalled;
      eng.info = info.engine;
    } catch (_) { /* keep previous */ }
    renderBanners();
    if (ui.screen === 'engine') renderEngine();
    renderBatch();
    renderCompareButtons();
  }

  function renderEngine() {
    const info = eng.appInfo || {};
    const e = eng.info || {};
    const tag = $('#e-tag');
    if (eng.installing) { tag.className = 'tag acc'; tag.textContent = 'Installing'; }
    else if (eng.installed) { tag.className = 'tag ok'; tag.textContent = 'Installed'; }
    else if (eng.error) { tag.className = 'tag warn'; tag.textContent = 'Install stopped'; }
    else { tag.className = 'tag warn'; tag.textContent = 'Not installed'; }
    $('#e-lead').textContent = eng.installing
      ? 'About 3 GB in total. If it stops, click Resume install and it carries on from the last finished step.'
      : eng.installed
        ? `Installed and tested with PyTorch ${e.torch || ''}. ${(info.gpu || {}).available === true ? `Upscaling runs on ${info.gpu.device}.` : (info.gpu || {}).available === false ? "It can't use the GPU right now, so upscaling runs on the CPU. The GPU section below shows why." : ''}`
        : eng.error ? 'The install stopped. Click Resume install to carry on from the last finished step; the log shows what went wrong.'
          : 'A one-time download of about 3 GB: Python, PyTorch with CUDA, nunif and the waifu2x models. It finishes by upscaling a small test image.';
    const idx = STEPS.findIndex(([id]) => id === eng.step);
    $('#e-steps').innerHTML = STEPS.map(([id, label], i) => {
      let cls = 'todo';
      if (eng.installed && !eng.installing) cls = 'done';
      else if (eng.installing || eng.error) cls = i < idx ? 'done' : i === idx ? (eng.error ? 'bad' : 'now') : 'todo';
      return `<div class="step ${cls}">${svg(cls === 'done' ? 'check' : cls === 'bad' ? 'alert' : 'dot')}${label}</div>`;
    }).join('');
    $('#e-install-t').textContent = eng.installing ? 'Installing…' : eng.installed ? 'Reinstall engine' : eng.error ? 'Resume install' : 'Install engine';
    $('#e-install').disabled = eng.installing || jobsActive();
    $('#e-install').classList.toggle('primary', !eng.installed);
    $('#e-check').disabled = eng.installing;
    $('#e-prog').hidden = !(eng.installing || eng.ran);
    $('#e-datadir').textContent = info.dataDir || '';
    $('#e-logfile').textContent = info.logFile || '';
    $('#e-missing').hidden = !info.missingDataDir;
    if (info.missingDataDir) $('#e-missing').textContent = `The data folder ${info.missingDataDir} isn't available (is the external drive connected?). Using the default folder for now.`;
    renderEngineProgress();
    renderGpu();
  }
  function renderEngineProgress() {
    const p = engProg;
    const now = Date.now();
    const elapsed = (now - p.start) / 1000;
    const rate = elapsed > 0.5 ? (p.done - p.firstDone) / elapsed : 0;
    const pct = p.total ? Math.min(eng.installing ? 99 : 100, (p.done / p.total) * 100) : null;
    const left = p.total && rate > 0 && eng.installing ? Math.max(0, (p.total - p.done) / rate) : null;
    $('#e-label').textContent = p.label;
    $('#e-pct').textContent = pct === null ? '' : Math.floor(pct) + '%';
    $('#e-bar').parentElement.classList.toggle('indet', pct === null && eng.installing);
    $('#e-bar').style.width = pct === null ? (eng.installing ? '' : '100%') : pct + '%';
    const parts = [];
    if (eng.installing) {
      parts.push(p.total ? `${PR.fmtVal(p.done, p.unit)} of ${PR.fmtVal(p.total, p.unit)}` : p.done ? `${PR.fmtVal(p.done, p.unit)} so far` : 'This step has no size to report');
      const r = PR.fmtRate(rate, p.unit); if (r) parts.push(r);
      parts.push(`${PR.fmtTime(elapsed)} elapsed`);
      parts.push(left != null ? `about ${PR.fmtTime(left)} left` : p.total ? 'working out time left…' : 'time left unknown');
    } else if (eng.ran) parts.push(eng.lastMessage || '');
    $('#e-detail').textContent = parts.join('  ·  ');
    const idle = (now - p.lastChange) / 1000;
    $('#e-warn').textContent = eng.installing && idle > 20 ? `No new progress for ${PR.fmtTime(idle)}. Unpacking and installing don't report progress, so this can be normal. The log shows what is running.` : '';
  }

  $('#e-install').onclick = async () => {
    eng.installing = true; eng.error = false; eng.ran = true; eng.step = eng.step || 'python';
    renderEngine(); renderBanners();
    log('Engine install started');
    try { await api.installEngine(); } catch (e) { eng.installing = false; toast(e.message, 'err'); renderEngine(); }
  };

  /* ---------- GPU: diagnosis, repair, which device to use ---------- */
  const gpuUI = { diag: null, running: false, auto: false };
  const LEVEL_ICON = { ok: 'check', error: 'alert', warn: 'alert', info: 'info' };
  function renderGpu() {
    const info = eng.appInfo || {};
    const g = info.gpu || {};
    const d = gpuUI.diag || info.gpuDiag;
    const tag = $('#g-tag');
    if (gpuUI.running) { tag.className = 'tag acc'; tag.textContent = 'Checking…'; }
    else if (g.available === true) { tag.className = 'tag ok'; tag.textContent = 'Using the GPU'; }
    else if (g.available === false) { tag.className = 'tag warn'; tag.textContent = 'CPU only'; }
    else { tag.className = 'tag'; tag.textContent = ''; }
    $('#g-when').textContent = d && d.at ? `Checked ${age(d.at)}` : '';
    $('#g-lead').textContent = gpuUI.running ? 'Checking Windows, the NVIDIA driver, CUDA and PyTorch. This takes up to a minute.'
      : d ? d.summary
        : g.available === true ? `Upscaling runs on ${g.device}. Diagnose GPU checks the driver and PyTorch in detail.`
          : g.available === false ? "PyTorch can't use the NVIDIA GPU, so upscaling runs on the CPU, which is much slower. Diagnose GPU finds out why."
            : eng.installed ? 'Not checked yet.' : 'Diagnose GPU checks Windows and the NVIDIA driver now; PyTorch is checked once the engine is installed.';
    const fs = d && !gpuUI.running ? d.findings || [] : [];
    $('#g-findings').innerHTML = fs.map((f) => `<div class="fd ${f.level}">${svg(LEVEL_ICON[f.level] || 'info')}<div><b>${esc(f.title)}</b>${f.text ? `<p>${esc(f.text)}</p>` : ''}${f.fix ? `<p class="fix"><span>Fix:</span> ${esc(f.fix)}</p>` : ''}${f.link ? `<button class="linkbtn" data-ext="${esc(f.link)}">${svg('ext')}NVIDIA driver downloads</button>` : ''}</div></div>`).join('');
    const repair = !!(d && d.canRepair && eng.installed && !gpuUI.running);
    $('#g-repair').hidden = !repair;
    if (repair) {
      const label = { cu132: 'CUDA 13.2', cu130: 'CUDA 13.0', cu126: 'CUDA 12.6' }[d.bestBuild] || d.bestBuild;
      $('#g-repair').innerHTML = `${svg('wrench')}Repair GPU support`;
      $('#g-repair').title = `Reinstalls PyTorch as the ${label} build, which suits your driver (about 3 GB), then tests the GPU.`;
    }
    $('#g-diag').disabled = gpuUI.running || eng.installing;
    $('#g-repair').disabled = eng.installing || jobsActive();
    $('#g-copy').hidden = $('#g-open').hidden = !(d && (d.report || d.reportFile)) || gpuUI.running;
    const devs = (d && d.devices && d.devices.length ? d.devices : g.devices) || [];
    const cur = ui.gpuSetting == null ? 'auto' : String(ui.gpuSetting);
    $('#g-choice').innerHTML = [['auto', 'Auto: the NVIDIA GPU when it works, otherwise the CPU'], ...devs.map((x) => [String(x.index), `GPU ${x.index}: ${x.name}`]), ['cpu', 'CPU only (much slower)']]
      .map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
  }
  async function runDiagnose() {
    if (gpuUI.running) return;
    gpuUI.running = true;
    renderGpu();
    log('Diagnosing the GPU…');
    try {
      const r = await api.diagnoseGpu();
      gpuUI.diag = r;
      for (const f of r.findings) log(`[${f.level}] ${f.title}${f.text ? ': ' + f.text : ''}${f.fix ? ' Fix: ' + f.fix : ''}`, f.level === 'error' ? 'e' : f.level === 'ok' ? 'o' : '');
      setTask('gpu', { key: 'gpu', label: 'Diagnosing GPU', done: 3, total: 3, unit: 'checks', state: 'done', message: r.summary });
      toast(r.summary, r.status === 'ok' ? 'ok' : 'err', 8000);
    } catch (e) {
      setTask('gpu', { key: 'gpu', label: 'Diagnosing GPU', done: 0, total: 3, unit: 'checks', state: 'error', message: e.message });
      toast(`The diagnosis stopped: ${e.message}`, 'err');
    } finally {
      gpuUI.running = false;
      await refreshAppInfo();
      renderGpu();
    }
  }
  // Runs once by itself when the engine says the GPU isn't usable and nothing was checked since.
  function maybeAutoDiagnose() {
    const info = eng.appInfo || {};
    if (gpuUI.auto || gpuUI.running || !eng.installed || eng.installing) return;
    if (info.gpu && info.gpu.available === false && info.gpu.from === 'install') { gpuUI.auto = true; runDiagnose(); }
  }
  $('#g-diag').onclick = runDiagnose;
  $('#g-repair').onclick = async () => {
    const d = gpuUI.diag || (eng.appInfo || {}).gpuDiag;
    const label = d ? ({ cu132: 'CUDA 13.2', cu130: 'CUDA 13.0', cu126: 'CUDA 12.6' }[d.bestBuild] || d.bestBuild) : '';
    const r = await dialog({ title: 'Repair GPU support?', body: `PyTorch is reinstalled as the ${esc(label)} build, which works with your NVIDIA driver. It's a download of about 3 GB, then the GPU is tested. Everything else in the engine stays.`, ok: 'Repair' });
    if (!r.ok) return;
    eng.installing = true; eng.error = false; eng.ran = true; eng.step = 'torch'; eng.repairing = true;
    renderEngine(); renderBanners();
    log('GPU repair started');
    try { await api.installEngine({ torchOnly: true, build: d && d.bestBuild }); } catch (e) { eng.installing = false; toast(e.message, 'err'); renderEngine(); }
  };
  $('#g-choice').onchange = async (e) => {
    const v = e.target.value;
    ui.gpuSetting = v === 'auto' || v === 'cpu' ? v : Number(v);
    await api.setSettings({ gpu: ui.gpuSetting });
    toast(v === 'cpu' ? 'Upscaling will use the CPU.' : v === 'auto' ? 'Upscaling uses the NVIDIA GPU when it works.' : `Upscaling will use GPU ${v}.`, 'ok');
    renderBatch();
  };
  $('#g-copy').onclick = () => {
    const d = gpuUI.diag;
    const text = d && d.report ? d.report : null;
    if (!text) { const f = (eng.appInfo || {}).gpuDiag; if (f && f.reportFile) api.openPath(f.reportFile); return; }
    navigator.clipboard.writeText(text).then(() => toast('Report copied. Paste it into a message to get help.', 'ok')).catch(() => toast('Could not copy the report', 'err'));
  };
  $('#g-open').onclick = () => { const d = gpuUI.diag || (eng.appInfo || {}).gpuDiag; if (d && d.reportFile) api.openPath(d.reportFile); };
  $('#g-findings').addEventListener('click', (e) => { const b = e.target.closest('[data-ext]'); if (b) api.openExternal(b.dataset.ext).catch((err) => toast(err.message, 'err')); });
  $('#e-check').onclick = async () => {
    log('Checking the engine…');
    const r = await api.checkSetup();
    log(r.output || '(no output)', r.ok ? '' : 'e');
    setLog(true);
    toast(r.ok ? 'Engine check passed. Details are in the log.' : 'Engine check found a problem. Details are in the log.', r.ok ? 'ok' : 'err');
  };
  $('#e-openlog').onclick = () => eng.appInfo && api.openPath(eng.appInfo.logFile);
  $('#e-show').onclick = () => eng.appInfo && api.openPath(eng.appInfo.dataDir);
  $('#e-move').onclick = async () => {
    const r = await dialog({ title: 'Move app data?', body: 'Choose a folder on the drive you want, for example your external drive. Everything is copied there first, then the old copy is deleted, and the app closes so you can reopen it. Your images are not moved.', ok: 'Choose folder…' });
    if (!r.ok) return;
    try {
      const res = await api.moveDataFolder();
      if (res && res.ok) { setTask('move', { label: 'Moved app data', done: 1, total: 1, state: 'done', message: `Moved to ${res.target}. The app is closing; open it again.` }); }
    } catch (e) { toast(e.message, 'err', 7000); }
  };
  $('#e-reset').onclick = async () => {
    const r = await dialog({ title: 'Reset app data?', body: 'This clears the version list and settings. Your images, themes, fonts and the engine stay.', ok: 'Reset', danger: true });
    if (!r.ok) return;
    try { await api.resetAppData(); await loadFolders(); toast('App data reset', 'ok'); } catch (e) { toast(e.message, 'err'); }
  };
  $('#e-nunif-browse').onclick = async () => { const f = await api.pickFolder(); if (f) $('#e-nunif').value = f; };
  $('#e-save-adv').onclick = async () => {
    await api.setSettings({ python: $('#e-py').value.trim() || 'python', nunifPath: $('#e-nunif').value.trim() });
    toast('Paths saved. Use Check engine to test them.', 'ok');
  };

  api.onTaskProgress((ev) => {
    if (ev.log) log(ev.log);
    if (ev.task === 'gpu') {
      setTask('gpu', { key: 'gpu', label: 'Diagnosing GPU', name: ev.label, done: ev.done, total: ev.total, unit: 'checks' });
      return;
    }
    if (ev.task === 'scan') {
      if (ev.state === 'done') {
        if (jobsActive()) updateJobTask();
        else setTask('scan', { key: 'scan', label: 'Reading folders', done: ev.done, total: ev.total || 1, unit: 'images', state: 'done', message: `Found ${ev.done} image${ev.done === 1 ? '' : 's'}.` });
      } else if (!jobsActive()) setTask('scan', { key: 'scan', label: 'Reading folders', name: ev.label, done: ev.done, total: ev.total, unit: 'images' });
      return;
    }
    if (ev.task === 'move') {
      if (ev.label) setTask('move', { label: 'Moving app data', name: ev.label, done: ev.done, total: ev.total, unit: ev.unit });
      return;
    }
    if (ev.task !== 'engine' && !ev.label) return;
    if (ev.stepId) eng.step = ev.stepId;
    if (ev.state === 'done') {
      const wasRepair = eng.repairing;
      eng.installing = false; eng.error = false; eng.repairing = false; eng.lastMessage = ev.message;
      if (!ev.cuda || wasRepair) setTimeout(runDiagnose, 300);
      setTask('engine', { label: 'Installing engine', done: 1, total: 1, state: 'done', message: ev.message });
      log(ev.message, 'o');
      toast(ev.message, 'ok', 7000);
      refreshAppInfo();
      return;
    }
    if (ev.state === 'error') {
      eng.installing = false; eng.error = true; eng.repairing = false; eng.lastMessage = ev.message;
      setTask('engine', { label: 'Installing engine', done: 0, total: null, state: 'error', message: ev.message });
      log(ev.message, 'e');
      setLog(true);
      refreshAppInfo();
      return;
    }
    if (!ev.label) return;
    eng.installing = true;
    const now = Date.now();
    if (engProg.label !== ev.label || (ev.done != null && engProg.lastDone != null && ev.done < engProg.lastDone)) {
      Object.assign(engProg, { label: ev.label, start: now, firstDone: ev.done || 0, lastDone: null, lastChange: now });
    }
    if (ev.done != null && ev.done !== engProg.lastDone) { engProg.lastDone = ev.done; engProg.lastChange = now; }
    Object.assign(engProg, { done: ev.done || 0, total: ev.total || null, unit: ev.unit || 'bytes' });
    const stepName = (STEPS.find(([id]) => id === eng.step) || [, ''])[1];
    setTask('engine', { label: 'Installing engine', name: `${stepName}${stepName ? ' · ' : ''}${ev.label}`, done: ev.done, total: ev.total, unit: ev.unit });
    if (ui.screen === 'engine') renderEngine();
  });

  /* =====================================================================================
     APPEARANCE
     ===================================================================================== */
  const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function swatch(t) {
    const b = t.background;
    return `<div class="sw"><i style="background:${b.ground}"></i><i style="background:${b.panel}"></i><i style="background:${b.raised}"></i><i class="g" style="background:${T.gradient(t.accent.stops, 90)}"></i></div>`;
  }
  function renderThemeList() {
    const list = [savedTheme(DEFAULT_ID), ...look.saved];
    const curKey = themeKey(look.current);
    $('#a-themes').innerHTML = list.map((s) => {
      const active = look.activeId === s.id;
      const edited = active && themeKey(s.theme) !== curKey;
      return `<div class="tcard${active ? ' on' : ''}" data-id="${s.id}" tabindex="0" role="button" aria-pressed="${active}">
        ${swatch(s.theme)}<div class="nm"><b>${esc(s.name)}</b><span>${esc(s.theme.font.family)}</span></div>
        ${edited ? '<span class="tag acc" style="align-self:flex-start">Edited · not saved</span>' : ''}
        <div class="acts">${edited && !s.builtIn ? '<button data-a="update">Update</button>' : ''}${s.builtIn ? '' : '<button data-a="rename">Rename</button>'}<button data-a="dup">Duplicate</button><button data-a="export">Export</button>${s.builtIn ? '' : '<button data-a="del" class="del">Delete</button>'}</div></div>`;
    }).join('');
    $('#a-desc').textContent = T.describe(look.current).text;
  }
  $('#a-themes').addEventListener('click', async (e) => {
    const card = e.target.closest('.tcard');
    if (!card) return;
    const s = savedTheme(card.dataset.id);
    const act = e.target.closest('[data-a]')?.dataset.a;
    if (!act) { look.activeId = s.id; look.current = T.normalize(s.theme); applyTheme(); persistLook(); renderAppearance(); return; }
    if (act === 'update') { s.theme = T.normalize({ ...look.current, name: s.name }); persistLook(); renderThemeList(); toast(`Saved changes to ${s.name}`, 'ok'); }
    if (act === 'rename') {
      const r = await dialog({ title: 'Rename theme', ok: 'Rename', input: { value: s.name, label: 'Theme name' } });
      if (r.ok && r.value) { s.name = r.value.slice(0, 60); s.theme.name = s.name; persistLook(); renderThemeList(); }
    }
    if (act === 'dup') {
      const copy = { id: uid(), name: `${s.name} copy`, theme: T.normalize({ ...s.theme, name: `${s.name} copy` }) };
      look.saved.push(copy); persistLook(); renderThemeList();
    }
    if (act === 'export') exportTheme({ ...s.theme, name: s.name });
    if (act === 'del') {
      const r = await dialog({ title: `Delete ${s.name}?`, body: 'The theme is removed from this app. What you see now stays until you pick another theme.', ok: 'Delete', danger: true });
      if (!r.ok) return;
      look.saved = look.saved.filter((x) => x.id !== s.id);
      if (look.activeId === s.id) look.activeId = null;
      persistLook(); renderThemeList();
    }
  });
  async function exportTheme(t) {
    try { const p = await api.exportTheme(T.normalize(t)); if (p) toast(`Theme saved to ${p}`, 'ok'); } catch (e) { toast(e.message, 'err'); }
  }
  $('#a-save').onclick = async () => {
    const r = await dialog({ title: 'Save as theme', body: 'Saves everything you see now: colours, gradient, font, corners and density.', ok: 'Save', input: { value: `My theme ${look.saved.length + 1}`, label: 'Theme name' } });
    if (!r.ok || !r.value) return;
    const s = { id: uid(), name: r.value.slice(0, 60), theme: T.normalize({ ...look.current, name: r.value }) };
    look.saved.push(s);
    look.activeId = s.id;
    persistLook();
    renderThemeList();
    toast(`Saved ${s.name}`, 'ok');
  };
  $('#a-export').onclick = () => {
    const s = look.activeId ? savedTheme(look.activeId) : null;
    exportTheme({ ...look.current, name: s ? s.name : 'Custom theme' });
  };
  $('#a-import').onclick = async () => {
    try {
      const list = await api.importThemes();
      if (!list || !list.length) return;
      for (const t of list) {
        const n = T.normalize(t);
        let name = n.name;
        while (look.saved.some((s) => s.name === name)) name += ' (imported)';
        look.saved.push({ id: uid(), name, theme: { ...n, name } });
      }
      persistLook();
      renderThemeList();
      toast(`Imported ${list.length} theme${list.length === 1 ? '' : 's'}. Click one to use it.`, 'ok');
    } catch (e) { toast(e.message, 'err', 7000); }
  };
  $('#a-reset').onclick = async () => {
    const r = await dialog({ title: 'Go back to the default look?', body: 'Obsidian, Lime → Teal, Inter, standard corners, compact. Your saved themes stay.', ok: 'Use default' });
    if (!r.ok) return;
    look.activeId = DEFAULT_ID;
    look.current = T.normalize(T.DEFAULT_THEME);
    applyTheme(); persistLook(); renderAppearance();
  };

  function fontChoices() {
    const bundled = (window.BUNDLED_FONTS || []).map((f) => ({ family: f.family, kind: 'bundled', ok: true }));
    const system = T.SYSTEM_FONTS.map((f) => ({ family: f, kind: 'system', ok: systemFontInstalled(f) }));
    const custom = customFonts.map((f) => ({ family: f.family, kind: 'custom', ok: true, id: f.id }));
    return { bundled, system, custom };
  }
  function colorRow(group, key, label, value) {
    return `<div class="crow"><input type="color" value="${value}" data-cg="${group}" data-ck="${key}" aria-label="${esc(label)}"><span>${esc(label)}</span><input class="hex" value="${value}" data-hg="${group}" data-hk="${key}" spellcheck="false" aria-label="${esc(label)} hex"></div>`;
  }
  function renderAppearance() {
    renderThemeList();
    const t = look.current;
    const d = T.describe(t);
    const fc = fontChoices();
    const fontChip = (f) => `<button class="chip font${t.font.family === f.family ? ' on' : ''}${f.ok ? '' : ' off'}" data-font="${esc(f.family)}" style="font-family:${esc(T.fontStack(f.family))}"${f.ok ? '' : ' disabled title="Not installed on this computer"'}>${esc(f.family === 'Segoe UI Variable Text' ? 'Segoe UI Variable' : f.family)}${f.kind === 'system' ? ` <span class="note">${f.ok ? 'installed' : 'not installed'}</span>` : ''}${f.kind === 'custom' ? `<span class="x" data-rmfont="${esc(f.id)}" title="Remove this font">${svg('x')}</span>` : ''}</button>`;
    const on = t.accent.onAccent;
    const onColor = T.onAccent(t);
    const worst = Math.min(...t.accent.stops.map((s) => T.contrast(onColor, s)));
    $('#a-form').innerHTML = `
      <div class="panel asec"><div class="sh"><h3>Preview</h3><span>Everything in the app updates as you change things below.</span></div>
        <div class="preview">
          <div class="pbox"><div class="trow"><button class="btn primary">${svg('upscale')}Upscale 6 images</button><button class="btn">Browse</button></div>
            <div class="trow"><span class="sel"><select><option>Medium</option></select>${svg('chev')}</span><label class="cb"><input type="checkbox" checked>Include subfolders</label></div></div>
          <div class="pbox"><div class="trow" style="justify-content:space-between"><b>Upscaling 4 of 6</b><span style="color:var(--acc);font-weight:600">58%</span></div><div class="bar"><i style="width:58%"></i></div>
            <span class="muted small">1:12 elapsed · about 0:52 left</span></div>
          <div class="pbox"><div class="trow"><span class="st ok">${svg('check')}Done</span><span class="st run"><span class="mini"><i></i></span>Upscaling</span><span class="st wait">Queued</span></div>
            <div class="trow"><span class="tag acc">Edited</span><span class="tag ok">Installed</span><span class="tag warn">Not installed</span><span class="faint small">Faint text</span></div></div>
        </div></div>

      <div class="panel asec"><div class="sh"><h3>Background</h3><span>${d.background ? esc(T.BACKGROUNDS[d.background].name) : 'Custom'} · pick a preset, then change any colour</span></div>
        <div class="chips">${Object.entries(T.BACKGROUNDS).map(([k, b]) => `<button class="chip${d.background === k ? ' on' : ''}" data-bg="${k}"><span class="sw" style="background:linear-gradient(135deg, ${b.ground} 0 45%, ${b.raised} 45% 75%, ${b.text} 75%)"></span>${esc(b.name)}</button>`).join('')}</div>
        <div class="colors">${T.BG_LABELS.map(([k, l]) => colorRow('background', k, l, t.background[k])).join('')}</div>
        <div class="subhead">State colours</div>
        <div class="colors">${T.STATE_LABELS.map(([k, l]) => colorRow('states', k, l, t.states[k])).join('')}</div></div>

      <div class="panel asec"><div class="sh"><h3>Accent</h3><span>${d.accent ? esc(T.ACCENTS[d.accent].name) : 'Custom'} · used for the main button, progress, selection and the compare seam</span></div>
        <div class="chips">${Object.entries(T.ACCENTS).map(([k, a]) => `<button class="chip${d.accent === k ? ' on' : ''}" data-acc="${k}"><span class="gp" style="background:${T.gradient(a.stops, 90)}"></span>${esc(a.name)}</button>`).join('')}</div>
        <div class="subhead">Gradient colours</div>
        <div class="stops">${t.accent.stops.map((s, i) => `<span class="stop"><input type="color" value="${s}" data-stop="${i}" aria-label="Colour ${i + 1}"><input class="hex" value="${s}" data-stophex="${i}" spellcheck="false" aria-label="Colour ${i + 1} hex">${t.accent.stops.length > 1 ? `<button class="rm" data-rmstop="${i}" title="Remove this colour" aria-label="Remove colour">${svg('x')}</button>` : ''}</span>`).join('')}
          ${t.accent.stops.length < 4 ? `<button class="btn" id="a-addstop">${svg('plus')}Add colour</button>` : ''}<span class="gprev" style="background:${T.gradient(t.accent.stops, t.accent.angle)}"></span></div>
        <div class="trow"><span class="inl">Direction</span><span class="slider"><input type="range" min="0" max="360" step="5" value="${t.accent.angle}" id="a-angle" aria-label="Gradient direction"${t.accent.stops.length === 1 ? ' disabled' : ''}><span class="v" id="a-angle-v">${t.accent.angle}°</span></span>
          <div class="divider"></div><span class="inl">Text on accent</span>
          <div class="seg" id="a-on">${[['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button data-on="${k}" class="${on === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <span class="${worst < 4.5 ? 'warnline' : 'faint small'}">Contrast ${worst.toFixed(1)}:1${worst < 4.5 ? ' · hard to read, try the other text colour' : ''}</span></div></div>

      <div class="panel asec"><div class="sh"><h3>Font</h3><span>${esc(t.font.family)} · bundled fonts work offline; add any font you have as a file</span></div>
        <div class="subhead">Bundled</div><div class="chips">${fc.bundled.map(fontChip).join('')}</div>
        <div class="subhead">On this computer</div><div class="chips">${fc.system.map(fontChip).join('')}</div>
        <div class="subhead">Added by you</div><div class="chips">${fc.custom.map(fontChip).join('')}<button class="btn" id="a-addfont">${svg('plus')}Add font…</button></div>
        <div class="trow"><span class="inl">Text size</span><div class="seg" id="a-size">${T.TEXT_SIZES.map((s) => `<button data-size="${s}" class="${t.font.size === s ? 'on' : ''}">${s}px</button>`).join('')}</div></div></div>

      <div class="panel asec"><div class="sh"><h3>Shape and spacing</h3><span>${d.corners ? esc(T.CORNERS[d.corners].name) : 'Custom'} corners · ${d.density ? esc(T.DENSITY[d.density].name) : 'custom'} density</span></div>
        <div class="trow"><span class="inl" style="width:88px">Corners</span><div class="seg" id="a-corners">${Object.entries(T.CORNERS).map(([k, c]) => `<button data-c="${k}" class="${d.corners === k ? 'on' : ''}">${c.name}</button>`).join('')}</div>
          <span class="slider"><span class="inl">Controls</span><input type="range" min="0" max="16" value="${t.corners.control}" data-num="corners.control" aria-label="Control corner radius"><span class="v">${t.corners.control}px</span></span>
          <span class="slider"><span class="inl">Panels</span><input type="range" min="0" max="24" value="${t.corners.panel}" data-num="corners.panel" aria-label="Panel corner radius"><span class="v">${t.corners.panel}px</span></span></div>
        <div class="trow"><span class="inl" style="width:88px">Density</span><div class="seg" id="a-density">${Object.entries(T.DENSITY).map(([k, c]) => `<button data-dn="${k}" class="${d.density === k ? 'on' : ''}">${c.name}</button>`).join('')}</div>
          <span class="slider"><span class="inl">Controls</span><input type="range" min="24" max="44" value="${t.density.control}" data-num="density.control" aria-label="Control height"><span class="v">${t.density.control}px</span></span>
          <span class="slider"><span class="inl">Rows</span><input type="range" min="20" max="40" value="${t.density.row}" data-num="density.row" aria-label="Row height"><span class="v">${t.density.row}px</span></span></div></div>`;
  }

  // Presets and buttons: re-render the form. Colour pickers, hex fields and sliders: update in place, so dragging stays smooth.
  $('#a-form').addEventListener('click', async (e) => {
    const t = look.current;
    const q = (sel) => e.target.closest(sel);
    let b;
    if ((b = q('[data-bg]'))) return setLook(T.withBackground(t, b.dataset.bg));
    if ((b = q('[data-acc]'))) return setLook({ ...t, accent: { ...t.accent, stops: [...T.ACCENTS[b.dataset.acc].stops] } });
    if ((b = q('[data-rmfont]'))) {
      e.stopPropagation();
      const f = customFonts.find((x) => x.id === b.dataset.rmfont);
      const r = await dialog({ title: `Remove ${f ? f.family : 'this font'}?`, body: 'Its files are deleted from the app data folder. Themes using it fall back to Inter.', ok: 'Remove', danger: true });
      if (!r.ok) return;
      customFonts = await api.removeFont(b.dataset.rmfont);
      if (f && t.font.family === f.family) return setLook({ ...t, font: { ...t.font, family: 'Inter' } });
      return renderAppearance();
    }
    if ((b = q('[data-font]')) && !b.disabled) return setLook({ ...t, font: { ...t.font, family: b.dataset.font } });
    if ((b = q('[data-size]'))) return setLook({ ...t, font: { ...t.font, size: +b.dataset.size } });
    if ((b = q('[data-on]'))) return setLook({ ...t, accent: { ...t.accent, onAccent: b.dataset.on } });
    if ((b = q('[data-c]'))) { const c = T.CORNERS[b.dataset.c]; return setLook({ ...t, corners: { control: c.control, panel: c.panel } }); }
    if ((b = q('[data-dn]'))) { const c = T.DENSITY[b.dataset.dn]; return setLook({ ...t, density: { control: c.control, row: c.row } }); }
    if ((b = q('[data-rmstop]'))) { const s = t.accent.stops.filter((_, i) => i !== +b.dataset.rmstop); return setLook({ ...t, accent: { ...t.accent, stops: s } }); }
    if (q('#a-addstop')) { const s = [...t.accent.stops, t.accent.stops[t.accent.stops.length - 1]]; return setLook({ ...t, accent: { ...t.accent, stops: s } }); }
    if (q('#a-addfont')) return addFont();
  });
  $('#a-form').addEventListener('input', (e) => {
    const el = e.target;
    const t = JSON.parse(JSON.stringify(look.current));
    const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
    if (el.dataset.cg) {
      t[el.dataset.cg][el.dataset.ck] = el.value;
      const hx = $(`.hex[data-hg="${el.dataset.cg}"][data-hk="${el.dataset.ck}"]`); if (hx) { hx.value = el.value; hx.classList.remove('bad'); }
    } else if (el.dataset.hg) {
      if (!isHex(el.value)) { el.classList.add('bad'); return; }
      el.classList.remove('bad');
      t[el.dataset.hg][el.dataset.hk] = el.value.trim();
      const cp = $(`input[type=color][data-cg="${el.dataset.hg}"][data-ck="${el.dataset.hk}"]`); if (cp) cp.value = T.normalize(t)[el.dataset.hg][el.dataset.hk];
    } else if (el.dataset.stop !== undefined) {
      t.accent.stops[+el.dataset.stop] = el.value;
      const hx = $(`[data-stophex="${el.dataset.stop}"]`); if (hx) hx.value = el.value;
    } else if (el.dataset.stophex !== undefined) {
      if (!isHex(el.value)) { el.classList.add('bad'); return; }
      el.classList.remove('bad');
      t.accent.stops[+el.dataset.stophex] = el.value.trim();
    } else if (el.id === 'a-angle') {
      t.accent.angle = +el.value;
      $('#a-angle-v').textContent = el.value + '°';
    } else if (el.dataset.num) {
      const [g, k] = el.dataset.num.split('.');
      t[g][k] = +el.value;
      el.nextElementSibling.textContent = el.value + 'px';
    } else return;
    setLook(t, { rerender: false });
    const gp = $('.gprev'); if (gp) gp.style.background = T.gradient(look.current.accent.stops, look.current.accent.angle);
  });
  // Re-render once a picker or slider is released, so chip highlights and labels catch up.
  $('#a-form').addEventListener('change', (e) => { if (e.target.matches('input[type=color], input[type=range], .hex')) renderAppearance(); });

  async function addFont() {
    let files;
    try { files = await api.pickFonts(); } catch (e) { toast(e.message, 'err'); return; }
    if (!files || !files.length) return;
    const list = files.map((f) => `${esc(f.name)} · weight ${esc(f.weight)}${f.style === 'italic' ? ' italic' : ''}`).join('<br>');
    const r = await dialog({ title: 'Add font', body: 'Name the font as you want it to appear. Pick every weight of one font at once (Regular, Bold and so on).', ok: 'Add font',
      extra: `<div class="flist">${list}</div>`, input: { value: files[0].family, label: 'Font name' } });
    if (!r.ok || !r.value) return;
    try {
      customFonts = await api.installFont(r.value, files);
      await loadCustomFonts();
      setLook({ ...look.current, font: { ...look.current.font, family: r.value } });
      toast(`Added ${r.value}`, 'ok');
    } catch (e) { toast(e.message, 'err', 7000); }
  }

  /* =====================================================================================
     keyboard
     ===================================================================================== */
  let spaceDown = false;
  const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range' && e.target.type !== 'radio';

  // Full screen. The gallery and Compare can also hide everything around the image (gfull / cfull).
  function setFull(on) {
    if (!!ui.fullScreen !== on) api.toggleFullScreen().catch(() => {});
  }
  function leaveFull() {
    const had = document.body.classList.contains('gfull') || document.body.classList.contains('cfull');
    document.body.classList.remove('gfull', 'cfull');
    if (had) setFull(false);
  }
  function toggleFull() {
    if (ui.screen === 'batch' && st.view === 'gallery') setGalleryFull(!document.body.classList.contains('gfull'));
    else setFull(!ui.fullScreen);
  }
  if (api.onWindowState) {
    api.onWindowState((w) => {
      ui.fullScreen = !!(w && w.fullScreen);
      document.body.classList.toggle('fullscreen', ui.fullScreen);
      // leaving full screen some other way also brings the app's panels back
      if (!ui.fullScreen && (document.body.classList.contains('gfull') || document.body.classList.contains('cfull'))) {
        document.body.classList.remove('gfull', 'cfull');
        $('#c-full').innerHTML = svg('expand');
        if (st.view === 'gallery') renderGside(itemByPath(st.focus));
        requestAnimationFrame(() => { gFit(); fitView(); });
      }
    });
  }

  function showKeys() {
    const groups = [
      ['Anywhere', [
        [['1'], 'Batch'], [['2'], 'Compare'], [['3'], 'Engine'], [['4'], 'Appearance'],
        [['K'], 'These shortcuts'], [['L'], 'Open or close the log'], [['F'], 'Full screen (F11 too)'], [['Esc'], 'Leave full screen, close a dialog or the log'],
      ]],
      ['Batch: list and grid', [
        [['Click'], 'Select an image (its settings show above the list)'], [['Ctrl', 'click'], 'Tick or untick it for upscaling (the tick box does too)'],
        [['Shift', 'Ctrl', 'click'], 'Tick everything from the last ticked image (Shift + tick box too)'], [['Ctrl', 'A'], 'Tick everything shown'],
        [['Ctrl', 'wheel'], 'Bigger or smaller thumbnails'], [['Double-click'], 'Open in the gallery'], [['Enter'], 'Open the selected image in the gallery'],
      ]],
      ['Batch: gallery', [
        [['←', '→'], 'Previous or next image (PgUp, PgDn too)'], [['Home', 'End'], 'First or last image'], [['↑', '↓'], 'Zoom in or out (the wheel too)'],
        [['0'], 'Fit'], [['1'], 'Actual pixels'], [['X'], 'Tick or untick for upscaling'], [['F'], 'Full screen: just the image and the side panel'],
      ]],
      ['Compare', [
        [['Space'], 'Hold to see the original'], [['Left mouse'], 'Hold mode: hold to see the original (drag to pan)'],
        [['Q', 'W', 'E', 'R'], 'Hold, Split, Side by side, Sequence'], [['H'], 'Hide everything but the images'],
        [['←', '→'], 'Previous or next image; in Sequence, previous or next version'], [['↑', '↓'], 'Previous or next image (PgUp, PgDn too)'],
        [['+', '−'], 'Zoom'], [['0'], 'Fit'], [['1'], 'Original pixels at 100%'],
      ]],
      ['Window', [[['Ctrl', 'Shift', 'I'], 'Developer tools (for bug reports)'], [['Ctrl', 'Shift', 'R'], 'Reload the window (when nothing is running)']]],
    ];
    const body = groups.map(([g, rows]) => `<div class="kh">${esc(g)}</div>${rows.map(([k, l]) => `<span>${k.map((x) => `<span class="kbd">${esc(x)}</span>`).join('')}</span><span>${esc(l)}</span>`).join('')}`).join('');
    dialog({ title: 'Keyboard shortcuts', ok: 'Close', cancel: '', extra: `<div class="keys">${body}</div>`, wide: true });
  }
  $('#rb-keys').onclick = showKeys;

  function galleryKeys(e, k) {
    const keys = {
      arrowleft: () => gStep(-1), pageup: () => gStep(-1), arrowright: () => gStep(1), pagedown: () => gStep(1),
      home: () => gGo(0), end: () => gGo((st.rows || []).length - 1),
      arrowup: () => gZoom(1.25), arrowdown: () => gZoom(1 / 1.25), '+': () => gZoom(1.25), '=': () => gZoom(1.25), '-': () => gZoom(1 / 1.25),
      0: () => gFit(), 1: () => gZoom(1, true), x: () => gTick(),
    };
    if (!keys[k]) return false;
    e.preventDefault();
    keys[k]();
    return true;
  }
  function batchKeys(e, k) {
    if (e.ctrlKey && k === 'a') { e.preventDefault(); tickAllShown(); return true; }
    if (k === 'enter' && st.focus && st.byPath.has(st.focus)) { openGallery(st.focus); return true; }
    if (k === 'x' && st.focus) { toggleTick(st.focus); st.anchor = st.focus; refreshMarks(); return true; }
    return false;
  }
  function compareKeys(e, k) {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && V.cur) { spaceDown = true; V.holding = true; applyView(); } return true; }
    if (e.target.tagName === 'SELECT') return false;
    const seq = V.mode === 'seq';
    if (k === 'arrowright') { e.preventDefault(); seq ? stepVersion(1) : stepImage(1); }
    else if (k === 'arrowleft') { e.preventDefault(); seq ? stepVersion(-1) : stepImage(-1); }
    else if (k === 'arrowdown' || k === 'pagedown') { e.preventDefault(); stepImage(1); }
    else if (k === 'arrowup' || k === 'pageup') { e.preventDefault(); stepImage(-1); }
    else if (k === '+' || k === '=') zoomCenter(1.25);
    else if (k === '-') zoomCenter(1 / 1.25);
    else if (k === '0') fitView();
    else if (k === '1') zoomOriginalPixels(1);
    else if (k === 'h') setCompareFull(!document.body.classList.contains('cfull'));
    else if (k === 'q') setMode('hold');
    else if (k === 'w') setMode('split');
    else if (k === 'e') setMode('side');
    else if (k === 'r') setMode('seq');
    else if (['2', '3', '4'].includes(k)) go(['batch', 'compare', 'engine', 'appearance'][+k - 1]);
    else return false;
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (dialogOpen) {
      if (e.key === 'Escape') dialogOpen({ ok: false });
      if (e.key === 'Enter' && !e.target.closest('#dlg-no')) $('#dlg-ok')?.click();
      return;
    }
    if (e.key === 'F11') { e.preventDefault(); toggleFull(); return; }
    if (typing(e)) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (!$('#b-pop').hidden) { $('#b-pop').hidden = true; return; }
      if (document.body.classList.contains('gfull')) { setGalleryFull(false); return; }
      if (document.body.classList.contains('cfull')) { setCompareFull(false); return; }
      if (ui.fullScreen) { setFull(false); return; }
      if (ui.logOpen) { setLog(false); return; }
      return;
    }
    if (e.ctrlKey && k !== 'a') return;
    if (k === 'k' || e.key === '?') { showKeys(); return; }
    if (k === 'l') { setLog(!ui.logOpen); return; }
    if (k === 'f' && !e.altKey) { e.preventDefault(); toggleFull(); return; }
    const gallery = ui.screen === 'batch' && st.view === 'gallery';
    if (gallery && galleryKeys(e, k)) return;
    if (ui.screen === 'compare') { compareKeys(e, k); return; }
    if (ui.screen === 'batch' && !gallery && batchKeys(e, k)) return;
    if (!e.altKey && ['1', '2', '3', '4'].includes(k) && !gallery) go(['batch', 'compare', 'engine', 'appearance'][+k - 1]);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceDown) { spaceDown = false; V.holding = false; applyView(); }
  });
  // A select keeps keyboard focus after a change; hand it back so Space and arrows work on the image again.
  $('#c-settings').addEventListener('change', () => setTimeout(() => stage.focus({ preventScroll: true }), 0));

  /* =====================================================================================
     start
     ===================================================================================== */
  async function init() {
    paintIcons();
    await loadAppearance();
    try {
      const s = await api.getSettings();
      $('#e-py').value = s.python || '';
      $('#e-nunif').value = s.nunifPath || '';
      ui.gpuSetting = s.gpu == null ? 'auto' : s.gpu;
    } catch (_) { /* defaults */ }
    await refreshAppInfo();
    await loadFolders();
    buildPanes();
    renderVersions();
    renderStatus();
    const start = store.get('w2x-screen', 'batch');
    go(!engineReady() ? 'batch' : ['batch', 'compare', 'engine', 'appearance'].includes(start) ? start : 'batch');
    window.__appReady = true;
  }
  init();
})();
