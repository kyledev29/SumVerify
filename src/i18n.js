// Runtime translations: the "ui" namespace of the current locale is embedded in every page
// as <script type="application/json" id="i18n-data"> (see src/templates/layout.html).
let data = {};
try {
  data = JSON.parse(document.getElementById('i18n-data').textContent);
} catch (e) { /* keys fall back to themselves */ }

export function t(key, vars) {
  const s = data[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
