const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pulseDesktop', Object.freeze({
  selectMedia: (kind) => ipcRenderer.invoke('media:choose', kind),
  selectMany: (kind) => ipcRenderer.invoke('media:choose-many', kind),
  ffmpegSettings: (choose) => ipcRenderer.invoke('settings:ffmpeg', !!choose),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (project, path) => ipcRenderer.invoke('project:save', { project, path }),
  prepareAudio: (path) => ipcRenderer.invoke('media:prepare', path),
  ffmpegStatus: () => ipcRenderer.invoke('export:status'),
  startExport: (opts) => ipcRenderer.invoke('export:start', opts),
  pushFrame: (id, base64) => ipcRenderer.invoke('export:frame', { id, base64 }),
  finishExport: (id) => ipcRenderer.invoke('export:finish', id),
  cancelExport: (id) => ipcRenderer.invoke('export:cancel', id),
  revealFile: (path) => ipcRenderer.invoke('system:reveal', path),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  setWindowDirty: (dirty) => ipcRenderer.send('app:dirty', !!dirty),
  finishClose: () => ipcRenderer.invoke('app:finish-close'),
  onSaveAndClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:save-and-close', handler);
    return () => ipcRenderer.off('app:save-and-close', handler);
  }
}));
