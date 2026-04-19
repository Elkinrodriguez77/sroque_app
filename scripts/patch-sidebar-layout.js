const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public');

const mobileOld = /<header class="app-mobile-bar"[^>]*>[\s\S]*?<\/header>\s*\n/;
const mobileNew = `<header class="app-mobile-bar" aria-label="Barra móvil">
  <button type="button" class="app-mobile-menu-btn js-sidebar-toggle" aria-label="Abrir menú lateral" aria-expanded="false">Menú</button>
  <span class="app-mobile-title">San Roque</span>
</header>
`;

const headRe = /<div class="sidebar-head">[\s\S]*?<\/div>\s*/;

const shellRe = /<div class="app-shell">\s*\n(?![\s\S]*?app-floating-logo)/;

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.html')) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('<div class="app-shell">')) continue;

  s = s.replace(headRe, '');
  if (s.includes('app-mobile-bar')) {
    s = s.replace(mobileOld, mobileNew);
  }
  if (!s.includes('app-floating-logo')) {
    s = s.replace(
      /<div class="app-shell">(\s*\n)/,
      `<div class="app-shell">$1<a href="/" class="app-floating-logo" aria-label="San Roque, inicio"><img src="/img/logo_san_roque.png" alt="San Roque" decoding="async" /></a>$1`
    );
  }

  fs.writeFileSync(p, s);
  console.log('patched', f);
}
