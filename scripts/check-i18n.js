// Compares every locale against the default one. Missing keys fall back to English at build time;
// this script just tells you what is still untranslated. Use --strict to fail the build instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../i18n.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (c) => JSON.parse(fs.readFileSync(path.join(root, 'i18n/locales', `${c}.json`), 'utf8'));

function flat(v, p = '', out = {}) {
  if (typeof v === 'string') out[p] = v;
  else if (Array.isArray(v)) v.forEach((x, i) => flat(x, `${p}[${i}]`, out));
  else Object.entries(v).forEach(([k, x]) => flat(x, p ? `${p}.${k}` : k, out));
  return out;
}
const tokens = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

const base = flat(load(config.defaultLocale));
let problems = 0;
for (const { code } of config.locales) {
  if (code === config.defaultLocale) continue;
  let msgs;
  try { msgs = flat(load(code)); } catch (e) { console.warn(`[i18n] ${code}: cannot read file (${e.message})`); problems++; continue; }
  const missing = Object.keys(base).filter((k) => !(k in msgs));
  const extra = Object.keys(msgs).filter((k) => !(k in base));
  const badTokens = Object.keys(msgs).filter((k) => k in base && tokens(base[k]) !== tokens(msgs[k]));
  if (missing.length) console.warn(`[i18n] ${code}: ${missing.length} missing -> ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
  if (extra.length) console.warn(`[i18n] ${code}: ${extra.length} unknown keys -> ${extra.join(', ')}`);
  if (badTokens.length) console.warn(`[i18n] ${code}: {placeholder} mismatch -> ${badTokens.join(', ')}`);
  problems += missing.length + extra.length + badTokens.length;
}

// SEO lint: Google truncates titles at ~60 and descriptions at ~160 Latin characters (CJK counts double).
const width = (str) => [...str].reduce((n, c) => n + (c.codePointAt(0) >= 0x2e80 ? 2 : 1), 0);
for (const { code } of config.locales) {
  const m = flat(load(code));
  for (const k of Object.keys(m)) {
    if (/^meta\.\w+\.title$/.test(k) && width(m[k]) > 62) console.warn(`[seo] ${code}: ${k} is ${width(m[k])} wide (aim <= 60)`);
    if (/^meta\.\w+\.description$/.test(k) && width(m[k]) > 160) console.warn(`[seo] ${code}: ${k} is ${width(m[k])} wide (aim <= 160)`);
  }
}
for (const p of config.pages.filter((x) => !x.multilingual)) {
  if (width(p.title) > 62 || width(p.description) > 160) console.warn(`[seo] config page ${p.id}: title/description too long`);
}
console.log(problems ? `[i18n] ${problems} issue(s) found.` : '[i18n] all locales complete.');
if (problems && process.argv.includes('--strict')) process.exit(1);
