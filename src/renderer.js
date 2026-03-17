import { templates } from '../parser/templates.js';

const LOG_LIMIT = 300;
const LOG_LEVELS = new Set(['log', 'warn', 'error']);
const LEVEL_CLASS = {
  log: 'log-log',
  warn: 'log-warn',
  error: 'log-error',
};
const TEMPLATE_NAME_SELECTOR = 'input[name="template"]';

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

const state = {
  isParsing: false,
};

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

function formatTemplateLabel(value) {
  const spaced = String(value).replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatTimePrefix(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}]`;
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function replaceContent(container, ...nodes) {
  if (!container) {
    return;
  }

  container.replaceChildren(...nodes);
}

function createElement(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) {
    node.className = options.className;
  }
  if (options.textContent !== undefined) {
    node.textContent = options.textContent;
  }
  if (options.html !== undefined) {
    node.innerHTML = options.html;
  }
  return node;
}

function appendLog(level, args) {
  if (!dom.logList) {
    return;
  }

  const message = args.map(formatArg).join(' ').replace(/\r/g, '').trim();
  if (!message) {
    return;
  }

  const line = createElement('div', {
    className: `log-line ${LEVEL_CLASS[level] || LEVEL_CLASS.log}`,
    textContent: `${formatTimePrefix()} ${message}`,
  });

  dom.logList.append(line);

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
  window.wfmp?.onMainLog?.((payload) => {
    if (!payload) {
      return;
    }

    const level = LOG_LEVELS.has(payload.level) ? payload.level : 'log';
    const args = Array.isArray(payload.args) ? payload.args : [payload.args];
    appendLog(level, args);
  });
}

function setProgressVisible(visible) {
  dom.progressPanel?.classList.toggle('is-visible', visible);
}

function setParseButtonsState(running) {
  state.isParsing = running;

  if (dom.startButton) {
    dom.startButton.disabled = running;
  }

  if (dom.stopButton) {
    dom.stopButton.disabled = !running;
  }
}

function setProgressState(payload = {}) {
  if (!dom.progressLabel || !dom.progressValue || !dom.progressFill) {
    return;
  }

  const safePercent = Math.max(0, Math.min(100, Number(payload.percent || 0)));
  dom.progressFill.style.width = `${safePercent}%`;
  dom.progressValue.textContent = `${safePercent}%`;

  switch (payload.state) {
    case 'start':
      setParseButtonsState(true);
      dom.progressLabel.textContent = 'Progress: running';
      setProgressVisible(true);
      return;
    case 'stopping':
      dom.progressLabel.textContent = 'Progress: stopping...';
      setProgressVisible(true);
      return;
    case 'stopped':
      dom.progressLabel.textContent = 'Progress: stopped';
      setParseButtonsState(false);
      setTimeout(() => setProgressVisible(false), 900);
      return;
    case 'done':
      dom.progressLabel.textContent = 'Progress: done';
      setParseButtonsState(false);
      setTimeout(() => setProgressVisible(false), 700);
      return;
    case 'error':
      dom.progressLabel.textContent = 'Progress: error';
      setParseButtonsState(false);
      setTimeout(() => setProgressVisible(false), 1200);
      return;
    default:
      break;
  }

  setProgressVisible(true);

  if (payload.template) {
    const current = Number(payload.current || 0);
    const total = Number(payload.total || 0);
    dom.progressLabel.textContent = `Progress: ${formatTemplateLabel(payload.template)} ${current}/${total}`;
    return;
  }

  dom.progressLabel.textContent = 'Progress: running';
}

function hookProgressEvents() {
  window.wfmp?.onProgress?.((payload) => {
    setProgressState(payload || {});
  });
}

function createTemplateOption(key, template) {
  const label = createElement('label', { className: 'template-option' });
  const checkbox = createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `template-${key}`;
  checkbox.name = 'template';
  checkbox.value = key;
  checkbox.checked = Boolean(template?.checked ?? false);

  const text = createElement('span', { textContent: formatTemplateLabel(key) });
  label.append(checkbox, text);
  return label;
}

function renderTemplateCheckboxes() {
  if (!dom.templateContainer) {
    return;
  }

  const templateNodes = Object.entries(templates).map(([key, template]) => {
    return createTemplateOption(key, template);
  });

  replaceContent(dom.templateContainer, ...templateNodes);
}

function getSelectedTemplates() {
  if (!dom.templateContainer) {
    return {};
  }

  const selectedKeys = Array.from(
    dom.templateContainer.querySelectorAll(`${TEMPLATE_NAME_SELECTOR}:checked`),
    (node) => node.value,
  );

  return selectedKeys.reduce((acc, key) => {
    if (templates[key]) {
      acc[key] = templates[key];
    }
    return acc;
  }, {});
}

function isSummaryEnabled() {
  return Boolean(dom.summaryCheckbox?.checked);
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
  replaceContent(dom.outputView, createElement('div', {
    className: 'output-empty',
    textContent: message,
  }));
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

  const nameKeys = ['item', 'name', 'template', 'item_name', 'id'];
  const priceKeys = ['price', 'avgPrice', 'medianPrice', 'value', 'plat'];

  return (Array.isArray(data) ? data : [])
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const nameKey = nameKeys.find((key) => typeof row[key] === 'string');
      const priceKey = priceKeys.find((key) => asNumber(row[key]) !== null);
      if (!nameKey || !priceKey) {
        return null;
      }

      return { item: String(row[nameKey]), price: asNumber(row[priceKey]) };
    })
    .filter((row) => row && row.price !== null)
    .sort((a, b) => b.price - a.price);
}

function renderPriceRows(rows) {
  if (!dom.outputView) {
    return;
  }

  const table = createElement('table', { className: 'output-table' });
  table.innerHTML = '<thead><tr><th>Item</th><th>Price</th></tr></thead>';

  const tbody = createElement('tbody');
  for (const row of rows) {
    const tr = createElement('tr');
    tr.append(
      createElement('td', { textContent: row.item }),
      createElement('td', { textContent: String(row.price) }),
    );
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  replaceContent(dom.outputView, table);
}

function renderOutputJson(data) {
  replaceContent(dom.outputView, createElement('pre', {
    className: 'output-json',
    textContent: JSON.stringify(data, null, 2),
  }));
}

async function loadSelectedOutputFile() {
  if (!dom.outputSelect || !window.wfmp?.readOutputFile) {
    return;
  }

  const selectedFile = dom.outputSelect.value;
  if (!selectedFile) {
    setOutputMeta(null);
    renderOutputEmpty('Select a json file');
    return;
  }

  try {
    const payload = await window.wfmp.readOutputFile(selectedFile);
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

function createOutputFileOptions(files) {
  const placeholder = createElement('option', {
    textContent: files.length > 0 ? 'Select file...' : 'No json files',
  });
  placeholder.value = '';

  const options = files.map((file) => {
    const option = createElement('option', { textContent: file });
    option.value = file;
    return option;
  });

  return [placeholder, ...options];
}

async function loadOutputFiles() {
  if (!dom.outputSelect || !window.wfmp?.listOutputFiles) {
    return;
  }

  const previousValue = dom.outputSelect.value;

  try {
    const files = await window.wfmp.listOutputFiles();
    replaceContent(dom.outputSelect, ...createOutputFileOptions(files));

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

function bindClearLogsButton() {
  if (!dom.clearLogs || !dom.logList) {
    return;
  }

  dom.clearLogs.addEventListener('click', () => {
    replaceContent(dom.logList);
  });
}

function bindOutputViewer() {
  dom.outputSelect?.addEventListener('change', () => {
    loadSelectedOutputFile();
  });
}

function bindStartButton() {
  dom.startButton?.addEventListener('click', async () => {
    if (state.isParsing) {
      return;
    }

    const selectedTemplates = getSelectedTemplates();
    if (Object.keys(selectedTemplates).length === 0) {
      console.warn('Select at least one template');
      return;
    }

    try {
      const result = await window.wfmp.parseTemplates(selectedTemplates, isSummaryEnabled());
      if (result?.cancelled) {
        console.warn('Parsing stopped by user');
        return;
      }

      console.log('parse finished');
      await loadOutputFiles();
    } catch (error) {
      console.error('parse failed', error);
    }
  });
}

function bindStopButton() {
  dom.stopButton?.addEventListener('click', async () => {
    if (!state.isParsing) {
      return;
    }

    try {
      await window.wfmp.stopParse();
    } catch (error) {
      console.error('stop failed', error);
    }
  });
}

function bindOpenFolderButton() {
  dom.openFolderButton?.addEventListener('click', async () => {
    try {
      await window.wfmp.openOutputFolder();
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
    const meta = await window.wfmp.getAppMeta();
    dom.appName.textContent = meta?.name || 'WFMParser';
    dom.appVersion.textContent = `Version: ${meta?.version || '1.0.0'}`;
    dom.githubLink.setAttribute('href', meta?.githubUrl || 'https://github.com');
  } catch (error) {
    console.error('load app meta failed', error);
  }
}

function bindUi() {
  bindClearLogsButton();
  bindOutputViewer();
  bindStartButton();
  bindStopButton();
  bindOpenFolderButton();
}

function init() {
  hookConsoleToPanel();
  hookMainLogsToPanel();
  hookProgressEvents();
  renderTemplateCheckboxes();
  bindUi();
  setParseButtonsState(false);
  void loadAppMeta();
  void loadOutputFiles();
}

init();
