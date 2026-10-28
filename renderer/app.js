(() => {
  'use strict';
  const api = window.api;
  const P = window.Presets;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const img = (url) => {
    const i = document.createElement('img');
    i.src = url;
    i.draggable = false;
    return i;
  };

  const LAB = {
    style: [['artwork', 'Artwork'], ['artwork_scan', 'Artwork/Scans'], ['photo', 'Photo']],
    noise: [['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['highest', 'Highest']],
    scale: [['none', 'None'], ['2x', '2x'], ['4x', '4x']],
  };
  const lbl = (list, key) => (list.find(([v]) => v === key) || [key, key])[1];
  const labelOf = (v) => {
    const s = v.settings || {};
    return `${lbl(LAB.style, s.style)} · noise ${lbl(LAB.noise, s.noise)} · ${lbl(LAB.scale, s.scale)}${s.tta ? ' · TTA' : ''}`;
  };

  const LS_KEY = 'w2x-settings';
  const loadSaved = () => {
    try {
      return P.normalize(JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
    } catch (_) {
      return P.normalize({});
    }
  };
  const optionList = (list, selected) =>
    list.map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${l}</option>`).join('');

  // Builds the settings form inside `host`. Returns a function that reads the current settings.
  function buildForm(host, initial, onChange) {
    host.innerHTML = `
      <label>Style<select data-k="style">${optionList(LAB.style, initial.style)}</select></label>
      <label>Noise reduction<select data-k="noise">${optionList(LAB.noise, initial.noise)}</select></label>
      <label>Upscaling<select data-k="scale">${optionList(LAB.scale, initial.scale)}</select></label>
      <label>Tile size<input type="number" data-k="tileSize" min="64" max="1024" step="64" value="${initial.tileSize}"></label>
      <label class="inline"><input type="checkbox" data-k="tta"${initial.tta ? ' checked' : ''}> TTA (slower)</label>
      <p class="hint">Output is PNG, saved next to each source image.</p>`;
    const read = () =>
      P.normalize({
        style: host.querySelector('[data-k=style]').value,
        noise: host.querySelector('[data-k=noise]').value,
        scale: host.querySelector('[data-k=scale]').value,
        tileSize: host.querySelector('[data-k=tileSize]').value,
        tta: host.querySelector('[data-k=tta]').checked,
      });
    host.addEventListener('change', () => {
      const s = read();
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      if (onChange) onChange(s);
    });
    return read;
  }

  // ---------- shared state ----------
  const st = {
    folder: null,
    items: [],
    selected: new Set(),
    jobId: null,
    batchRead: null,
    viewRead: null,
  };

  // ---------- tabs ----------
  function showTab(name) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${name}`));
    if (name === 'viewer' && V.src) fitAndApply();
  }
  document.querySelectorAll('.tab-btn').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

  // ---------- folders and batch ----------
  async function pickFolderAction() {
    const f = await api.pickFolder();
    if (!f) return;
    st.folder = f;
    $('#folderLabel').textContent = f;
    st.selected.clear();
    await loadFolder();
  }
  $('#pickFolder').onclick = pickFolderAction;
  $('#vPick').onclick = async () => {
    await pickFolderAction();
    if (st.items.length) openSource(0);
  };
  $('#recursive').onchange = () => loadFolder();

  async function loadFolder() {
    if (!st.folder) return;
    const all = await api.scan(st.folder, $('#recursive').checked);
    st.items = all.filter((i) => !i.isVariant);
    renderBatch();
    renderSources();
  }

  function renderBatch() {
    const tag = P.tagFor(st.batchRead ? st.batchRead() : P.DEFAULTS);
    const ul = $('#batchList');
    ul.innerHTML = '';
    const frag = document.createDocumentFragment();
    st.items.forEach((it, i) => {
      const li = el('li');
      const done = it.variantTags.includes(tag);
      li.innerHTML = `
        <label class="inline"><input type="checkbox" data-i="${i}"${st.selected.has(it.path) ? ' checked' : ''}>
          <span class="name">${esc(it.name)}</span></label>
        <span>${done ? '<span class="badge ok">done</span> ' : ''}${it.variantTags.length ? `<span class="count">${it.variantTags.length} versions</span>` : ''}</span>`;
      frag.appendChild(li);
    });
    ul.appendChild(frag);
    $('#batchCount').textContent = `${st.items.length} images · ${st.selected.size} selected`;
    $('#selAll').checked = st.items.length > 0 && st.selected.size === st.items.length;
  }

  $('#batchList').addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.dataset.i === undefined) return;
    const it = st.items[+cb.dataset.i];
    if (cb.checked) st.selected.add(it.path);
    else st.selected.delete(it.path);
    renderBatch();
  });
  $('#selAll').onchange = (e) => {
    if (e.target.checked) st.items.forEach((i) => st.selected.add(i.path));
    else st.selected.clear();
    renderBatch();
  };

  $('#runBtn').onclick = async () => {
    if (st.jobId) return;
    let items = [...st.selected];
    if (!items.length) {
      if (!st.items.length) return alert('Choose a folder first.');
      if (!confirm(`Nothing selected. Upscale all ${st.items.length} images?`)) return;
      items = st.items.map((i) => i.path);
    }
    await startJob(items, st.batchRead());
  };
  $('#cancelBtn').onclick = () => st.jobId && api.cancelJob(st.jobId);

  function setRunning(on) {
    $('#runBtn').disabled = on;
    $('#cancelBtn').disabled = !on;
    $('#rerunBtn').disabled = on;
  }

  async function startJob(items, settings) {
    try {
      const { jobId } = await api.startJob(items, settings);
      st.jobId = jobId;
      setRunning(true);
      $('#jobLog').textContent = '';
      $('#progBar').style.width = '0%';
      $('#vStatus').textContent = 'Starting…';
    } catch (e) {
      alert(e.message);
    }
  }

  api.onJob((ev) => {
    const pct = ev.total ? Math.round((100 * ev.processed) / ev.total) : 100;
    $('#progBar').style.width = `${pct}%`;
    $('#vStatus').textContent = ev.finished ? ev.message : `Upscaling ${ev.processed}/${ev.total}`;
    if (ev.message) {
      const log = $('#jobLog');
      log.textContent += ev.message + '\n';
      log.scrollTop = log.scrollHeight;
    }
    if (ev.finished) {
      st.jobId = null;
      setRunning(false);
      afterJob();
    }
  });

  async function afterJob() {
    await loadFolder();
    await reopen();
  }

  async function reopen() {
    if (!V.src) return;
    const i = st.items.findIndex((x) => x.path === V.src.path);
    if (i >= 0) await openSource(i);
  }

  // ---------- viewer state ----------
  const V = {
    idx: -1,
    src: null,
    variants: [],
    current: null,
    compare: new Set(),
    mode: 'hold',
    holding: false,
    split: 0.5,
    view: { s: 1, x: 0, y: 0 },
    base: { w: 1, h: 1 },
    panes: [],
    drag: null,
    dimCache: new Map(),
  };

  function renderSources() {
    const ul = $('#srcList');
    ul.innerHTML = '';
    st.items.forEach((it, i) => {
      const li = el('li');
      li.innerHTML = `<button class="srcbtn${V.idx === i ? ' active' : ''}" data-i="${i}">
        <span class="name">${esc(it.name)}</span>${it.variantTags.length ? `<span class="count">${it.variantTags.length}</span>` : ''}</button>`;
      ul.appendChild(li);
    });
  }
  $('#srcList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) openSource(+b.dataset.i);
  });

  async function openSource(i) {
    if (!st.items[i]) return;
    V.idx = i;
    V.src = st.items[i];
    V.holding = false;
    V.variants = await api.listVariants(V.src.path);
    V.current = V.variants.length ? V.variants[V.variants.length - 1] : null;
    V.compare = new Set(V.current ? [V.current.id] : []);
    renderSources();
    renderVersions();
    await updateBase();
    buildPanes();
    fitAndApply();
    $('#vStatus').textContent = V.variants.length ? '' : 'No upscales yet. Run one below.';
  }

  function step(d) {
    const n = V.idx + d;
    if (n >= 0 && n < st.items.length) openSource(n);
  }

  function dimsOf(url) {
    if (V.dimCache.has(url)) return Promise.resolve(V.dimCache.get(url));
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        const d = { w: im.naturalWidth, h: im.naturalHeight };
        V.dimCache.set(url, d);
        resolve(d);
      };
      im.onerror = () => resolve({ w: 1, h: 1 });
      im.src = url;
    });
  }

  // The world box is the size of the version being shown. Every image is stretched to it, so they line up.
  async function updateBase() {
    const u = V.current || V.src;
    V.base = await dimsOf(u.url);
  }

  function renderVersions() {
    const ul = $('#verList');
    ul.innerHTML = '';
    const orig = el('li', `ver${V.current ? '' : ' cur'}`);
    orig.innerHTML = `<button class="link" data-act="cur" data-id="">Original only</button>`;
    ul.appendChild(orig);
    for (const v of V.variants) {
      const li = el('li', `ver${V.current && V.current.id === v.id ? ' cur' : ''}`);
      li.innerHTML = `
        <input type="checkbox" data-act="cmp" data-id="${v.id}" title="Include in side-by-side"${V.compare.has(v.id) ? ' checked' : ''}>
        <button class="link" data-act="cur" data-id="${v.id}" title="Show in hold / slider view">${esc(labelOf(v))}</button>
        <span class="count">${v.size ? `${v.size.w}×${v.size.h}` : ''}</span>
        <button class="x" data-act="del" data-id="${v.id}" title="Remove from list (file stays on disk)">✕</button>`;
      ul.appendChild(li);
    }
    if (!V.variants.length) ul.appendChild(el('li', 'hint', 'No versions yet.'));
  }

  $('#verList').addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.dataset.act !== 'cmp') return;
    if (cb.checked) V.compare.add(cb.dataset.id);
    else V.compare.delete(cb.dataset.id);
    if (V.mode === 'side') {
      buildPanes();
      fitAndApply();
    }
  });
  $('#verList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === 'cur') {
      V.current = id ? V.variants.find((v) => v.id === id) || null : null;
      renderVersions();
      await updateBase();
      buildPanes();
      fitAndApply();
    } else if (b.dataset.act === 'del') {
      if (!confirm('Remove this version from the list? The image file stays on disk.')) return;
      await api.removeVariant(id);
      await loadFolder();
      await reopen();
    }
  });

  // ---------- panes ----------
  const HINTS = {
    hold: 'Hold left mouse button or Space to see the original; release for the upscaled version. Right-drag to pan, wheel to zoom.',
    slider: 'Drag the handle: original on the left, upscaled on the right. Right-drag to pan, wheel to zoom.',
    side: 'Each pane shows the original or a version ticked in the list. Zoom and pan are linked across all panes.',
  };

  function buildPanes() {
    const host = $('#panes');
    host.innerHTML = '';
    V.panes = [];
    if (!V.src) return;

    let specs;
    if (V.mode === 'side') {
      specs = [{ label: 'Original', orig: V.src.url }];
      for (const v of V.variants) if (V.compare.has(v.id)) specs.push({ label: labelOf(v), up: v.url });
    } else {
      specs = [{
        label: V.mode === 'slider' ? 'Original | Upscaled' : (V.current ? 'Hold: original' : 'Original'),
        orig: V.src.url,
        up: V.current ? V.current.url : null,
      }];
    }

    const n = specs.length;
    const cols = n <= 2 ? n : Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    host.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    host.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (const sp of specs) {
      const pane = el('div', 'pane');
      const world = el('div', 'world');
      world.style.width = `${V.base.w}px`;
      world.style.height = `${V.base.h}px`;
      const entry = { pane, world, orig: null, up: null, divider: null, mode: V.mode };
      if (sp.orig) {
        entry.orig = img(sp.orig);
        world.appendChild(entry.orig);
      }
      if (sp.up) {
        entry.up = img(sp.up);
        world.appendChild(entry.up);
      }
      pane.appendChild(world);
      if (V.mode === 'slider' && entry.up) {
        entry.divider = el('div', 'divider');
        entry.divider.appendChild(el('span'));
        pane.appendChild(entry.divider);
      }
      pane.appendChild(el('div', 'pane-label', sp.label));
      host.appendChild(pane);
      V.panes.push(entry);
    }
    updateHoldDisplay();
    $('#vHint').textContent = HINTS[V.mode];
  }

  function updateHoldDisplay() {
    for (const e of V.panes) {
      if (e.mode === 'hold' && e.up && e.orig) {
        e.orig.style.display = V.holding ? '' : 'none';
        e.up.style.display = V.holding ? 'none' : '';
      } else {
        if (e.orig) e.orig.style.display = '';
        if (e.up) e.up.style.display = '';
      }
    }
    $('#holdBadge').classList.toggle('on', V.holding && V.mode === 'hold');
  }

  function applyView() {
    const { s, x, y } = V.view;
    for (const e of V.panes) {
      e.world.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      e.world.classList.toggle('pixel', s >= 2);
      if (e.up && e.mode === 'slider') e.up.style.clipPath = `inset(0 0 0 ${V.split * 100}%)`;
      if (e.divider) e.divider.style.left = `${x + V.split * V.base.w * s}px`;
    }
    $('#zoomLabel').textContent = `${Math.round(s * 100)}%`;
  }

  function fitAndApply() {
    requestAnimationFrame(() => {
      const p = V.panes[0] && V.panes[0].pane;
      if (!p || !p.clientWidth) return;
      const pw = p.clientWidth;
      const ph = p.clientHeight;
      const s = Math.min(pw / V.base.w, ph / V.base.h) * 0.96;
      V.view = { s, x: (pw - V.base.w * s) / 2, y: (ph - V.base.h * s) / 2 };
      applyView();
    });
  }

  // Zoom around a point given in pane coordinates.
  function zoomAt(cx, cy, factor) {
    const v = V.view;
    const ns = Math.min(24, Math.max(0.05, v.s * factor));
    const wx = (cx - v.x) / v.s;
    const wy = (cy - v.y) / v.s;
    V.view = { s: ns, x: cx - wx * ns, y: cy - wy * ns };
    applyView();
  }

  function zoomCenter(factor) {
    const p = V.panes[0] && V.panes[0].pane;
    if (!p) return;
    zoomAt(p.clientWidth / 2, p.clientHeight / 2, factor);
  }

  function setMode(m) {
    V.mode = m;
    V.holding = false;
    document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    buildPanes();
    fitAndApply();
  }
  $('#modes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) setMode(b.dataset.mode);
  });

  $('#zIn').onclick = () => zoomCenter(1.25);
  $('#zOut').onclick = () => zoomCenter(1 / 1.25);
  $('#zFit').onclick = () => fitAndApply();
  $('#z1').onclick = () => {
    const p = V.panes[0] && V.panes[0].pane;
    if (p) zoomAt(p.clientWidth / 2, p.clientHeight / 2, 1 / V.view.s);
  };

  // ---------- mouse ----------
  const stage = $('#stage');
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('wheel', (e) => {
    if (!V.src) return;
    e.preventDefault();
    const pane = e.target.closest('.pane');
    if (!pane) return;
    const r = pane.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  stage.addEventListener('mousedown', (e) => {
    if (!V.src) return;
    if (e.button === 0) {
      const divider = e.target.closest('.divider');
      if (divider) {
        V.drag = { split: true, pane: divider.closest('.pane') };
        e.preventDefault();
        return;
      }
      if (V.mode === 'hold' && V.current) {
        V.holding = true;
        updateHoldDisplay();
      }
      return;
    }
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      V.drag = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!V.drag) return;
    if (V.drag.split) {
      const r = V.drag.pane.getBoundingClientRect();
      const sx = e.clientX - r.left;
      V.split = Math.min(1, Math.max(0, (sx - V.view.x) / (V.base.w * V.view.s)));
      applyView();
      return;
    }
    V.view.x += e.clientX - V.drag.x;
    V.view.y += e.clientY - V.drag.y;
    V.drag.x = e.clientX;
    V.drag.y = e.clientY;
    applyView();
  });

  function endDrag() {
    V.drag = null;
    if (V.holding) {
      V.holding = false;
      updateHoldDisplay();
    }
  }
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('blur', endDrag);
  window.addEventListener('resize', () => V.src && fitAndApply());

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (!$('#tab-viewer').classList.contains('active')) return;
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat && V.mode === 'hold' && V.current) {
        V.holding = true;
        updateHoldDisplay();
      }
      return;
    }
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === '+' || e.key === '=') zoomCenter(1.25);
    else if (e.key === '-') zoomCenter(1 / 1.25);
    else if (e.key === '0') fitAndApply();
    else if (e.key === '1') $('#z1').click();
    else if (e.key === 'h') setMode('hold');
    else if (e.key === 's') setMode('slider');
    else if (e.key === 'c') setMode('side');
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && V.holding) {
      V.holding = false;
      updateHoldDisplay();
    }
  });

  // ---------- viewer re-run ----------
  $('#rerunBtn').onclick = () => {
    if (!V.src || st.jobId) return;
    startJob([V.src.path], st.viewRead());
  };

  // ---------- setup ----------
  $('#saveSetup').onclick = async () => {
    await api.setSettings({
      python: $('#pyPath').value.trim() || 'python',
      nunifPath: $('#nunifPath').value.trim(),
    });
    $('#setupLog').textContent = 'Saved.\n';
  };
  $('#pickNunif').onclick = async () => {
    const f = await api.pickFolder();
    if (f) $('#nunifPath').value = f;
  };
  $('#checkSetup').onclick = async () => {
    $('#setupLog').textContent = 'Checking…\n';
    const r = await api.checkSetup();
    $('#setupLog').textContent = (r.ok ? 'OK\n' : 'Problem found\n') + r.output;
  };
  $('#installEngine').onclick = async () => {
    $('#setupLog').textContent = '';
    $('#installEngine').disabled = true;
    try {
      await api.installEngine();
    } finally {
      $('#installEngine').disabled = false;
      refreshEngineStatus();
    }
  };
  $('#resetApp').onclick = async () => {
    if (!confirm('Clear the version list and settings? Your images and the engine are kept.')) return;
    try {
      await api.resetAppData();
      $('#setupLog').textContent = 'App data cleared.\n';
      st.items.forEach((i) => (i.variantTags = []));
      V.variants = [];
      renderBatch();
      renderSources();
    } catch (e) {
      alert(e.message);
    }
  };
  async function refreshEngineStatus() {
    const info = await api.appInfo();
    $('#dataDir').textContent = `Data folder: ${info.dataDir}`;
    $('#engineStatus').textContent = info.engineInstalled
      ? 'Installed. Ready to upscale.'
      : 'Not installed yet. Click "Install engine" once to set it up.';
  }
  api.onSetupLog((chunk) => {
    const log = $('#setupLog');
    log.textContent += chunk;
    log.scrollTop = log.scrollHeight;
  });

  // ---------- init ----------
  function init() {
    st.batchRead = buildForm($('#batchForm'), loadSaved(), () => renderBatch());
    st.viewRead = buildForm($('#viewerForm'), loadSaved(), null);
    api.getSettings().then((s) => {
      $('#pyPath').value = s.python;
      $('#nunifPath').value = s.nunifPath;
    });
    refreshEngineStatus();
    renderBatch();
    renderSources();
  }
  init();
})();
