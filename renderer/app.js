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
  function dialog({ title, body = '', ok = 'OK', cancel = 'Cancel', danger = false, input = null, extra = '' }) {
    return new Promise((resolve) => {
      const box = $('#dialog');
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
  const task = { kind: null, label: '', name: '', done: 0, total: null, unit: 'items', state: 'idle', message: '', start: 0, firstDone: 0, lastDone: null, lastChange: 0, endAt: 0 };

  function setTask(kind, p) {
    const now = Date.now();
    const restart = task.kind !== kind || task.label !== p.label || task.state !== 'running' || (p.done != null && task.lastDone != null && p.done < task.lastDone);
    if (restart && (p.state || 'running') === 'running') {
      Object.assign(task, { kind, label: p.label, start: now, firstDone: p.done || 0, lastDone: null, lastChange: now, endAt: 0 });
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
    $('#s-stop').hidden = !(task.kind === 'job' && task.state === 'running');
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
  const st = {
    folder: store.get('w2x-folder', null),
    recursive: !!store.get('w2x-recursive', false),
    items: [],
    ticked: new Set(),
    lastTick: null,
    filter: 'all',
    jobId: null,
    jobItems: new Set(),
    jobDone: new Set(),
    jobFailed: new Set(),
    jobCurrent: null,
    jobSettings: null,
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
    ui.screen = screen;
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 's-' + screen));
    $$('.rb[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === screen));
    store.set('w2x-screen', screen);
    if (screen === 'compare') { renderCompareList(); renderVersions(); requestAnimationFrame(fitView); }
    if (screen === 'engine') renderEngine();
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
     BATCH
     ===================================================================================== */
  const batchRead = buildSettings($('#b-settings'), 'w2x-batch-settings', () => renderBatch());
  $('#b-recursive').checked = st.recursive;

  async function chooseFolder() {
    const f = await api.pickFolder();
    if (!f) return;
    st.folder = f;
    store.set('w2x-folder', f);
    st.ticked.clear();
    await loadFolder();
  }
  $('#b-browse').onclick = chooseFolder;
  $('#b-folder').onclick = chooseFolder;
  $('#c-folder').onclick = chooseFolder;
  $('#b-recursive').onchange = (e) => { st.recursive = e.target.checked; store.set('w2x-recursive', st.recursive); loadFolder(); };

  async function loadFolder() {
    if (!st.folder) { st.items = []; renderBatch(); renderCompareList(); return; }
    try {
      const all = await api.scan(st.folder, st.recursive);
      st.items = all.filter((i) => !i.isVariant);
    } catch (e) {
      st.items = [];
      toast(`Couldn't read the folder: ${e.message}`, 'err');
    }
    const paths = new Set(st.items.map((i) => i.path));
    for (const p of [...st.ticked]) if (!paths.has(p)) st.ticked.delete(p);
    renderBatch();
    renderCompareList();
  }

  function rowStatus(it, tag) {
    if (st.jobId && st.jobItems.has(it.path)) {
      if (st.jobFailed.has(it.path)) return `<span class="st bad">${svg('alert')}Failed</span>`;
      if (st.jobDone.has(it.path)) return `<span class="st ok">${svg('check')}Done</span>`;
      if (st.jobCurrent === it.path) return '<span class="st run"><span class="mini"><i></i></span>Upscaling</span>';
      return '<span class="st wait">Queued</span>';
    }
    if (it.variantTags.includes(tag)) return `<span class="st ok">${svg('check')}Done</span>`;
    if (it.variantTags.length) return '<span class="st wait" title="Has versions made with other settings">Other settings</span>';
    return '<span class="st wait">Not done</span>';
  }
  function filteredItems(tag) {
    return st.items.filter((it) => st.filter === 'all' || (st.filter === 'done' ? it.variantTags.includes(tag) : !it.variantTags.includes(tag)));
  }
  const dimText = (it, factor = 1) => { const d = dims.get(it.url); return d ? `${d.w * factor} × ${d.h * factor}` : '…'; };

  function renderBatch() {
    const s = batchRead();
    const tag = P.tagFor(s);
    const factor = P.SCALE_FACTOR[s.scale];
    const doneN = st.items.filter((i) => i.variantTags.includes(tag)).length;
    const rows = filteredItems(tag);
    $('#b-folder').innerHTML = st.folder ? esc(st.folder) : '<span class="ph">Choose a folder of images</span>';
    $('#b-folder').title = st.folder || 'Choose a folder';
    $('#b-filter').innerHTML = [['all', 'All', st.items.length], ['todo', 'Not done', st.items.length - doneN], ['done', 'Done', doneN]]
      .map(([k, l, n]) => `<button data-f="${k}" class="${st.filter === k ? 'on' : ''}" role="tab" aria-selected="${st.filter === k}">${l}<span class="n">${n}</span></button>`).join('');
    $('#b-rows').innerHTML = rows.map((it) => {
      const on = st.ticked.has(it.path);
      const cls = [on ? 'ticked' : '', st.jobCurrent === it.path ? 'current' : ''].join(' ');
      return `<tr class="${cls}" data-p="${esc(it.path)}"><td><input type="checkbox"${on ? ' checked' : ''} aria-label="Tick ${esc(it.name)}"></td>
        <td title="${esc(it.path)}"><img class="thumb" loading="lazy" decoding="async" src="${esc(it.url)}" alt="">${esc(it.name)}</td>
        <td class="muted c-size">${dimText(it)}</td><td class="muted c-out">${factor === 1 ? 'same size' : '→ ' + dimText(it, factor)}</td>
        <td class="muted">${it.variantTags.length || '–'}</td><td class="c-st">${rowStatus(it, tag)}</td></tr>`;
    }).join('');
    // fill in sizes as thumbnails load
    $$('#b-rows tr').forEach((tr) => {
      const it = itemByPath(tr.dataset.p);
      if (!it || dims.has(it.url)) return;
      getDims(it.url).then(() => { if (tr.isConnected) { $('.c-size', tr).textContent = dimText(it); $('.c-out', tr).textContent = factor === 1 ? 'same size' : '→ ' + dimText(it, factor); } });
    });
    const t = st.ticked.size;
    $('#b-sum').innerHTML = st.folder ? `<b>${st.items.length} image${st.items.length === 1 ? '' : 's'}</b> · ${t} ticked · ${doneN} already done with these settings` : '';
    $('#b-run-t').textContent = st.jobId ? 'Upscaling…' : t ? `Upscale ${t} image${t === 1 ? '' : 's'}` : 'Upscale all';
    $('#b-run').disabled = !engineReady() || !!st.jobId || !st.items.length;
    $('#b-run').title = !engineReady() ? 'Install the engine first' : '';
    $('#b-stop').hidden = !st.jobId;
    $('#b-all').disabled = $('#b-none').disabled = !rows.length;
    const head = $('#b-headchk');
    const tickedShown = rows.filter((it) => st.ticked.has(it.path)).length;
    head.checked = rows.length > 0 && tickedShown === rows.length;
    head.indeterminate = tickedShown > 0 && tickedShown < rows.length;
    const empty = $('#b-empty');
    if (!st.folder) empty.innerHTML = `${svg('folder')}<div>Choose a folder of images to upscale.</div><button class="btn primary" id="b-empty-browse">${svg('folder')}Choose folder</button>`;
    else if (!st.items.length) empty.innerHTML = `${svg('image')}<div>No images in this folder${st.recursive ? ' or its subfolders' : ''}.<br><span class="faint">PNG, JPG, WebP and BMP files are listed.</span></div>`;
    else if (!rows.length) empty.innerHTML = `${svg('check')}<div>${st.filter === 'done' ? 'Nothing is done with these settings yet.' : 'Everything here is done with these settings.'}</div>`;
    else empty.innerHTML = '';
    $('#b-empty-browse')?.addEventListener('click', chooseFolder);
    $('#b-hint').hidden = !rows.length;
  }
  function updateBatchStatuses() {
    const tag = P.tagFor(batchRead());
    $$('#b-rows tr').forEach((tr) => {
      const it = itemByPath(tr.dataset.p);
      if (!it) return;
      $('.c-st', tr).innerHTML = rowStatus(it, tag);
      tr.classList.toggle('current', st.jobCurrent === it.path);
    });
  }
  const itemByPath = (p) => st.items.find((i) => i.path === p);

  $('#b-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    st.filter = b.dataset.f;
    renderBatch();
  });
  $('#b-rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const p = tr.dataset.p;
    const order = $$('#b-rows tr').map((r) => r.dataset.p);
    const turnOn = !st.ticked.has(p);
    if (e.shiftKey && st.lastTick && order.includes(st.lastTick)) {
      const [a, b] = [order.indexOf(st.lastTick), order.indexOf(p)].sort((x, y) => x - y);
      for (const q of order.slice(a, b + 1)) turnOn ? st.ticked.add(q) : st.ticked.delete(q);
      window.getSelection()?.removeAllRanges();
    } else if (turnOn) st.ticked.add(p);
    else st.ticked.delete(p);
    st.lastTick = p;
    renderBatch();
  });
  $('#b-rows').addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (tr) { go('compare'); openImage(tr.dataset.p); }
  });
  $('#b-headchk').onchange = (e) => {
    const rows = filteredItems(P.tagFor(batchRead()));
    rows.forEach((it) => (e.target.checked ? st.ticked.add(it.path) : st.ticked.delete(it.path)));
    renderBatch();
  };
  $('#b-all').onclick = () => { filteredItems(P.tagFor(batchRead())).forEach((it) => st.ticked.add(it.path)); renderBatch(); };
  $('#b-none').onclick = () => { st.ticked.clear(); renderBatch(); };

  $('#b-run').onclick = async () => {
    if (st.jobId) return;
    let items = st.items.filter((i) => st.ticked.has(i.path)).map((i) => i.path);
    if (!items.length) {
      const r = await dialog({ title: `Upscale all ${st.items.length} images?`, body: 'Nothing is ticked. Images already done with these settings are skipped.', ok: `Upscale ${st.items.length}` });
      if (!r.ok) return;
      items = st.items.map((i) => i.path);
    }
    startJob(items, batchRead());
  };
  const stopJob = () => st.jobId && api.cancelJob(st.jobId);
  $('#b-stop').onclick = stopJob;
  $('#s-stop').onclick = stopJob;
  $('#s-review').onclick = () => { go('compare'); if (ui.lastMade && ui.lastMade[0]) openImage(ui.lastMade[0]); };

  async function startJob(items, settings) {
    if (!engineReady()) { go('engine'); toast('Install the engine first.', 'info'); return; }
    try {
      P.chooseMethod(P.NOISE_LEVEL[settings.noise], P.SCALE_FACTOR[settings.scale]);
    } catch (e) { toast(e.message, 'err'); return; }
    try {
      const { jobId } = await api.startJob(items, settings);
      Object.assign(st, { jobId, jobItems: new Set(items), jobDone: new Set(), jobFailed: new Set(), jobCurrent: null, jobSettings: settings });
      ui.lastMade = null;
      log(`Batch started: ${items.length} image${items.length === 1 ? '' : 's'} · ${settingsText(settings)}`);
      setTask('job', { label: `Upscaling 0 of ${items.length}`, name: settingsText(settings), done: 0, total: items.length, unit: 'images' });
      renderBatch();
      renderCompareButtons();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  api.onJob((ev) => {
    if (ev.jobId !== st.jobId) return;
    if (ev.doneFiles) st.jobDone = new Set(ev.doneFiles);
    if (ev.failedFiles) st.jobFailed = new Set(ev.failedFiles);
    if ('current' in ev) st.jobCurrent = ev.current;
    if (ev.message) log(ev.message, ev.error ? 'e' : '');
    if (ev.error) setLog(true);
    if (!ev.finished) {
      const cur = st.jobCurrent ? baseName(st.jobCurrent) : '';
      setTask('job', { label: `Upscaling ${Math.min(ev.total, ev.processed + 1)} of ${ev.total}`, name: [cur, settingsText(st.jobSettings)].filter(Boolean).join(' · '), done: ev.processed, total: ev.total, unit: 'images' });
      updateBatchStatuses();
      return;
    }
    const made = [...st.jobDone].filter((p) => !st.jobFailed.has(p));
    ui.lastMade = made;
    ui.lastSummary = ev.message;
    log(ev.message, ev.failed ? 'e' : 'o');
    setTask('job', { label: 'Upscaling', done: ev.total, total: ev.total, unit: 'images', state: ev.failed && !ev.made ? 'error' : 'done', message: ev.message });
    const wasCompare = V.cur && st.jobItems.has(V.cur);
    Object.assign(st, { jobId: null, jobCurrent: null });
    loadFolder().then(() => { if (wasCompare) openImage(V.cur, { keepView: true, newest: true }); });
    renderCompareButtons();
    if (ev.failed) toast(`${ev.failed} image${ev.failed === 1 ? '' : 's'} failed. The log has details.`, 'err', 7000);
  });

  /* =====================================================================================
     COMPARE
     ===================================================================================== */
  const rerunRead = buildSettings($('#c-settings'), 'w2x-rerun-settings', null, { tile: false, tileFrom: () => batchRead() });
  const V = { cur: null, variants: [], curId: 'orig', eyes: new Set(['orig']), mode: store.get('w2x-mode', 'split'), filter: 'all', view: { s: 1, x: 0, y: 0 }, base: { w: 1, h: 1 }, orig: { w: 1, h: 1 }, split: 0.5, holding: false, drag: null };

  function renderCompareList() {
    const has = st.items.filter((i) => i.variantTags.length).length;
    $('#c-folder-name').textContent = st.folder ? baseName(st.folder) : 'Choose a folder';
    $('#c-folder-path').textContent = st.folder || '';
    $('#c-filter').innerHTML = [['all', 'All', st.items.length], ['has', 'Has versions', has]]
      .map(([k, l, n]) => `<button class="pill${V.filter === k ? ' on' : ''}" data-f="${k}">${l} ${n}</button>`).join('');
    const rows = st.items.filter((i) => V.filter === 'all' || i.variantTags.length);
    $('#c-list').innerHTML = rows.map((it) => {
      const v = it.variantTags.length;
      return `<div class="irow${it.path === V.cur ? ' on' : ''}" data-p="${esc(it.path)}" title="${esc(it.path)}"><img loading="lazy" decoding="async" src="${esc(it.url)}" alt="">
        <div class="t"><b>${esc(it.name)}</b><span><span class="c-dim">${dimText(it)}</span>${v ? ` · ${v} version${v === 1 ? '' : 's'}` : ''}</span></div></div>`;
    }).join('') || `<div class="faint" style="padding:12px">${st.folder ? 'No images match.' : 'Choose a folder to see its images.'}</div>`;
    $$('#c-list .irow').forEach((row) => {
      const it = itemByPath(row.dataset.p);
      if (it && !dims.has(it.url)) getDims(it.url).then(() => { if (row.isConnected) $('.c-dim', row).textContent = dimText(it); });
    });
    renderCompareButtons();
  }
  $('#c-filter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { V.filter = b.dataset.f; renderCompareList(); } });
  $('#c-list').addEventListener('click', (e) => { const r = e.target.closest('.irow'); if (r) openImage(r.dataset.p); });

  function renderCompareButtons() {
    $('#c-rerun').disabled = !V.cur || !!st.jobId || !engineReady();
    $('#c-rerun').title = !engineReady() ? 'Install the engine first' : !V.cur ? 'Choose an image first' : '';
    $('#c-show').disabled = !V.cur;
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
  function versionsAll() {
    const it = itemByPath(V.cur);
    if (!it) return [];
    return [{ id: 'orig', title: 'Original', meta: `${V.orig.w} × ${V.orig.h}`, url: it.url, orig: true, path: it.path },
      ...V.variants.map((v) => ({ id: v.id, title: versionTitle(v), meta: `${optLabel('style', v.settings.style)} · ${v.size ? `${v.size.w} × ${v.size.h}` : ''} · ${age(v.createdAt)}`, url: v.url, path: v.output, label: settingsText(v.settings) }))];
  }
  const curVersion = () => versionsAll().find((v) => v.id === V.curId) || versionsAll()[0];

  async function openImage(path, { keepView = false, newest = false } = {}) {
    const it = itemByPath(path);
    if (!it) return;
    const prev = V.cur;
    V.cur = path;
    try { V.variants = (await api.listVariants(path)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); } catch (_) { V.variants = []; }
    if (prev !== path || newest || !V.variants.some((v) => v.id === V.curId)) {
      V.curId = V.variants.length ? V.variants[V.variants.length - 1].id : 'orig';
      V.eyes = new Set(['orig', V.curId]);
    }
    V.orig = await getDims(it.url);
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
    host.innerHTML = versionsAll().map((v) => `<div class="ver${v.id === V.curId ? ' cur' : ''}" data-v="${v.id}" title="${esc(v.orig ? 'The original image' : 'Click to show this version in Hold and Split')}">
        <img src="${esc(v.url)}" alt=""${v.orig ? ' style="image-rendering:pixelated"' : ''}><div class="t"><b>${esc(v.title)}</b><span>${esc(v.meta)}</span></div>
        <button class="vb${V.eyes.has(v.id) ? ' on' : ''}" data-eye="${v.id}" title="${V.eyes.has(v.id) ? 'Shown' : 'Not shown'} in Side by side" aria-label="Toggle in side by side">${svg(V.eyes.has(v.id) ? 'eye' : 'eyeoff')}</button>
        ${v.orig ? '' : `<button class="vb rm" data-rm="${v.id}" title="Remove from this list (the file stays)" aria-label="Remove version">${svg('x')}</button>`}</div>`).join('')
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
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      e.stopPropagation();
      const r = await dialog({ title: 'Remove this version from the list?', body: 'The image file stays on disk; only the app forgets it.', ok: 'Remove', danger: true });
      if (!r.ok) return;
      await api.removeVariant(rm.dataset.rm);
      await loadFolder();
      openImage(V.cur, { keepView: true });
      return;
    }
    const card = e.target.closest('.ver[data-v]');
    if (card) {
      V.curId = card.dataset.v;
      V.eyes.add(V.curId);
      const cv = curVersion();
      const nb = cv.orig ? V.orig : await getDims(cv.url);
      const changed = nb.w !== V.base.w;
      V.base = nb;
      renderVersions();
      buildPanes();
      changed ? fitView() : applyView();
    }
  });

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
      empty.innerHTML = st.items.length ? `${svg('compare')}<div>Choose an image on the left to compare its versions.</div>` : `${svg('folder')}<div>Choose a folder first.</div><button class="btn primary" id="c-empty-browse">${svg('folder')}Choose folder</button>`;
      $('#c-empty-browse')?.addEventListener('click', chooseFolder);
      return;
    }
    empty.innerHTML = '';
    const all = versionsAll();
    const orig = all[0];
    const cur = curVersion();
    let panes;
    if (V.mode === 'side') {
      const shown = all.filter((v) => V.eyes.has(v.id));
      panes = (shown.length ? shown : [orig]).map((v) => ({ main: v, label: v.orig ? 'Original' : v.label }));
    } else panes = [{ main: cur, label: cur.orig ? 'Original' : cur.label }];
    const cols = panes.length <= 3 ? panes.length : Math.ceil(Math.sqrt(panes.length));
    host.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    host.style.gridTemplateRows = `repeat(${Math.ceil(panes.length / cols)}, minmax(0, 1fr))`;
    host.innerHTML = panes.map((p) => {
      const showSeam = V.mode === 'split' && !p.main.orig;
      return `<div class="pane"><div class="world"><img class="o" src="${esc(orig.url)}" alt="" draggable="false">${p.main.orig ? '' : `<img class="u" src="${esc(p.main.url)}" alt="" draggable="false">`}</div>
        ${showSeam ? `<div class="seam" data-seam><div class="grip">${svg('split')}</div></div>` : ''}
        ${V.mode === 'split' && !p.main.orig ? `<span class="corner l">Original</span><span class="corner r">${esc(p.label)}</span>` : `<span class="corner ${V.mode === 'side' ? 'l' : 'r'} lab">${esc(p.label)}</span>`}
        <span class="corner hold" hidden>Original</span></div>`;
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
        if (V.holding) { up.style.display = 'none'; up.style.clipPath = ''; }
        else { up.style.display = ''; up.style.clipPath = V.mode === 'split' ? `inset(0 0 0 ${V.split * 100}%)` : ''; }
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
    if (note) note.innerHTML = `${Math.round(shown * 100)}% · ${V.mode === 'split' ? 'drag the seam · ' : ''}scroll to zoom · drag to pan · hold <span class="kbd">Space</span> for the original`;
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
  $('#c-rerun').onclick = () => { if (V.cur) startJob([V.cur], rerunRead()); };
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
    if (e.button === 0 && V.mode === 'hold') { V.holding = true; applyView(); e.preventDefault(); return; }
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
    const rows = $$('#c-list .irow');
    const i = rows.findIndex((r) => r.dataset.p === V.cur);
    const n = rows[Math.max(0, Math.min(rows.length - 1, (i < 0 ? 0 : i + d)))];
    if (n) openImage(n.dataset.p, { keepView: false });
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
        ? (e.cuda ? `Installed and tested. Upscaling runs on ${e.gpu} with PyTorch ${e.torch}.` : 'Installed and tested, but PyTorch cannot use the GPU, so upscaling runs on the CPU and is much slower. Updating the NVIDIA driver and reinstalling usually fixes this.')
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
    $('#e-install').disabled = eng.installing || !!st.jobId;
    $('#e-install').classList.toggle('primary', !eng.installed);
    $('#e-check').disabled = eng.installing;
    $('#e-prog').hidden = !(eng.installing || eng.ran);
    $('#e-datadir').textContent = info.dataDir || '';
    $('#e-logfile').textContent = info.logFile || '';
    $('#e-missing').hidden = !info.missingDataDir;
    if (info.missingDataDir) $('#e-missing').textContent = `The data folder ${info.missingDataDir} isn't available (is the external drive connected?). Using the default folder for now.`;
    renderEngineProgress();
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
    await api.installEngine();
  };
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
    try { await api.resetAppData(); await loadFolder(); toast('App data reset', 'ok'); } catch (e) { toast(e.message, 'err'); }
  };
  $('#e-nunif-browse').onclick = async () => { const f = await api.pickFolder(); if (f) $('#e-nunif').value = f; };
  $('#e-save-adv').onclick = async () => {
    await api.setSettings({ python: $('#e-py').value.trim() || 'python', nunifPath: $('#e-nunif').value.trim() });
    toast('Paths saved. Use Check engine to test them.', 'ok');
  };

  api.onTaskProgress((ev) => {
    if (ev.log) log(ev.log);
    if (ev.task === 'move') {
      if (ev.label) setTask('move', { label: 'Moving app data', name: ev.label, done: ev.done, total: ev.total, unit: ev.unit });
      return;
    }
    if (ev.task !== 'engine' && !ev.label) return;
    if (ev.stepId) eng.step = ev.stepId;
    if (ev.state === 'done') {
      eng.installing = false; eng.error = false; eng.lastMessage = ev.message;
      setTask('engine', { label: 'Installing engine', done: 1, total: 1, state: 'done', message: ev.message });
      log(ev.message, 'o');
      toast(ev.message, 'ok', 7000);
      refreshAppInfo();
      return;
    }
    if (ev.state === 'error') {
      eng.installing = false; eng.error = true; eng.lastMessage = ev.message;
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
  const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range';
  function showKeys() {
    const rows = [
      [['1'], 'Batch'], [['2'], 'Compare'], [['3'], 'Engine'], [['4'], 'Appearance'], [['L'], 'Open or close the log'],
      [['Space'], 'Compare: hold to see the original'], [['Left mouse'], 'Compare, Hold mode: hold to see the original'],
      [['H', 'S', 'C'], 'Compare: Hold, Split, Side by side'], [['←', '→'], 'Compare: previous or next image'],
      [['+', '−'], 'Compare: zoom'], [['0'], 'Compare: fit'], [['Shift', 'click'], 'Batch: tick a range'], [['Double-click'], 'Batch: open the image in Compare'],
      [['Esc'], 'Close a dialog or the log'],
    ];
    dialog({ title: 'Keyboard shortcuts', ok: 'Close', cancel: '', extra: `<div class="keys">${rows.map(([k, l]) => `<span>${k.map((x) => `<span class="kbd">${esc(x)}</span>`).join('')}</span><span>${esc(l)}</span>`).join('')}</div>` });
  }
  $('#rb-keys').onclick = showKeys;
  window.addEventListener('keydown', (e) => {
    if (dialogOpen) {
      if (e.key === 'Escape') dialogOpen({ ok: false });
      if (e.key === 'Enter') $('#dlg-ok')?.click();
      return;
    }
    if (typing(e)) return;
    if (e.key === 'Escape' && ui.logOpen) { setLog(false); return; }
    if (e.key === '?') { showKeys(); return; }
    if (e.key === 'l' || e.key === 'L') { setLog(!ui.logOpen); return; }
    if (!e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(e.key) && ui.screen !== 'compare') { go(['batch', 'compare', 'engine', 'appearance'][+e.key - 1]); return; }
    if (ui.screen !== 'compare') return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && V.cur) { spaceDown = true; V.holding = true; applyView(); } return; }
    if (e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'arrowright' || k === 'arrowdown') { e.preventDefault(); stepImage(1); }
    else if (k === 'arrowleft' || k === 'arrowup') { e.preventDefault(); stepImage(-1); }
    else if (k === '+' || k === '=') zoomCenter(1.25);
    else if (k === '-') zoomCenter(1 / 1.25);
    else if (k === '0') fitView();
    else if (k === '1') zoomOriginalPixels(1);
    else if (k === 'h') setMode('hold');
    else if (k === 's') setMode('split');
    else if (k === 'c') setMode('side');
    else if (['2', '3', '4'].includes(k)) go(['batch', 'compare', 'engine', 'appearance'][+k - 1]);
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
    } catch (_) { /* defaults */ }
    await refreshAppInfo();
    await loadFolder();
    buildPanes();
    renderVersions();
    renderStatus();
    const start = store.get('w2x-screen', 'batch');
    go(!engineReady() ? 'batch' : ['batch', 'compare', 'engine', 'appearance'].includes(start) ? start : 'batch');
  }
  init();
})();
