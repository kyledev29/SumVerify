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
  },

  defaultLocale: 'en', // served at "/", others at "/<code>/"

  locales: [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'pt-BR', label: 'Português (BR)' },
    { code: 'id', label: 'Indonesia' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'ru', label: 'Русский' },
    { code: 'th', label: 'ไทย' },
  ],

  pages: [
    { id: 'home', path: '', multilingual: true },
    { id: 'about', path: 'about/', multilingual: true },
    { id: 'contact', path: 'contact/', multilingual: true },
    {
      id: 'privacy', path: 'privacy/', multilingual: false,
      title: 'Privacy Policy – SumVerify',
      description: 'How SumVerify handles your data: files are processed in your browser and never uploaded.',
    },
    {
      id: 'terms', path: 'terms/', multilingual: false,
      title: 'Terms of Use – SumVerify',
      description: 'The terms for using SumVerify, a free browser-based checksum calculator.',
    },
  ],
};
