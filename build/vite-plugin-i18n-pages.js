import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath } from 'vite';
import config from '../i18n.config.js';
import { listPages, renderPage, buildSitemap, buildRobots, buildRedirects } from './render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Generates every (locale x page) HTML file from src/templates + i18n/locales,
 * plus sitemap.xml, robots.txt and (optionally) the Bing IndexNow key file.
 * Nothing is stored on disk: it is served in dev and emitted in build.
 */
export default function i18nPages() {
  const pages = listPages(config);
  const byId = new Map(pages.map((p) => [normalizePath(path.join(ROOT, p.file)), p]));
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const { indexNowKey } = config.site;

  // generated, non-HTML files: url -> [content, content-type]
  const extras = () => {
    const out = {
      '/sitemap.xml': [buildSitemap(ROOT, config, pages), 'application/xml; charset=utf-8'],
      '/robots.txt': [buildRobots(config), 'text/plain; charset=utf-8'],
      '/_redirects': [buildRedirects(config), 'text/plain; charset=utf-8'],
    };
    if (indexNowKey) out[`/${indexNowKey}.txt`] = [indexNowKey, 'text/plain; charset=utf-8'];
    return out;
  };

  return {
    name: 'sumverify:i18n-pages',
    enforce: 'pre',

    config() {
      return { build: { rollupOptions: { input: [...byId.keys()] } } };
    },

    buildStart() {
      if (!fs.existsSync(path.join(ROOT, 'public', config.site.ogImage.replace(/^\//, '')))) {
        this.warn(`public${config.site.ogImage} is missing: add a ${config.site.ogImageWidth}x${config.site.ogImageHeight} PNG, otherwise og:image / twitter:image will 404.`);
      }
    },

    resolveId(id) {
      const n = normalizePath(id);
      if (byId.has(n)) return n;
    },

    load(id) {
      const p = byId.get(normalizePath(id));
      if (p) return renderPage(ROOT, config, p);
    },

    generateBundle() {
      for (const [url, [source]] of Object.entries(extras())) this.emitFile({ type: 'asset', fileName: url.slice(1), source });
    },

    configureServer(server) {
      server.watcher.add([path.join(ROOT, 'i18n'), path.join(ROOT, 'src/templates'), path.join(ROOT, 'i18n.config.js')]);
      server.watcher.on('change', (file) => {
        const f = normalizePath(file);
        if (f.includes('/i18n/') || f.includes('/src/templates/')) server.ws.send({ type: 'full-reload' });
      });

      server.middlewares.use(async (req, res, next) => {
        try {
          const raw = decodeURIComponent((req.url || '').split('?')[0].split('#')[0]);
          const extra = extras()[raw];
          if (extra) {
            res.statusCode = 200;
            res.setHeader('Content-Type', extra[1]);
            return res.end(extra[0]);
          }
          const clean = raw.replace(/index\.html$/, '');
          const page = byUrl.get(clean.endsWith('/') ? clean : `${clean}/`);
          if (!page) return next();
          const html = await server.transformIndexHtml(req.url, renderPage(ROOT, config, page));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}
