/**
 * Pure rendering logic (no Vite imports) so it can be used by the Vite plugin
 * and by scripts/tests alike.
 *
 * Template syntax (src/templates/**):
 *   {{path.to.key}}        message from the locale JSON (HTML allowed)
 *   {{path.to.key|attr}}   same, escaped for use inside an HTML attribute
 *   {{@name}}              build-time variable (base, canonical, langOptions, ...)
 *   {{> partial}}          include src/templates/partials/partial.html
 *   {{#each path}}..{{.}} / {{.key}} ..{{/each}}   loop over an array in the messages
 *
 * Locale strings may also use {githubLink}, {emailLink}, {github}, {repo}, {email}, {author}, {year}.
 * Any other {token} (e.g. {n}, {name}) is left untouched for runtime use in the browser.
 */
import fs from 'node:fs';
import path from 'node:path';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const read = (root, ...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

export const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function merge(base, over) {
  if (over === undefined) return base;
  if (!isObj(base) || !isObj(over)) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
  return out;
}

function mapStrings(v, fn) {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  return v;
}

const warned = new Set();
const warn = (msg) => {
  if (!warned.has(msg)) { warned.add(msg); console.warn(`[i18n] ${msg}`); }
};

/** Locale messages merged over the default locale (missing keys fall back to English). */
export function loadMessages(root, config, code, vars) {
  const file = (c) => JSON.parse(read(root, 'i18n', 'locales', `${c}.json`));
  let msgs = file(config.defaultLocale);
  if (code !== config.defaultLocale) msgs = merge(msgs, file(code));
  return mapStrings(msgs, (s) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)));
}

export function listPages(config) {
  const out = [];
  for (const page of config.pages) {
    const locales = page.multilingual ? config.locales : config.locales.filter((l) => l.code === config.defaultLocale);
    for (const l of locales) {
      const prefix = l.code === config.defaultLocale ? '' : `${l.code}/`;
      const url = `/${prefix}${page.path}`;
      out.push({ id: page.id, locale: l.code, url, file: `${url.slice(1)}index.html`, multilingual: page.multilingual });
    }
  }
  return out;
}

function renderTemplate(root, tpl, ctx, where) {
  // 1) partials (may nest)
  for (let i = 0; i < 4 && /\{\{>/.test(tpl); i++) {
    tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => read(root, 'src/templates/partials', `${n}.html`));
  }
  // 2) loops
  tpl = tpl.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, p, body) => {
    const arr = get(ctx.t, p);
    if (!Array.isArray(arr)) { warn(`${where}: "${p}" is not an array`); return ''; }
    return arr
      .map((item) =>
        body.replace(/\{\{\.([\w.]*)(\|attr)?\s*\}\}/g, (_m, k, f) => {
          const v = k ? get(item, k) : item;
          if (v == null) { warn(`${where}: missing "${p}[].${k}"`); return ''; }
          return f ? escAttr(v) : String(v);
        }))
      .join('');
  });
  // 3) variables and messages
  return tpl.replace(/\{\{\s*(@)?([\w.]+)(\|attr)?\s*\}\}/g, (_, at, key, f) => {
    const v = at ? ctx.vars[key] : get(ctx.t, key);
    if (v == null) { warn(`${where}: missing "${at ? '@' : ''}${key}"`); return ''; }
    return f ? escAttr(v) : String(v);
  });
}

export function renderPage(root, config, desc) {
  const { site } = config;
  const page = config.pages.find((p) => p.id === desc.id);
  const locale = config.locales.find((l) => l.code === desc.locale);
  const isDefault = desc.locale === config.defaultLocale;
  const base = `/${isDefault ? '' : `${desc.locale}/`}`;

  const msgVars = {
    author: site.author,
    email: site.email,
    github: site.github,
    repo: site.repo,
    year: String(new Date().getFullYear()),
    githubLink: `<a class="underline text-primary" href="${site.repo}" target="_blank" rel="noopener">GitHub</a>`,
    emailLink: `<a class="underline text-primary" href="mailto:${site.email}">${site.email}</a>`,
  };
  const messages = loadMessages(root, config, desc.locale, msgVars);

  // language switcher: same page in another locale, or the locale home for English-only pages
  const langOptions = config.locales
    .map((l) => {
      const prefix = l.code === config.defaultLocale ? '' : `${l.code}/`;
      const value = `/${prefix}${page.multilingual ? page.path : ''}`;
      const selected = page.multilingual ? l.code === desc.locale : l.code === config.defaultLocale;
      return `<option value="${value}"${selected ? ' selected' : ''}>${l.label}</option>`;
    })
    .join('');

  const hreflangLinks = page.multilingual
    ? [
        ...config.locales.map((l) => {
          const prefix = l.code === config.defaultLocale ? '' : `${l.code}/`;
          return `<link rel="alternate" hreflang="${l.code}" href="${site.url}/${prefix}${page.path}">`;
        }),
        `<link rel="alternate" hreflang="x-default" href="${site.url}/${page.path}">`,
      ].join('\n')
    : '';

  const ctx = {
    t: { ...messages, page: page.multilingual ? messages.meta[page.id] : { title: page.title, description: page.description } },
    vars: {
      htmlLang: locale.code,
      base,
      canonical: site.url + desc.url,
      year: msgVars.year,
      ...site,
      repoLabel: site.repo.replace(/^https?:\/\//, ''),
      langOptions,
      hreflangLinks,
      i18nJson: JSON.stringify(messages.ui).replace(/</g, '\\u003c'),
    },
  };

  const where = `${desc.locale}:${desc.id}`;
  ctx.vars.content = renderTemplate(root, read(root, 'src/templates/pages', `${page.template || page.id}.html`), ctx, where);
  return renderTemplate(root, read(root, 'src/templates/layout.html'), ctx, where);
}

export function buildSitemap(config, pages) {
  const { url } = config.site;
  const rows = pages.map((p) => {
    const alts = p.multilingual
      ? pages
          .filter((q) => q.id === p.id)
          .map((q) => `<xhtml:link rel="alternate" hreflang="${q.locale}" href="${url}${q.url}"/>`)
          .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${url}${pages.find((q) => q.id === p.id && q.locale === config.defaultLocale).url}"/>`)
          .join('')
      : '';
    return `<url><loc>${url}${p.url}</loc>${alts}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}
