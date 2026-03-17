import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import axios from '../WFMarketApiJS/node_modules/axios/index.js';
import WFMParser from '../parser/WFMParser.js';
import { readJSON } from '../parser/Utils.js';

const MAIN_LOG_CHANNEL = 'main:log';
const PROGRESS_CHANNEL = 'wfmp:progress';
const IPC_CHANNELS = {
  parseTemplates: 'wfmp:parse-templates',
  stopParse: 'wfmp:stop-parse',
  openOutputFolder: 'wfmp:open-output-folder',
  listOutputFiles: 'wfmp:list-output-files',
  readOutputFile: 'wfmp:read-output-file',
  getAppMeta: 'app:get-meta',
};
const CONSOLE_LEVELS = ['log', 'warn', 'error'];

const parseState = {
  running: false,
  cancelled: false,
};

let consoleHooked = false;

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
    // Fallback to Electron app metadata when package.json is unavailable.
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
  sendToAllWindows(MAIN_LOG_CHANNEL, { level, args: args.map(serializeArg) });
}

function broadcastProgress(payload) {
  sendToAllWindows(PROGRESS_CHANNEL, payload);
}

function hookMainConsoleToRenderer() {
  if (consoleHooked) {
    return;
  }

  consoleHooked = true;

  for (const level of CONSOLE_LEVELS) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      broadcastMainLog(level, args);
    };
  }
}

function configureExternalNavigation(mainWindow) {
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
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 700,
    resizable: false,
    icon: path.join(app.getAppPath(), 'assets', 'wfmp.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();
  configureExternalNavigation(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

async function handleParseTemplates(_event, templates, summaryFile) {
  if (parseState.running) {
    throw new Error('Parsing is already running');
  }

  WFMParser.setOutputFolder(getOutputDir());
  parseState.running = true;
  parseState.cancelled = false;
  broadcastProgress({ state: 'start', current: 0, total: 0, percent: 0, template: null });

  try {
    await WFMParser.parseTemplates(
      templates,
      summaryFile,
      (progress) => broadcastProgress({ state: 'progress', ...progress }),
      () => parseState.cancelled,
    );

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
}

function handleStopParse() {
  if (!parseState.running) {
    return { ok: true, running: false };
  }

  parseState.cancelled = true;
  broadcastProgress({ state: 'stopping' });
  return { ok: true, running: true };
}

async function handleOpenOutputFolder() {
  const pricesPath = getPricesDir();
  await mkdir(pricesPath, { recursive: true });
  const openError = await shell.openPath(pricesPath);

  if (openError) {
    throw new Error(openError);
  }

  return { ok: true, path: pricesPath };
}

async function handleListOutputFiles() {
  const pricesPath = getPricesDir();
  await mkdir(pricesPath, { recursive: true });

  const entries = await readdir(pricesPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return files;
}

async function handleReadOutputFile(_event, fileName) {
  const filePath = resolvePriceFilePath(fileName);
  const data = await readJSON(filePath);
  const fileStats = await stat(filePath);
  return {
    file: path.basename(filePath),
    data,
    modifiedAt: fileStats.mtime.toISOString(),
  };
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.parseTemplates, handleParseTemplates);
  ipcMain.handle(IPC_CHANNELS.stopParse, handleStopParse);
  ipcMain.handle(IPC_CHANNELS.openOutputFolder, handleOpenOutputFolder);
  ipcMain.handle(IPC_CHANNELS.listOutputFiles, handleListOutputFiles);
  ipcMain.handle(IPC_CHANNELS.readOutputFile, handleReadOutputFile);
  ipcMain.handle(IPC_CHANNELS.getAppMeta, getAppMeta);
}

function setupApp() {
  axios.defaults.proxy = false;
  hookMainConsoleToRenderer();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

if (started) {
  app.quit();
}

app.whenReady().then(setupApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
