import HASHES from './i18n/hashes.js';

/**
 * Single source of truth for the multilingual build.
 *
 *  - site:    values shared by every page (also usable in locale strings as {email}, {githubLink}, ...)
 *  - locales: add a language = add one entry here + one file i18n/locales/<code>.json
 *  - pages:   one template per page (src/templates/pages/<template|id>.html)
 *             multilingual:true  -> built once per locale (/, /ja/, /ja/about/ ...)
 *             multilingual:false -> English only, built once (/privacy/, /terms/)
 */
export default {
  site: {
    name: 'SumVerify',
    url: 'https://sumverify.com',
    author: 'Kyle',
    email: 'nguyenhuuhoa@proton.me',
    github: 'https://github.com/kyledev29',
    repo: 'https://github.com/kyledev29/SumVerify',

    // --- SEO ---
    ogImage: '/og-image.png',   // put your 1200x630 PNG at public/og-image.png
    ogImageWidth: 1200,
    ogImageHeight: 630,
    twitter: '',                // e.g. '@yourhandle' (optional)
    verification: {             // paste the content="" value from each webmaster console (optional)
      google: '',               // Google Search Console -> HTML tag
      bing: '',                 // Bing Webmaster Tools  -> HTML meta tag (msvalidate.01)
    },
    indexNowKey: '',            // optional: 8-128 hex chars; emits /<key>.txt for Bing IndexNow
  },

  hashes: HASHES, // 21 hash types -> /<slug>-checksum/ pages, Tools menu, checker order

  defaultLocale: 'en', // served at "/", others at "/<code>/"

  locales: [
    { code: 'en', label: 'English', og: 'en_US' },
    { code: 'zh-CN', label: '简体中文', og: 'zh_CN', sentenceSep: '' },
    { code: 'ja', label: '日本語', og: 'ja_JP', sentenceSep: '' },
    { code: 'ko', label: '한국어', og: 'ko_KR' },
    { code: 'fr', label: 'Français', og: 'fr_FR' },
    { code: 'de', label: 'Deutsch', og: 'de_DE' },
    { code: 'es', label: 'Español', og: 'es_ES' },
    { code: 'pt-BR', label: 'Português (BR)', og: 'pt_BR' },
    { code: 'id', label: 'Indonesia', og: 'id_ID' },
    { code: 'vi', label: 'Tiếng Việt', og: 'vi_VN' },
    { code: 'ru', label: 'Русский', og: 'ru_RU' },
    { code: 'th', label: 'ไทย', og: 'th_TH' },
  ],

  pages: [
    ...HASHES.map((h) => ({ id: `hash-${h.slug}`, template: 'hash', hash: h.slug, path: `${h.slug}-checksum/`, multilingual: true })),
    { id: 'home', path: '', multilingual: true },
    { id: 'about', path: 'about/', multilingual: true },
    { id: 'contact', path: 'contact/', multilingual: true },
    {
      id: 'privacy', path: 'privacy/', multilingual: false,
      title: 'Privacy Policy – SumVerify',
      keywords: 'SumVerify privacy policy, checksum calculator privacy, no file upload, local file hashing',
      description: 'How SumVerify handles your data: files are hashed in your browser and never uploaded. No accounts, no tracking cookies.',
    },
    {
      id: 'terms', path: 'terms/', multilingual: false,
      title: 'Terms of Use – SumVerify',
      keywords: 'SumVerify terms of use, checksum calculator terms, free file verifier terms',
      description: 'The terms for using SumVerify, a free browser-based checksum calculator and file verifier, provided as is under the MIT licence.',
    },
  ],
};
