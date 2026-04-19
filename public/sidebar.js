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
