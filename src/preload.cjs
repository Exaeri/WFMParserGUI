// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

function onChannel(channel, callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);

  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

contextBridge.exposeInMainWorld('wfm', {
  parseTemplates(templates, summaryFile = false) {
    return ipcRenderer.invoke('wfm:parse-templates', templates, summaryFile);
  },
  stopParse() {
    return ipcRenderer.invoke('wfm:stop-parse');
  },
  openOutputFolder() {
    return ipcRenderer.invoke('wfm:open-output-folder');
  },
  listOutputFiles() {
    return ipcRenderer.invoke('wfm:list-output-files');
  },
  readOutputFile(fileName) {
    return ipcRenderer.invoke('wfm:read-output-file', fileName);
  },
  getAppMeta() {
    return ipcRenderer.invoke('app:get-meta');
  },
  onProgress(callback) {
    return onChannel('wfm:progress', callback);
  },
  onMainLog(callback) {
    return onChannel('main:log', callback);
  },
});
