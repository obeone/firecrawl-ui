import { load } from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveKey');
const nav = document.getElementById('nav');
const content = document.getElementById('content');

// load saved api key
apiKeyInput.value = localStorage.getItem('firecrawl_api_key') || '';
saveBtn.onclick = () => {
  localStorage.setItem('firecrawl_api_key', apiKeyInput.value);
  alert('API key saved');
};

let openapi;
let baseUrl = '';

async function loadSpec() {
  const text = await fetch('openapi.yaml').then(r => r.text());
  openapi = load(text);
  baseUrl = openapi.servers?.[0]?.url || '';
  buildNav();
  showTag(openapi.tags[0].name);
}

function buildNav() {
  nav.innerHTML = '';
  openapi.tags.forEach(tag => {
    const a = document.createElement('a');
    a.href = '#'+tag.name;
    a.textContent = tag.name;
    a.onclick = ev => {
      ev.preventDefault();
      showTag(tag.name);
    };
    nav.appendChild(a);
  });
}

function operationsByTag(tagName) {
  const ops = [];
  for (const [path, methods] of Object.entries(openapi.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (op.tags && op.tags.includes(tagName)) {
        ops.push({path, method, op});
      }
    }
  }
  return ops;
}

function showTag(tagName) {
  [...nav.children].forEach(a => a.classList.toggle('active', a.textContent===tagName));
  const ops = operationsByTag(tagName);
  content.innerHTML = '';
  ops.forEach(({path, method, op}) => {
    content.appendChild(createOperationForm(path, method, op));
  });
}

function createOperationForm(path, method, op) {
  const wrapper = document.createElement('div');
  wrapper.style.border = '1px solid #ccc';
  wrapper.style.marginBottom = '20px';
  wrapper.style.padding = '10px';

  const title = document.createElement('h3');
  title.textContent = `${method.toUpperCase()} ${path}`;
  wrapper.appendChild(title);

  const form = document.createElement('form');
  form.onsubmit = e => { e.preventDefault(); sendRequest(); };
  wrapper.appendChild(form);

  // parameters
  const pathParams = (op.parameters || []).filter(p => p.in === 'path');
  const queryParams = (op.parameters || []).filter(p => p.in === 'query');

  pathParams.forEach(p => {
    const label = document.createElement('label');
    label.textContent = `${p.name}: `;
    const input = document.createElement('input');
    input.name = p.name;
    label.appendChild(input);
    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  });

  queryParams.forEach(p => {
    const label = document.createElement('label');
    label.textContent = `${p.name} (query): `;
    const input = document.createElement('input');
    input.name = p.name;
    label.appendChild(input);
    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  });

  let bodyArea;
  if (op.requestBody) {
    bodyArea = document.createElement('textarea');
    bodyArea.name = 'body';
    bodyArea.placeholder = 'JSON body';
    const example = getExample(op);
    if (example) bodyArea.value = example;
    form.appendChild(bodyArea);
  }

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  form.appendChild(sendBtn);

  const prog = document.createElement('progress');
  prog.classList.add('hidden');
  form.appendChild(prog);

  const respPre = document.createElement('pre');
  form.appendChild(respPre);

  const downloadJsonBtn = document.createElement('button');
  downloadJsonBtn.textContent = 'Download JSON';
  downloadJsonBtn.type = 'button';
  downloadJsonBtn.classList.add('hidden');
  form.appendChild(downloadJsonBtn);

  const downloadZipBtn = document.createElement('button');
  downloadZipBtn.textContent = 'Download ZIP';
  downloadZipBtn.type = 'button';
  downloadZipBtn.classList.add('hidden');
  form.appendChild(downloadZipBtn);

  const historyDiv = document.createElement('div');
  wrapper.appendChild(historyDiv);
  loadHistory();

  function sendRequest() {
    let url = baseUrl + path;
    pathParams.forEach(p => {
      const val = form.querySelector(`[name="${p.name}"]`).value;
      url = url.replace(`{${p.name}}`, encodeURIComponent(val));
    });
    const qs = [];
    queryParams.forEach(p => {
      const val = form.querySelector(`[name="${p.name}"]`).value;
      if (val) qs.push(`${p.name}=${encodeURIComponent(val)}`);
    });
    if (qs.length) url += '?' + qs.join('&');

    const headers = { 'Authorization': apiKeyInput.value, 'Content-Type':'application/json' };
    let body;
    if (bodyArea) {
      try { body = JSON.stringify(JSON.parse(bodyArea.value)); }
      catch(e){ alert('Invalid JSON body'); return; }
    }

    prog.classList.remove('hidden');
    prog.value = 0;
    prog.removeAttribute('max');

    fetch(url, { method, headers, body })
      .then(r => r.json())
      .then(data => {
        respPre.textContent = JSON.stringify(data, null, 2);
        downloadJsonBtn.onclick = () => downloadJSON(data, `${op.operationId}.json`);
        downloadZipBtn.onclick = () => downloadZIP(data, `${op.operationId}.zip`);
        downloadJsonBtn.classList.remove('hidden');
        downloadZipBtn.classList.remove('hidden');
        saveHistory(body, data);
        if (data.id && (path.endsWith('crawl') || path.endsWith('batch-scrape') || path.endsWith('extract'))) {
          pollJob(data.id);
        } else {
          prog.classList.add('hidden');
        }
      })
      .catch(err => { respPre.textContent = err.toString(); prog.classList.add('hidden'); });
  }

  function pollJob(id) {
    let statusPath = path + '/' + id;
    const interval = setInterval(() => {
      fetch(baseUrl + statusPath, { headers: { 'Authorization': apiKeyInput.value } })
        .then(r => r.json())
        .then(data => {
          respPre.textContent = JSON.stringify(data, null, 2);
          saveHistory(null, data);
          if (data.total && data.processed !== undefined) {
            prog.max = data.total;
            prog.value = data.processed;
          }
          if (data.status && /(completed|failed)/.test(data.status)) {
            clearInterval(interval);
            prog.classList.add('hidden');
          }
        })
        .catch(err => { respPre.textContent = err.toString(); clearInterval(interval); prog.classList.add('hidden'); });
    }, 2000);
  }

  function loadHistory() {
    const key = 'hist_' + op.operationId;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    historyDiv.innerHTML = '<h4>History</h4>';
    arr.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.textContent = item.time;
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(item.response, null, 2);
      div.appendChild(pre);
      historyDiv.appendChild(div);
    });
  }

  function saveHistory(request, response) {
    const key = 'hist_' + op.operationId;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.unshift({time: new Date().toISOString(), request, response});
    localStorage.setItem(key, JSON.stringify(arr.slice(0,5))); // keep last 5
    loadHistory();
  }

  return wrapper;
}

function getExample(op) {
  const ex = op.requestBody?.content?.['application/json']?.examples;
  if (ex) {
    const first = Object.values(ex)[0];
    if (first && first.value) return JSON.stringify(first.value, null, 2);
  }
  return '';
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadZIP(data, filename) {
  const zip = new JSZip();
  zip.file('data.json', JSON.stringify(data, null, 2));
  zip.generateAsync({type:'blob'}).then(content => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  });
}

loadSpec();
