/**
 * Menú lateral: en escritorio se expande al pasar el ratón (mostrar texto).
 * En móvil, botón «Menú» abre/cierra el panel y el fondo lo cierra.
 */
(function () {
  const sidebar = document.getElementById('appSidebar');
  const toggles = document.querySelectorAll('.js-sidebar-toggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  const mqMobile = window.matchMedia('(max-width: 900px)');

  function setExpanded(val) {
    toggles.forEach((btn) => btn.setAttribute('aria-expanded', val ? 'true' : 'false'));
  }

  function closeMobile() {
    document.body.classList.remove('sidebar-mobile-open');
    backdrop?.setAttribute('hidden', '');
    setExpanded(false);
  }

  function openMobile() {
    document.body.classList.add('sidebar-mobile-open');
    backdrop?.removeAttribute('hidden');
    setExpanded(true);
  }

  function onToggleClick() {
    if (!mqMobile.matches) return;
    if (document.body.classList.contains('sidebar-mobile-open')) closeMobile();
    else openMobile();
  }

  toggles.forEach((btn) => btn.addEventListener('click', onToggleClick));

  backdrop?.addEventListener('click', closeMobile);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-mobile-open')) {
      closeMobile();
    }
  });

  mqMobile.addEventListener('change', () => {
    if (!mqMobile.matches) closeMobile();
  });

  function pathMatches(href) {
    const p = location.pathname;
    const file = href.replace(/^\//, '');
    if (file === '' || file === 'index.html') {
      return p === '/' || p === '' || p.endsWith('/index.html');
    }
    return p.endsWith(file);
  }

  document.querySelectorAll('.sidebar-link[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (pathMatches(href)) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
})();

/** Agrega "Exportar datos" al menú, justo antes de "Acerca de". */
function agregarEnlaceExportar() {
  const lista = document.querySelector('.sidebar-list');
  if (!lista || lista.querySelector('a[href="/exportar.html"]')) return;

  const li = document.createElement('li');
  li.innerHTML = `
    <a href="/exportar.html" class="sidebar-link">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
      <span class="sidebar-label">Exportar datos</span>
    </a>`;

  const acerca = lista.querySelector('a[href="/acerca.html"]');
  if (acerca && acerca.closest('li')) lista.insertBefore(li, acerca.closest('li'));
  else lista.appendChild(li);

  // El enlace se agregó después de marcar la página activa: se marca aquí.
  if (location.pathname.endsWith('exportar.html')) {
    const a = li.querySelector('a');
    a.classList.add('active');
    a.setAttribute('aria-current', 'page');
  }
}

/**
 * Aviso de contraseña próxima a caducar. Se muestra en todas las páginas para
 * que nadie se entere el día que ya no puede entrar.
 */
(async function avisoPassword() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) return;
    const me = await r.json();
    if (me.mustChangePassword) {
      window.location.href = '/cambiar-password.html';
      return;
    }

    /*
     * "Exportar datos" se inyecta solo para las cuentas autorizadas, en vez de
     * dejarlo en el HTML y ocultarlo: así no aparece un instante antes de que
     * cargue el JS. De todos modos es cosmético, el permiso lo valida el servidor.
     */
    if (me.puedeExportar) agregarEnlaceExportar();
    if (!me.passwordPorCaducar || me.passwordDiasRestantes == null) return;

    const dias = me.passwordDiasRestantes;
    const bar = document.createElement('div');
    bar.className = 'pw-warning-bar';
    bar.innerHTML = `
      <span class="pw-warning-text">
        Tu contraseña caduca en <strong>${dias} día${dias === 1 ? '' : 's'}</strong>.
      </span>
      <a class="pw-warning-link" href="/cambiar-password.html">Cambiarla ahora</a>
      <button type="button" class="pw-warning-close" aria-label="Ocultar aviso">&times;</button>
    `;
    bar.querySelector('.pw-warning-close').addEventListener('click', () => bar.remove());
    document.body.appendChild(bar);
  } catch { /* el aviso es informativo: si falla, no molestamos */ }
})();
