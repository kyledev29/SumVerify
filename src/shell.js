import { t } from './i18n.js';

/** Theme toggle, language switcher and mobile menu: shared by every page. */
export function initShell() {
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const v = root.getAttribute('data-theme');
    return v ? v === 'dark' : mq.matches;
  };
  const syncLabels = () => {
    const label = t(isDark() ? 'themeLight' : 'themeDark');
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => { b.textContent = label; });
  };

  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.onclick = () => {
      const next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('sv-theme', next); } catch (e) { /* ignore */ }
      syncLabels();
    };
  });
  try { mq.addEventListener('change', syncLabels); } catch (e) { /* old browsers */ }
  document.querySelectorAll('.lang').forEach((s) => { s.onchange = () => { location.href = s.value; }; });

  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');
  if (btn && menu) {
    btn.onclick = () => {
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
      btn.setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
    };
  }

  // "Tools" dropdown: close on outside click, Escape, or choosing a link
  const tools = document.querySelectorAll('details.tools');
  document.addEventListener('click', (e) => tools.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tools.forEach((d) => { d.open = false; }); });
  syncLabels();
}
