const form = document.getElementById('cambiarForm');
const errorsEl = document.getElementById('cambiarErrors');
const btn = document.getElementById('btnCambiar');
const motivoEl = document.getElementById('motivoTexto');

/** Si llegó aquí por caducidad, mostramos el motivo real que reporta el servidor. */
(async function cargarEstado() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login.html'; return; }
    const me = await r.json();
    if (me.passwordMotivo && motivoEl) {
      motivoEl.textContent = me.passwordMotivo;
      motivoEl.classList.add('pw-motivo-alerta');
    } else if (motivoEl && me.username) {
      motivoEl.textContent = `Define una contraseña nueva para la cuenta "${me.username}".`;
    }
  } catch { window.location.href = '/login.html'; }
})();

document.getElementById('linkSalir')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorsEl.textContent = '';
  errorsEl.classList.remove('login-ok');

  const data = Object.fromEntries(new FormData(form).entries());
  if (data.password_nueva !== data.password_confirmar) {
    errorsEl.textContent = 'La confirmación no coincide con la contraseña nueva.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    const resp = await fetch('/api/cambiar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      errorsEl.textContent = (body?.errors?.join(' · ')) || 'No se pudo cambiar la contraseña.';
      btn.disabled = false;
      btn.textContent = 'Guardar contraseña';
      return;
    }
    errorsEl.classList.add('login-ok');
    errorsEl.textContent = 'Contraseña actualizada. Entrando...';
    setTimeout(() => { window.location.href = '/'; }, 900);
  } catch {
    errorsEl.textContent = 'Error de red al guardar la contraseña.';
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
  }
});
