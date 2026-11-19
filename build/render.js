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

const stripHtml = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ldJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const FEATURES = ['SHA-256', 'MD5', 'SHA-1', 'SHA-512', 'CRC32', 'CRC32C', 'BLAKE2b', 'BLAKE3', 'SHA-384', 'SHA3-256', 'SHA-224', 'SHA3-512', 'BLAKE2s', 'SHA3-384', 'SHA3-224', 'MD4', 'Adler-32', 'CRC16', 'Fletcher-32', 'Fletcher-16', 'CRC8'];

/** Everything SEO-related that goes in <head>: robots, keywords, Open Graph, Twitter, verification, JSON-LD. */
function buildSeoHead({ config, desc, page, locale, base, meta, messages }) {
  const { site } = config;
  const url = site.url + desc.url;
  const image = site.url + site.ogImage;
  const lang = desc.locale;
  const a = escAttr;
  const tags = [
    `<meta name="robots" content="${page.robots || ROBOTS}">`,
    `<meta name="author" content="${a(site.author)}">`,
    meta.keywords ? `<meta name="keywords" content="${a(meta.keywords)}">` : '',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="theme-color" content="#f7f8fa" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#101319" media="(prefers-color-scheme: dark)">',
    site.verification?.google ? `<meta name="google-site-verification" content="${a(site.verification.google)}">` : '',
    site.verification?.bing ? `<meta name="msvalidate.01" content="${a(site.verification.bing)}">` : '',
    // Open Graph
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${a(site.name)}">`,
    `<meta property="og:title" content="${a(meta.title)}">`,
    `<meta property="og:description" content="${a(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:type" content="image/png">',
    `<meta property="og:image:width" content="${site.ogImageWidth}">`,
    `<meta property="og:image:height" content="${site.ogImageHeight}">`,
    `<meta property="og:image:alt" content="${a(messages.meta.imageAlt)}">`,
    `<meta property="og:locale" content="${locale.og}">`,
    ...(page.multilingual
      ? config.locales.filter((l) => l.code !== lang).map((l) => `<meta property="og:locale:alternate" content="${l.og}">`)
      : []),
    // Twitter / X
    '<meta name="twitter:card" content="summary_large_image">',
    site.twitter ? `<meta name="twitter:site" content="${a(site.twitter)}">` : '',
    `<meta name="twitter:title" content="${a(meta.title)}">`,
    `<meta name="twitter:description" content="${a(meta.description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${a(messages.meta.imageAlt)}">`,
  ].filter(Boolean);

  // ---- JSON-LD (@graph) ----
  const ids = { person: `${site.url}/#author`, site: `${site.url}${base}#website`, page: `${url}#webpage` };
  const person = { '@type': 'Person', '@id': ids.person, name: site.author, url: site.github, email: site.email, sameAs: [site.github] };
  const website = { '@type': 'WebSite', '@id': ids.site, url: site.url + base, name: site.name, inLanguage: lang, publisher: { '@id': ids.person } };
  const pageNode = {
    '@type': { about: 'AboutPage', contact: 'ContactPage' }[page.id] || 'WebPage',
    '@id': ids.page, url, name: meta.title, description: meta.description, inLanguage: lang,
    isPartOf: { '@id': ids.site },
    primaryImageOfPage: { '@type': 'ImageObject', url: image, width: site.ogImageWidth, height: site.ogImageHeight },
  };
  const graph = [website, pageNode, person];

  if (page.id === 'home') {
    const appId = `${url}#app`;
    pageNode.mainEntity = { '@id': appId };
    graph.push({
      '@type': 'WebApplication', '@id': appId, name: site.name, url, description: meta.description, inLanguage: lang,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript and WebAssembly', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT', image, featureList: FEATURES,
      author: { '@id': ids.person }, sameAs: [site.repo],
    });
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang,
      mainEntity: messages.home.faq.map((f) => ({
        '@type': 'Question', name: stripHtml(f.q), acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.a) },
      })),
    });
  } else {
    if (page.id === 'about') pageNode.mainEntity = { '@id': ids.person };
    const crumb = { about: messages.common.nav.about, contact: messages.common.nav.contact, privacy: messages.footer.privacy, terms: messages.footer.terms }[page.id];
    pageNode.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: messages.common.nav.home, item: site.url + base },
        { '@type': 'ListItem', position: 2, name: crumb, item: url },
      ],
    });
  }
  tags.push(`<script type="application/ld+json">${ldJson({ '@context': 'https://schema.org', '@graph': graph })}</script>`);
  return tags.join('\n');
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
  const meta = page.multilingual
    ? messages.meta[page.id]
    : { title: page.title, description: page.description, keywords: page.keywords };

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
    t: { ...messages, page: meta },
    vars: {
      htmlLang: locale.code,
      base,
      canonical: site.url + desc.url,
      year: msgVars.year,
      ...site,
      repoLabel: site.repo.replace(/^https?:\/\//, ''),
      langOptions,
      hreflangLinks,
      seoHead: buildSeoHead({ config, desc, page, locale, base, meta, messages }),
      i18nJson: JSON.stringify(messages.ui).replace(/</g, '\\u003c'),
    },
  };

  const where = `${desc.locale}:${desc.id}`;
  ctx.vars.content = renderTemplate(root, read(root, 'src/templates/pages', `${page.template || page.id}.html`), ctx, where);
  return renderTemplate(root, read(root, 'src/templates/layout.html'), ctx, where);
}

/** YYYY-MM-DD of the newest source file that feeds a page (template + its locale JSON). */
function lastmod(root, config, p) {
  const page = config.pages.find((x) => x.id === p.id);
  const files = [path.join(root, 'src/templates/pages', `${page.template || page.id}.html`), path.join(root, 'i18n/locales', `${p.locale}.json`)];
  const t = Math.max(...files.map((f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }));
  return new Date(t || Date.now()).toISOString().slice(0, 10);
}

export function buildSitemap(root, config, pages) {
  const { url } = config.site;
  const rows = pages.map((p) => {
    const alts = p.multilingual
      ? pages
          .filter((q) => q.id === p.id)
          .map((q) => `<xhtml:link rel="alternate" hreflang="${q.locale}" href="${url}${q.url}"/>`)
          .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${url}${pages.find((q) => q.id === p.id && q.locale === config.defaultLocale).url}"/>`)
          .join('')
      : '';
    return `<url><loc>${url}${p.url}</loc><lastmod>${lastmod(root, config, p)}</lastmod>${alts}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

export function buildRobots(config) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${config.site.url}/sitemap.xml\n`;
}
