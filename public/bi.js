(async function loadSession() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login.html'; return; }
    const { nombre, username } = await r.json();
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = nombre || username || '';
  } catch { window.location.href = '/login.html'; }
})();
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

const biShell = document.getElementById('biEmbedShell');
const btnFs = document.getElementById('btnBiFullscreen');

function biFullscreenElement() {
  return (
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
    || null
  );
}

function biIsFullscreen() {
  return biShell && biFullscreenElement() === biShell;
}

function biSyncFullscreenButton() {
  if (!btnFs) return;
  const on = biIsFullscreen();
  btnFs.textContent = on ? 'Vista normal' : 'Pantalla completa';
  btnFs.setAttribute('aria-pressed', on ? 'true' : 'false');
  btnFs.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Ver informe en pantalla completa');
}

async function biToggleFullscreen() {
  if (!biShell) return;
  try {
    if (!biIsFullscreen()) {
      if (biShell.requestFullscreen) await biShell.requestFullscreen();
      else if (biShell.webkitRequestFullscreen) biShell.webkitRequestFullscreen();
      else if (biShell.msRequestFullscreen) biShell.msRequestFullscreen();
    } else if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  } catch {
    /* algunos navegadores bloquean fullscreen sin gesto del usuario */
  }
  biSyncFullscreenButton();
}

btnFs?.addEventListener('click', biToggleFullscreen);
['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'].forEach((ev) => {
  document.addEventListener(ev, biSyncFullscreenButton);
});
biSyncFullscreenButton();
