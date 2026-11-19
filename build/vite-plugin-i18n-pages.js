import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath } from 'vite';
import config from '../i18n.config.js';
import { listPages, renderPage, buildSitemap } from './render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Generates every (locale x page) HTML file from src/templates + i18n/locales.
 * The HTML files do not exist on disk: they are served in dev and emitted in build.
 */
export default function i18nPages() {
  const pages = listPages(config);
  const byId = new Map(pages.map((p) => [normalizePath(path.join(ROOT, p.file)), p]));
  const byUrl = new Map(pages.map((p) => [p.url, p]));

  return {
    name: 'sumverify:i18n-pages',
    enforce: 'pre',

    config() {
      return { build: { rollupOptions: { input: [...byId.keys()] } } };
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
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(config, pages) });
    },

    configureServer(server) {
      server.watcher.add([path.join(ROOT, 'i18n'), path.join(ROOT, 'src/templates'), path.join(ROOT, 'i18n.config.js')]);
      server.watcher.on('change', (file) => {
        const f = normalizePath(file);
        if (f.includes('/i18n/') || f.includes('/src/templates/')) server.ws.send({ type: 'full-reload' });
      });

      server.middlewares.use(async (req, res, next) => {
        try {
          const clean = decodeURIComponent((req.url || '').split('?')[0].split('#')[0]).replace(/index\.html$/, '');
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
