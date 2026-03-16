import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import WFMParser from '../parser/WFMParser.js';
import { readJSON } from '../parser/Utils.js';
import axios from '../WFMarketApiJS/node_modules/axios/index.js';

const parseState = {
  running: false,
  cancelled: false,
};

function isExternalHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function sendToAllWindows(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

function getOutputDir() {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'output');
  }

  return path.join(app.getAppPath(), 'output');
}

function getPricesDir() {
  return path.join(getOutputDir(), 'prices');
}

function resolvePriceFilePath(fileName) {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    throw new Error('Invalid output file path');
  }

  const safeName = path.basename(fileName);
  if (!safeName.toLowerCase().endsWith('.json')) {
    throw new Error('Only json files are allowed');
  }

  const pricesDir = getPricesDir();
  const absolutePath = path.resolve(pricesDir, safeName);
  const relativeToPrices = path.relative(pricesDir, absolutePath);

  if (relativeToPrices.startsWith('..') || path.isAbsolute(relativeToPrices)) {
    throw new Error('Access to this path is not allowed');
  }

  return absolutePath;
}

async function getAppMeta() {
  let githubUrl = 'https://github.com';
  let appName = app.getName();
  let appVersion = app.getVersion();

  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    appName = pkg.productName || pkg.name || appName;
    appVersion = pkg.version || appVersion;

    if (typeof pkg.repository === 'string') {
      githubUrl = pkg.repository;
    } else if (pkg.repository?.url) {
      githubUrl = pkg.repository.url;
    }
  } catch {
  
  }

  githubUrl = githubUrl.replace(/^git\+/, '').replace(/\.git$/, '');
  return { name: appName, version: appVersion, githubUrl };
}

function serializeArg(arg) {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }

  if (typeof arg === 'string') {
    return arg;
  }

  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function broadcastMainLog(level, args) {
  sendToAllWindows('main:log', { level, args: args.map(serializeArg) });
}

function broadcastProgress(payload) {
  sendToAllWindows('wfm:progress', payload);
}

function hookMainConsoleToRenderer() {
  ['log', 'warn', 'error'].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      broadcastMainLog(level, args);
    };
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 700,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttpUrl(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isExternalHttpUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(() => {
  axios.defaults.proxy = false;
  hookMainConsoleToRenderer();

  ipcMain.handle('wfm:parse-templates', async (_event, templates, summaryFile) => {
    if (parseState.running) {
      throw new Error('Parsing is already running');
    }

    WFMParser.setOutputFolder(getOutputDir());
    parseState.running = true;
    parseState.cancelled = false;
    broadcastProgress({ state: 'start', current: 0, total: 0, percent: 0, template: null });

    try {
      await WFMParser.parseTemplates(templates, summaryFile, (progress) => {
        broadcastProgress({ state: 'progress', ...progress });
      }, () => parseState.cancelled);

      if (parseState.cancelled) {
        broadcastProgress({ state: 'stopped' });
        return { ok: true, cancelled: true };
      }

      broadcastProgress({ state: 'done', percent: 100 });
      return { ok: true };
    } catch (error) {
      if (parseState.cancelled) {
        broadcastProgress({ state: 'stopped' });
        return { ok: true, cancelled: true };
      }

      broadcastProgress({ state: 'error' });
      throw error;
    } finally {
      parseState.running = false;
      parseState.cancelled = false;
    }
  });

  ipcMain.handle('wfm:stop-parse', () => {
    if (!parseState.running) {
      return { ok: true, running: false };
    }

    parseState.cancelled = true;
    broadcastProgress({ state: 'stopping' });
    return { ok: true, running: true };
  });

  ipcMain.handle('wfm:open-output-folder', async () => {
    const pricesPath = getPricesDir();
    await mkdir(pricesPath, { recursive: true });
    const openError = await shell.openPath(pricesPath);
    if (openError) {
      throw new Error(openError);
    }

    return { ok: true, path: pricesPath };
  });

  ipcMain.handle('wfm:list-output-files', async () => {
    const pricesPath = getPricesDir();
    await mkdir(pricesPath, { recursive: true });

    const entries = await readdir(pricesPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => entry.name);

    return files.sort((a, b) => a.localeCompare(b));
  });

  ipcMain.handle('wfm:read-output-file', async (_event, fileName) => {
    const filePath = resolvePriceFilePath(fileName);
    const data = await readJSON(filePath);
    const fileStats = await stat(filePath);
    return { file: path.basename(filePath), data, modifiedAt: fileStats.mtime.toISOString() };
  });

  ipcMain.handle('app:get-meta', async () => {
    return getAppMeta();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



