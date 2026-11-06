'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  scan: (folder, recursive) => ipcRenderer.invoke('files:scan', folder, recursive),
  listVariants: (source) => ipcRenderer.invoke('variants:list', source),
  removeVariant: (id) => ipcRenderer.invoke('variants:remove', id),
  startJob: (items, settings) => ipcRenderer.invoke('job:start', items, settings),
  cancelJob: (jobId) => ipcRenderer.invoke('job:cancel', jobId),
  onJob: (cb) => on('job:event', cb),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  installEngine: () => ipcRenderer.invoke('engine:install'),
  onTaskProgress: (cb) => on('task:progress', cb),
  moveDataFolder: () => ipcRenderer.invoke('data:move'),
  checkSetup: () => ipcRenderer.invoke('setup:check'),
  resetAppData: () => ipcRenderer.invoke('app:reset'),
  // appearance
  getAppearance: () => ipcRenderer.invoke('appearance:get'),
  setAppearance: (d) => ipcRenderer.invoke('appearance:set', d),
  pickFonts: () => ipcRenderer.invoke('fonts:pick'),
  installFont: (family, files) => ipcRenderer.invoke('fonts:install', family, files),
  listFonts: () => ipcRenderer.invoke('fonts:list'),
  readFont: (id, name) => ipcRenderer.invoke('fonts:read', id, name),
  removeFont: (id) => ipcRenderer.invoke('fonts:remove', id),
  exportTheme: (t) => ipcRenderer.invoke('theme:export', t),
  importThemes: () => ipcRenderer.invoke('theme:import'),
  openPath: (p) => ipcRenderer.invoke('shell:open', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:show', p),
});
