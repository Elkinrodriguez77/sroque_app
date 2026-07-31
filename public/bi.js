const BI_SUPERADMIN_USER = 'kathe_superadmin';
const BI_URL_SUPERADMIN =
  'https://app.powerbi.com/view?r=eyJrIjoiMzYzYjE1NmYtZWJmZC00MmIwLTg3NTctYjdkYjBlNzkxZmRlIiwidCI6IjM2M2I4NjhjLWJjNGEtNGFlMS05NDA1LWNiNWRjMzlmMDk2NyIsImMiOjR9';
const BI_URL_DEFAULT =
  'https://app.powerbi.com/view?r=eyJrIjoiNGVkNjk3MTAtNzdiZS00OWNiLWIzMzUtOTUxNWI1Njc5NTA4IiwidCI6IjM2M2I4NjhjLWJjNGEtNGFlMS05NDA1LWNiNWRjMzlmMDk2NyIsImMiOjR9';
// Dash "Follow Up": solo visible para kathe_superadmin.
const BI_URL_FOLLOWUP =
  'https://app.powerbi.com/view?r=eyJrIjoiMzE5OGY0ZjEtNDVhNC00YjhiLWE2NTItOTRhZTM0ZjQ0MWIwIiwidCI6IjVkNTZhZDFiLTc4NDctNDQ1Yy1hNTBjLTIzMWQ5ZjhlY2NiMiJ9';

let BI_IS_SUPER = false;

const biChooser = document.getElementById('biChooser');
const biShell = document.getElementById('biEmbedShell');
const biFrame = document.getElementById('biEmbedFrame');
const biEmbedName = document.getElementById('biEmbedName');
const btnFs = document.getElementById('btnBiFullscreen');
const btnBack = document.getElementById('btnBiBack');
const cardFollowup = document.getElementById('biCardFollowup');

/** Config de cada dash según la tarjeta elegida (y el usuario). */
function dashConfig(key) {
  if (key === 'followup') {
    return { title: 'Dash KPIs - Follow Up', label: 'Follow Up', src: BI_URL_FOLLOWUP, followup: true };
  }
  return {
    title: BI_IS_SUPER ? 'SanRoqueGerencia_BI' : 'SanRoqueAdmon_BI',
    label: 'Ventas',
    src: BI_IS_SUPER ? BI_URL_SUPERADMIN : BI_URL_DEFAULT,
    followup: false,
  };
}

function openDash(key) {
  const cfg = dashConfig(key);
  if (!cfg.src) return;
  if (biFrame) {
    biFrame.title = cfg.title;
    biFrame.src = cfg.src;
  }
  if (biEmbedName) biEmbedName.textContent = cfg.label;
  if (biShell) biShell.classList.toggle('is-followup', cfg.followup);
  if (biChooser) biChooser.hidden = true;
  if (biShell) biShell.hidden = false;
  biSyncFullscreenButton();
}

function backToChooser() {
  if (biIsFullscreen()) {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
  if (biShell) biShell.hidden = true;
  if (biFrame) biFrame.src = 'about:blank'; // libera el informe para no seguir cargándolo
  if (biChooser) biChooser.hidden = false;
}

(async function loadSession() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login.html'; return; }
    const { nombre, username, esOwner } = await r.json();
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = nombre || username || '';

    // El dueño (rol owner) ve todo, igual que kathe_superadmin.
    BI_IS_SUPER = username === BI_SUPERADMIN_USER || esOwner === true;
    if (cardFollowup) cardFollowup.hidden = !BI_IS_SUPER;
  } catch { window.location.href = '/login.html'; }
})();

document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

document.querySelectorAll('.bi-card[data-dash]').forEach((card) => {
  card.addEventListener('click', () => openDash(card.getAttribute('data-dash')));
});
btnBack?.addEventListener('click', backToChooser);

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
  const label = btnFs.querySelector('.bi-fs-btn-label');
  const text = on ? 'Vista normal' : 'Pantalla completa';
  if (label) label.textContent = text;
  else btnFs.textContent = text;
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
