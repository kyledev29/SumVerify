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
  // 2) conditionals and loops
  tpl = tpl.replace(/\{\{#if\s+@(\w+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, body) => (ctx.vars[k] ? body : ''));
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

/** Expands the {name} {bits} {hexLen} {successor} {ext} tokens of the `hashpage` / `hashes` messages for one hash. */
export function hashTexts(messages, h, sep = ' ') {
  const hv = { name: h.name, slug: h.slug, bits: String(h.bits), hexLen: String(h.hexLen), successor: h.successor, ext: h.ext, designer: h.designer, released: h.year, standard: h.standard, variant: h.variant };
  const fill = (str) => str.replace(/\{(\w+)\}/g, (m, k) => (k in hv ? hv[k] : m));
  const hp = mapStrings(messages.hashpage, fill);
  hp.about = fill(messages.hashes?.[h.slug] ?? '');
  hp.secureCurrent = hp.secure[h.tier];
  // "Information about X": a short paragraph built from the facts we actually have for this hash
  hp.infoText = [
    hp.info.size,
    h.designer && h.year ? hp.info.origin : '',
    h.standard ? hp.info.standard : '',
    h.variant ? hp.info.variant : '',
    hp.info.compare,
  ].filter(Boolean).join(sep);
  return hp;
}

/** Everything SEO-related that goes in <head>: robots, keywords, Open Graph, Twitter, verification, JSON-LD. */
function buildSeoHead({ config, desc, page, locale, base, meta, messages, hash, hp }) {
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

  if (page.id === 'home' || hash) {
    const appId = `${url}#app`;
    pageNode.mainEntity = { '@id': appId };
    graph.push({
      '@type': 'WebApplication', '@id': appId, name: hash ? hp.h1 : site.name, url, description: meta.description, inLanguage: lang,
      applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript and WebAssembly', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT', image, featureList: hash ? [hash.name] : config.hashes.map((h) => h.name),
      author: { '@id': ids.person }, sameAs: [site.repo],
    });
    if (!hash) {
      graph.push({
        '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang,
        mainEntity: messages.home.faq.map((f) => ({
          '@type': 'Question', name: stripHtml(f.q), acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.a) },
        })),
      });
    }
  }
  if (page.id !== 'home') {
    if (page.id === 'about') pageNode.mainEntity = { '@id': ids.person };
    const crumb = hash ? hp.crumb : { about: messages.common.nav.about, contact: messages.common.nav.contact, privacy: messages.footer.privacy, terms: messages.footer.terms }[page.id];
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
  const hash = page.hash ? config.hashes.find((h) => h.slug === page.hash) : null;

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
  const hp = hash ? hashTexts(messages, hash, locale.sentenceSep ?? ' ') : null;
  const meta = hash
    ? hp.meta
    : page.multilingual
      ? messages.meta[page.id]
      : { title: page.title, description: page.description, keywords: page.keywords };

  const href = (h) => `${base}${h.slug}-checksum/`;
  const linkText = (h) => messages.hashpage.linkText.replace(/\{name\}/g, h.name);

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

  // "Tools" menu in the nav bar: all hash types, most popular first
  const toolsMenu =
    `<details class="tools relative"><summary class="flex cursor-pointer select-none items-center gap-1 rounded-control px-3 py-1.5 hover:bg-sunken hover:text-ink whitespace-nowrap">${messages.common.nav.tools}` +
    '<svg class="chev h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6l5 5 5-5"/></svg></summary>' +
    '<div class="columns-2 gap-x-2 p-1 text-sm md:absolute md:left-0 md:top-full md:z-40 md:mt-1 md:w-[26rem] md:columns-3 md:rounded-card md:border md:border-line md:bg-surface md:p-2 md:shadow-pop">' +
    config.hashes
      .map((h) => {
        const cur = hash && hash.slug === h.slug;
        return `<a class="block break-inside-avoid rounded-control px-3 py-1.5 hover:bg-sunken hover:text-ink${cur ? ' font-semibold text-ink' : ''}" href="${href(h)}"${cur ? ' aria-current="page"' : ''}>${h.name}</a>`;
      })
      .join('') +
    '</div></details>';

  // home page: grid of all hash pages
  const hashLinks =
    '<ul class="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">' +
    config.hashes
      .map((h) => `<li><a class="block rounded-card border border-line bg-surface px-4 py-3 hover:border-primary" href="${href(h)}"><span class="font-semibold">${linkText(h)}</span><span class="block text-xs text-muted">${messages.hashpage.charsValue.replace('{hexLen}', h.hexLen)}</span></a></li>`)
      .join('') +
    '</ul>';

  const vars = {
    htmlLang: locale.code,
    base,
    canonical: site.url + desc.url,
    year: msgVars.year,
    ...site,
    repoLabel: site.repo.replace(/^https?:\/\//, ''),
    langOptions,
    hreflangLinks,
    toolsMenu,
    hashLinks,
    focus: hash ? hash.name : '',
    moreLabel: hash ? messages.ui.checkOther : messages.home.moreBtn,
    hasLookup: true, // "Known-file lookup" card: home + every hash page (set per page here if you want to hide it)
    hasCmds: hash ? hash.cmds.length > 0 : false,
    seoHead: buildSeoHead({ config, desc, page, locale, base, meta, messages, hash, hp }),
    i18nJson: JSON.stringify(messages.ui).replace(/</g, '\\u003c'),
  };

  if (hash) {
    vars.emptyDigest = hash.empty;
    vars.cmdHtml = hash.cmds
      .map(([label, cmd]) => `<div class="mt-2"><div class="text-xs text-muted">${label}</div><pre class="mt-1 overflow-x-auto rounded-card border border-line bg-sunken p-3 text-xs"><code class="bg-transparent px-0">${escAttr(cmd)}</code></pre></div>`)
      .join('');
    vars.relatedLinks =
      '<ul class="mt-2 flex flex-wrap gap-2">' +
      hash.related
        .map((slug) => config.hashes.find((h) => h.slug === slug))
        .map((h) => `<li><a class="btn btn-secondary btn-sm" href="${href(h)}">${linkText(h)}</a></li>`)
        .join('') +
      '</ul>';
  }

  const ctx = { t: { ...messages, page: meta, ...(hash ? { hashpage: hp, hash: { about: hp.about } } : {}) }, vars };

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
