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
console.log(problems ? `[i18n] ${problems} issue(s) found.` : '[i18n] all locales complete.');
if (problems && process.argv.includes('--strict')) process.exit(1);
