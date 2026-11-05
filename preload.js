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
});
