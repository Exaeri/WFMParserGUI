import { templates } from '../parser/templates.js';

const LOG_LIMIT = 300;
const LOG_LEVELS = new Set(['log', 'warn', 'error']);
const LEVEL_CLASS = {
  log: 'log-log',
  warn: 'log-warn',
  error: 'log-error',
};

const dom = {
  logList: document.querySelector('#log-list'),
  clearLogs: document.querySelector('#clear-logs'),
  startButton: document.querySelector('#start-button'),
  stopButton: document.querySelector('#stop-button'),
  openFolderButton: document.querySelector('#open-folder-button'),
  templateContainer: document.querySelector('#template-checkboxes'),
  summaryCheckbox: document.querySelector('#summary-checkbox'),
  progressPanel: document.querySelector('#progress-panel'),
  progressLabel: document.querySelector('#progress-label'),
  progressValue: document.querySelector('#progress-value'),
  progressFill: document.querySelector('#progress-fill'),
  outputSelect: document.querySelector('#output-file-select'),
  outputView: document.querySelector('#output-view'),
  outputMeta: document.querySelector('#output-file-meta'),
  appName: document.querySelector('#app-name'),
  appVersion: document.querySelector('#app-version'),
  githubLink: document.querySelector('#github-link'),
};

let isParsing = false;

function formatArg(arg) {
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

function getTimePrefix() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}]`;
}

function appendLog(level, args) {
  if (!dom.logList) {
    return;
  }

  const message = args.map(formatArg).join(' ').replace(/\r/g, '').trim();
  if (!message) {
    return;
  }

  const line = document.createElement('div');
  line.className = `log-line ${LEVEL_CLASS[level] || LEVEL_CLASS.log}`;
  line.textContent = `${getTimePrefix()} ${message}`;
  dom.logList.appendChild(line);

  while (dom.logList.children.length > LOG_LIMIT) {
    dom.logList.firstElementChild?.remove();
  }

  dom.logList.scrollTop = dom.logList.scrollHeight;
}

function hookConsoleToPanel() {
  for (const level of LOG_LEVELS) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      appendLog(level, args);
    };
  }
}

function hookMainLogsToPanel() {
  window.wfm?.onMainLog?.((payload) => {
    if (!payload) {
      return;
    }

    const level = LOG_LEVELS.has(payload.level) ? payload.level : 'log';
    const args = Array.isArray(payload.args) ? payload.args : [payload.args];
    appendLog(level, args);
  });
}

function setProgressVisible(visible) {
  if (!dom.progressPanel) {
    return;
  }

  dom.progressPanel.classList.toggle('is-visible', visible);
}

function setParseButtonsState(running) {
  isParsing = running;
  if (dom.startButton) {
    dom.startButton.disabled = running;
  }
  if (dom.stopButton) {
    dom.stopButton.disabled = !running;
  }
}

function setProgressState(payload) {
  if (!dom.progressLabel || !dom.progressValue || !dom.progressFill) {
    return;
  }

  const safePercent = Math.max(0, Math.min(100, Number(payload?.percent || 0)));
  dom.progressFill.style.width = `${safePercent}%`;
  dom.progressValue.textContent = `${safePercent}%`;

  if (payload?.state === 'start') {
    setParseButtonsState(true);
    dom.progressLabel.textContent = 'Progress: running';
    setProgressVisible(true);
    return;
  }

  if (payload?.state === 'stopping') {
    dom.progressLabel.textContent = 'Progress: stopping...';
    setProgressVisible(true);
    return;
  }

  if (payload?.state === 'stopped') {
    dom.progressLabel.textContent = 'Progress: stopped';
    setParseButtonsState(false);
    setTimeout(() => setProgressVisible(false), 900);
    return;
  }

  if (payload?.state === 'done') {
    dom.progressLabel.textContent = 'Progress: done';
    setParseButtonsState(false);
    setTimeout(() => setProgressVisible(false), 700);
    return;
  }

  if (payload?.state === 'error') {
    dom.progressLabel.textContent = 'Progress: error';
    setParseButtonsState(false);
    setTimeout(() => setProgressVisible(false), 1200);
    return;
  }

  setProgressVisible(true);

  if (payload?.template) {
    const current = Number(payload.current || 0);
    const total = Number(payload.total || 0);
    const spaced = payload.template.replace(/([a-z])([A-Z])/g, '$1 $2');
    const title = spaced.charAt(0).toUpperCase() + spaced.slice(1);
    dom.progressLabel.textContent = `Progress: ${title} ${current}/${total}`;
    return;
  }

  dom.progressLabel.textContent = 'Progress: running';
}

function hookProgressEvents() {
  window.wfm?.onProgress?.((payload) => {
    setProgressState(payload || {});
  });
}

function renderTemplateCheckboxes() {
  if (!dom.templateContainer) {
    return;
  }

  dom.templateContainer.innerHTML = '';

  for (const key of Object.keys(templates)) {
    const id = `template-${key}`;
    const label = document.createElement('label');
    label.className = 'template-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.name = 'template';
    checkbox.value = key;
    checkbox.checked = Boolean(templates[key]?.checked ?? false);

    const text = document.createElement('span');
    const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2');
    text.textContent = spaced.charAt(0).toUpperCase() + spaced.slice(1);

    label.append(checkbox, text);
    dom.templateContainer.appendChild(label);
  }
}

function getSelectedTemplates() {
  const selected = Array.from(
    document.querySelectorAll('input[name="template"]:checked'),
  ).map((node) => node.value);

  return selected.reduce((acc, key) => {
    if (templates[key]) {
      acc[key] = templates[key];
    }
    return acc;
  }, {});
}

function isSummaryEnabled() {
  return Boolean(dom.summaryCheckbox?.checked);
}

function wireClearLogsButton() {
  if (!dom.clearLogs || !dom.logList) {
    return;
  }

  dom.clearLogs.addEventListener('click', () => {
    dom.logList.innerHTML = '';
  });
}

function setOutputMeta(modifiedAt) {
  if (!dom.outputMeta) {
    return;
  }

  if (!modifiedAt) {
    dom.outputMeta.textContent = 'Updated: -';
    return;
  }

  const date = new Date(modifiedAt);
  dom.outputMeta.textContent = Number.isNaN(date.getTime())
    ? 'Updated: -'
    : `Updated: ${date.toLocaleString()}`;
}

function renderOutputEmpty(message) {
  if (!dom.outputView) {
    return;
  }

  dom.outputView.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'output-empty';
  empty.textContent = message;
  dom.outputView.appendChild(empty);
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function detectPriceRows(data) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  if (!Array.isArray(data)) {
    const entries = Object.entries(data)
      .map(([item, rawPrice]) => {
        const price = asNumber(rawPrice);
        return price === null ? null : { item: String(item), price };
      })
      .filter(Boolean);

    if (entries.length > 0 && entries.length === Object.keys(data).length) {
      return entries.sort((a, b) => b.price - a.price);
    }
  }

  if (Array.isArray(data)) {
    const nameKeys = ['item', 'name', 'template', 'item_name', 'id'];
    const priceKeys = ['price', 'avgPrice', 'medianPrice', 'value', 'plat'];
    const rows = [];

    for (const row of data) {
      if (!row || typeof row !== 'object') {
        continue;
      }

      const nameKey = nameKeys.find((key) => typeof row[key] === 'string');
      const priceKey = priceKeys.find((key) => asNumber(row[key]) !== null);
      if (!nameKey || !priceKey) {
        continue;
      }

      rows.push({ item: String(row[nameKey]), price: asNumber(row[priceKey]) });
    }

    return rows
      .filter((row) => row.price !== null)
      .sort((a, b) => b.price - a.price);
  }

  return [];
}

function renderPriceRows(rows) {
  if (!dom.outputView) {
    return;
  }

  dom.outputView.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'output-table';
  table.innerHTML = '<thead><tr><th>Item</th><th>Price</th></tr></thead>';

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    const itemTd = document.createElement('td');
    const priceTd = document.createElement('td');
    itemTd.textContent = row.item;
    priceTd.textContent = String(row.price);
    tr.append(itemTd, priceTd);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  dom.outputView.appendChild(table);
}

function renderOutputJson(data) {
  if (!dom.outputView) {
    return;
  }

  dom.outputView.innerHTML = '';
  const pre = document.createElement('pre');
  pre.className = 'output-json';
  pre.textContent = JSON.stringify(data, null, 2);
  dom.outputView.appendChild(pre);
}

async function loadSelectedOutputFile() {
  if (!dom.outputSelect || !window.wfm?.readOutputFile) {
    return;
  }

  const selectedFile = dom.outputSelect.value;
  if (!selectedFile) {
    setOutputMeta(null);
    renderOutputEmpty('Select a json file');
    return;
  }

  try {
    const payload = await window.wfm.readOutputFile(selectedFile);
    setOutputMeta(payload?.modifiedAt);
    const rows = detectPriceRows(payload?.data);
    if (rows.length > 0) {
      renderPriceRows(rows);
      return;
    }
    renderOutputJson(payload?.data);
  } catch (error) {
    console.error('read output file failed', error);
    setOutputMeta(null);
    renderOutputEmpty('Failed to read selected file');
  }
}

async function loadOutputFiles() {
  if (!dom.outputSelect || !window.wfm?.listOutputFiles) {
    return;
  }

  const previousValue = dom.outputSelect.value;

  try {
    const files = await window.wfm.listOutputFiles();
    dom.outputSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = files.length > 0 ? 'Select file...' : 'No json files';
    dom.outputSelect.appendChild(placeholder);

    for (const file of files) {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file;
      dom.outputSelect.appendChild(option);
    }

    if (previousValue && files.includes(previousValue)) {
      dom.outputSelect.value = previousValue;
    } else if (files.length > 0) {
      dom.outputSelect.value = files[0];
    } else {
      dom.outputSelect.value = '';
    }

    await loadSelectedOutputFile();
  } catch (error) {
    console.error('load output files failed', error);
    setOutputMeta(null);
    renderOutputEmpty('Failed to load output files');
  }
}

function wireOutputViewer() {
  if (!dom.outputSelect) {
    return;
  }

  dom.outputSelect.addEventListener('change', () => {
    loadSelectedOutputFile();
  });
}

function wireStartButton() {
  if (!dom.startButton) {
    return;
  }

  dom.startButton.addEventListener('click', async () => {
    if (isParsing) {
      return;
    }

    const selectedTemplates = getSelectedTemplates();
    if (Object.keys(selectedTemplates).length === 0) {
      console.warn('Select at least one template');
      return;
    }

    try {
      await window.wfm.parseTemplates(selectedTemplates, isSummaryEnabled());
      console.log('parse finished');
      await loadOutputFiles();
    } catch (error) {
      console.error('parse failed', error);
    }
  });
}

function wireStopButton() {
  if (!dom.stopButton) {
    return;
  }

  dom.stopButton.addEventListener('click', async () => {
    if (!isParsing) {
      return;
    }

    try {
      await window.wfm.stopParse();
      console.warn('stop requested');
    } catch (error) {
      console.error('stop failed', error);
    }
  });
}

function wireOpenFolderButton() {
  if (!dom.openFolderButton) {
    return;
  }

  dom.openFolderButton.addEventListener('click', async () => {
    try {
      await window.wfm.openOutputFolder();
    } catch (error) {
      console.error('open folder failed', error);
    }
  });
}

async function loadAppMeta() {
  if (!dom.appName || !dom.appVersion || !dom.githubLink) {
    return;
  }

  try {
    const meta = await window.wfm.getAppMeta();
    const name = meta?.name || 'WFMParser';
    const version = meta?.version || '1.0.0';
    const githubUrl = meta?.githubUrl || 'https://github.com';

    dom.appName.textContent = name;
    dom.appVersion.textContent = `Version: ${version}`;
    dom.githubLink.setAttribute('href', githubUrl);
  } catch (error) {
    console.error('load app meta failed', error);
  }
}

function init() {
  hookConsoleToPanel();
  hookMainLogsToPanel();
  hookProgressEvents();
  renderTemplateCheckboxes();
  wireClearLogsButton();
  wireOutputViewer();
  wireStartButton();
  wireStopButton();
  wireOpenFolderButton();
  setParseButtonsState(false);
  loadAppMeta();
  loadOutputFiles();
}

init();
