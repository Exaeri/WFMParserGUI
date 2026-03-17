import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
  parseTemplates: 'wfmp:parse-templates',
  stopParse: 'wfmp:stop-parse',
  openOutputFolder: 'wfmp:open-output-folder',
  listOutputFiles: 'wfmp:list-output-files',
  readOutputFile: 'wfmp:read-output-file',
  getAppMeta: 'app:get-meta',
  progress: 'wfmp:progress',
  mainLog: 'main:log',
};

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

const api = {
  parseTemplates(templates, summaryFile = false) {
    return ipcRenderer.invoke(IPC_CHANNELS.parseTemplates, templates, summaryFile);
  },
  stopParse() {
    return ipcRenderer.invoke(IPC_CHANNELS.stopParse);
  },
  openOutputFolder() {
    return ipcRenderer.invoke(IPC_CHANNELS.openOutputFolder);
  },
  listOutputFiles() {
    return ipcRenderer.invoke(IPC_CHANNELS.listOutputFiles);
  },
  readOutputFile(fileName) {
    return ipcRenderer.invoke(IPC_CHANNELS.readOutputFile, fileName);
  },
  getAppMeta() {
    return ipcRenderer.invoke(IPC_CHANNELS.getAppMeta);
  },
  onProgress(callback) {
    return onChannel(IPC_CHANNELS.progress, callback);
  },
  onMainLog(callback) {
    return onChannel(IPC_CHANNELS.mainLog, callback);
  },
};

contextBridge.exposeInMainWorld('wfmp', api);
