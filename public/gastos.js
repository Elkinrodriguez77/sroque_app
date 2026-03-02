// Session UI
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

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function todayISO() {
  return new Date().toLocaleDateString('en-CA');
}

function init() {
  document.querySelector('#gastoForm [name="fecha"]').value = todayISO();
  document.getElementById('gastoForm').addEventListener('submit', submitGasto);
  document.getElementById('btnCancelar').addEventListener('click', cancelarEdicion);
  document.getElementById('categoriaSelect').addEventListener('change', onCategoriaChange);
  document.querySelector('#gastoForm [name="monto"]').addEventListener('input', () => {
    const v = Number(document.querySelector('#gastoForm [name="monto"]').value || 0);
    document.getElementById('montoFmt').textContent = fmt.format(v);
  });
}

function onCategoriaChange() {
  const val = document.getElementById('categoriaSelect').value;
  document.getElementById('categoriaOtroWrapper').hidden = val !== 'Otros';
}

async function submitGasto(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const errorsEl = document.getElementById('gastoErrors');
  const msgEl = document.getElementById('gastoMsg');
  errorsEl.textContent = '';
  msgEl.textContent = '';

  try {
    const id = data.id && String(data.id).trim();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/gastos/${id}` : '/api/gastos';
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body?.errors?.join(', ')) || 'Error al guardar';
      return;
    }
    form.reset();
    form.elements['id'].value = '';
    document.querySelector('#gastoForm [name="fecha"]').value = todayISO();
    document.getElementById('formLegend').textContent = 'Registrar gasto';
    document.getElementById('btnCancelar').hidden = true;
    document.getElementById('categoriaOtroWrapper').hidden = true;
    document.getElementById('montoFmt').textContent = '';
    msgEl.innerHTML = '<span style="color:#34d399">Gasto registrado correctamente.</span>';
  } catch {
    errorsEl.textContent = 'Error de red al guardar';
  }
}

function cancelarEdicion() {
  const form = document.getElementById('gastoForm');
  form.reset();
  form.elements['id'].value = '';
  document.querySelector('#gastoForm [name="fecha"]').value = todayISO();
  document.getElementById('formLegend').textContent = 'Registrar gasto';
  document.getElementById('btnCancelar').hidden = true;
  document.getElementById('categoriaOtroWrapper').hidden = true;
  document.getElementById('montoFmt').textContent = '';
  document.getElementById('gastoErrors').textContent = '';
}

document.addEventListener('DOMContentLoaded', init);
