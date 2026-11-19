import { t } from '../i18n.js';
import { FACTORIES as F, ORDER, MORE, CHUNK, MIN_HASH_MS } from './hashers.js';

const $ = (id) => document.getElementById(id);

let S = {};            // name -> hex digest of the current file
let active = '';       // hash type being calculated right now
let wantMore = false;  // user asked for the "other" hash types
let moreDone = false;
let runId = 0;         // incremented to cancel a running calculation
let curFile = null;
let curProg = 0;

/* ---- helpers ---- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Parse the “Hash to compare” textarea: each line is one hash to check.
   Supported per-line formats (standard md5sum/sha256sum/BSD conventions):
     111fef08…  or short hashes like 1a (CRC8)   bare hash
     04c4a1f7… *file.tar.gz                      coreutils format, binary marker
     04c4a1f7…  file.tar.gz                      coreutils format (two spaces)
     MD5 (file.tar.gz) = 04c4a1f7…               BSD / openssl style
   Empty lines and lines starting with # are ignored. Hashes are 2–128 hex characters
   (2 = CRC8, up to SHA-512). The loose “hash embedded in text” fallback needs >= 8 chars. */
function parseHashLines(raw) {
  const HEX = /\b[0-9a-fA-F]{2,128}\b/;
  const HEX8 = /\b[0-9a-fA-F]{8,128}\b/g;
  const out = [];
  String(raw || '').replace(/^\uFEFF/, '').split(/\r\n|\r|\n/).forEach((line, i) => {
    line = line.trim();
    if (!line || line.charAt(0) === '#') return;
    let hash = '', name = '';
    const m = line.match(/^([0-9a-fA-F]{2,128})(?:\s+\*?(.*))?$/); // hash [ *]filename
    if (m) {
      hash = m[1];
      if (m[2]) name = m[2].trim();
    } else if (/^\s*[A-Za-z0-9_-]+\s*\(.+\)\s*=/.test(line)) {      // MD5 (filename) = hash
      const h = line.slice(line.indexOf('=') + 1).match(HEX);
      if (h) hash = h[0];
      const nm = line.match(/\(([^)]+)\)/);
      if (nm) name = nm[1].trim();
    } else {
      const h = line.match(HEX8);                                   // hash embedded in text
      if (h && h.length === 1) hash = h[0];
    }
    if (hash) out.push({ hash: hash.toLowerCase(), name, line: i + 1 });
  });
  return out;
}
const cands = () => parseHashLines($('cmp').value).map((e) => e.hash);

function size(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < 4) { n /= 1024; i++; }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`;
}
function prog(label, f) {
  f = Math.max(0, Math.min(1, f));
  curProg = f;
  $('progWrap').classList.remove('hidden');
  $('progLabel').textContent = label;
  $('progPct').textContent = `${Math.floor(f * 100)}%`;
  $('prog').style.width = `${f * 100}%`;
}
function resetProg() {
  const el = $('prog');
  curProg = 0;
  el.style.transition = 'none';
  el.style.width = '0%';
  $('progPct').textContent = '0%';
  void el.offsetWidth; // force reflow so the bar jumps to 0% without animating back
  el.style.transition = '';
}

/* ---- render ---- */
function row(n, first) {
  const v = S[n];
  const hit = v && cands().indexOf(v) > -1;
  const val = v ? esc(v) : `<span class="text-muted">${t(active === n ? 'calculating' : 'waiting')}</span>`;
  return `<div class="grid grid-cols-[1fr_auto] sm:grid-cols-[7.5rem_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 ${first ? '' : 'border-t border-line '}${hit ? 'row-hit' : ''}">`
    + `<div class="order-1 text-sm font-semibold">${n}</div>`
    + `<div class="order-3 col-span-2 sm:col-span-1 sm:order-2 font-mono text-xs break-all ${hit ? 'text-success' : ''}">${val}</div>`
    + `<div class="order-2 sm:order-3 flex items-center gap-2">${hit ? `<span class="text-xs font-semibold text-success">${t('match')}</span>` : ''}${v ? `<button data-copy="${v}" class="btn btn-secondary btn-sm">${t('copy')}</button>` : ''}</div></div>`;
}
function render() {
  $('tPrimary').innerHTML = row('SHA-256', true);
  $('tCommon').innerHTML = ORDER.slice(1).map((n) => row(n)).join('');
  $('moreHead').classList.toggle('hidden', !wantMore);
  $('tMore').innerHTML = wantMore ? MORE.map((n) => row(n)).join('') : '';
  $('moreBtn').classList.toggle('hidden', wantMore);
  evaluate();
}

const TONE = {
  ok: 'border-line bg-success-soft text-success',
  warn: 'border-line bg-primary-soft text-primary',
  bad: 'border-line bg-danger-soft text-danger',
  info: 'border-line bg-surface',
};
function banner(tone, html) {
  const b = $('banner');
  b.className = `mt-4 rounded-card border px-4 py-3 text-sm ${TONE[tone]}`;
  b.innerHTML = html;
}

function evaluate() {
  const entries = parseHashLines($('cmp').value);
  const c = entries.map((e) => e.hash);
  const b = $('banner');
  const info = $('hashInfo');
  if (info) {
    info.textContent = entries.length ? t(entries.length > 1 ? 'hashDetectedMany' : 'hashDetectedOne', { n: entries.length }) : '';
    info.classList.toggle('hidden', !entries.length);
  }
  if (!entries.length) {
    if ($('cmp').value.trim()) return banner('bad', t('noValidHash'));
    b.className = 'hidden';
    return;
  }
  if (!curFile) return banner('info', t('hashesReady'));

  const all = ORDER.concat(wantMore ? MORE : []);
  const fn = curFile.name.toLowerCase();
  let named = null;
  entries.forEach((e) => { if (e.name && e.name.toLowerCase() === fn) named = e; });

  const hit = all.filter((n) => S[n] && c.indexOf(S[n]) > -1);
  if (hit.length) {
    let matched = 0;
    entries.forEach((e) => { if (all.some((n) => S[n] === e.hash)) matched++; });
    const note = entries.length > 1 ? t('matchNote', { matched, total: entries.length }) : '';
    return banner('ok', t(hit.length > 1 ? 'matchMany' : 'matchOne', { types: hit.join(', '), note }));
  }
  if (!ORDER.every((n) => S[n])) return banner('info', t('comparing'));
  if (!moreDone) {
    if (wantMore) return banner('warn', t('checkingOther'));
    return banner('warn', t('noMatchCommon', { button: `<button id="bannerMore" class="underline font-medium">${t('checkOther')}</button>` }));
  }
  const total = ORDER.length + MORE.length;
  const body = entries.length > 1 ? t('noMatchMany', { count: entries.length, total }) : t('noMatchOne', { total });
  const namedNote = named ? t('noMatchNamed', { file: esc(curFile.name), line: named.line }) : '';
  banner('bad', `<b>${t('noMatchTitle')}</b> ${body}${namedNote}${t('noMatchAdvice')}`);
}

/* ---- streaming: one hash type per pass over the file + anti-jank smoothing ---- */
async function hashOne(name, id, idx, total, startProg) {
  const t0 = performance.now();
  const segEnd = (idx + 1) / total;
  const isLast = idx === total - 1;
  const label = t('progress', { name, i: idx + 1, total });

  const h = await F[name]();
  if (id !== runId) return;
  active = name; render();
  const file = curFile;

  if (file.size === 0) {
    prog(label, segEnd);
  } else {
    for (let o = 0; o < file.size; o += CHUNK) {
      const buf = new Uint8Array(await file.slice(o, Math.min(o + CHUNK, file.size)).arrayBuffer());
      if (id !== runId) return;
      h.update(buf);
      const frac = Math.min(1, (o + CHUNK) / file.size);
      prog(label, startProg + (segEnd - startProg) * frac);
    }
  }

  S[name] = h.digest('hex');
  active = '';
  render();

  const elapsed = performance.now() - t0;
  if (isLast) { prog(label, 1); return; }

  if (elapsed < MIN_HASH_MS) {
    // very fast hash: ease the bar forward so it doesn't flicker
    const segSize = 1 / total;
    const maxOver = Math.min(1, segEnd + 0.5 * segSize);
    const remainMs = MIN_HASH_MS - elapsed;
    const speed = (segEnd - startProg) / Math.max(1, elapsed);
    const targetOver = Math.min(maxOver, segEnd + speed * remainMs);
    const fromProg = curProg;
    await new Promise((resolve) => {
      const step = () => {
        if (id !== runId) return resolve();
        const dt = performance.now() - t0;
        if (dt >= MIN_HASH_MS) { prog(label, targetOver); return resolve(); }
        const ratio = Math.max(0, (dt - elapsed) / remainMs);
        prog(label, fromProg + (targetOver - fromProg) * ratio);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  } else {
    prog(label, segEnd);
  }
}

async function maybeMore(id) {
  if (!wantMore || moreDone || id !== runId) return;
  resetProg();
  for (let i = 0; i < MORE.length; i++) {
    if (id !== runId) return;
    await hashOne(MORE[i], id, i, MORE.length, curProg);
  }
  if (id !== runId) return;
  moreDone = true; render();
  $('progWrap').classList.add('hidden');
}

async function start(file) {
  const id = ++runId;
  curFile = file; S = {}; moreDone = false; active = '';
  resetProg();
  $('fileInfo').innerHTML = `<span class="font-mono text-xs">${esc(file.name)}</span> · ${size(file.size)}`;
  render();
  try {
    for (let i = 0; i < ORDER.length; i++) {
      if (id !== runId) return;
      await hashOne(ORDER[i], id, i, ORDER.length, curProg);
    }
    if (id !== runId) return;
    await maybeMore(id);
    if (id === runId) $('progWrap').classList.add('hidden');
  } catch (e) {
    $('progWrap').classList.add('hidden');
    active = '';
    banner('bad', t('readError'));
  }
}
function askMore() {
  wantMore = true; render();
  if (curFile && ORDER.every((n) => S[n])) maybeMore(runId);
}

/* ---- events ---- */
const drop = $('drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('border-primary'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('border-primary'); }));
drop.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) start(e.dataTransfer.files[0]); });
drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
$('file').onchange = function () { if (this.files[0]) start(this.files[0]); this.value = ''; };
$('hashFileBtn').onclick = () => $('hashFile').click();
$('hashFile').onchange = function () {
  const f = this.files[0];
  this.value = '';
  if (!f) return;
  f.text().then((txt) => {
    $('cmp').value = txt.replace(/^\uFEFF/, '').replace(/\s+$/, '');
    render();
  }).catch(() => banner('bad', t('hashFileError')));
};
$('cmp').addEventListener('input', render);
$('moreBtn').onclick = askMore;
$('banner').addEventListener('click', (e) => { if (e.target.id === 'bannerMore') askMore(); });
$('clearBtn').onclick = () => {
  runId++; curFile = null; S = {}; active = ''; wantMore = false; moreDone = false;
  resetProg();
  $('cmp').value = '';
  $('fileInfo').textContent = t('noFile');
  $('progWrap').classList.add('hidden');
  render();
};
document.addEventListener('click', (e) => {
  const v = e.target.getAttribute && e.target.getAttribute('data-copy');
  if (!v) return;
  const btn = e.target;
  const done = () => { btn.textContent = t('copied'); setTimeout(() => { btn.textContent = t('copy'); }, 1200); };
  if (navigator.clipboard) navigator.clipboard.writeText(v).then(done); else done();
});

render();
