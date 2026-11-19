import { defineConfig } from 'vite';
import i18nPages from './build/vite-plugin-i18n-pages.js';

export default defineConfig({
  appType: 'mpa', // multi-page: /about/ -> about/index.html, no SPA fallback
  plugins: [i18nPages()],
  build: { outDir: 'dist', emptyOutDir: true },
});
