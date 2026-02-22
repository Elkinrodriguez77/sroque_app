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
  const d = new Date();
  return d.toLocaleDateString('en-CA');
}

document.addEventListener('DOMContentLoaded', () => {
  const today = todayISO();
  document.getElementById('fechaDesde').value = today;
  document.getElementById('fechaHasta').value = today;

  document.getElementById('btnConsultar').addEventListener('click', consultar);
});

async function consultar() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const msg = document.getElementById('dashMsg');
  const body_ = document.getElementById('dashBody');
  const results = document.getElementById('dashResults');
  const summary = document.getElementById('dashSummary');
  msg.textContent = '';
  body_.innerHTML = '';
  results.hidden = true;
  summary.hidden = true;

  if (!desde || !hasta) {
    msg.textContent = 'Selecciona ambas fechas.';
    return;
  }
  if (desde > hasta) {
    msg.textContent = 'La fecha "Desde" no puede ser mayor que "Hasta".';
    return;
  }

  try {
    const resp = await fetch(`/api/dashboard/pedidos-cerrados?desde=${desde}&hasta=${hasta}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.textContent = (data?.errors?.join(', ')) || 'Error al consultar';
      return;
    }

    const rows = data.data || [];
    if (rows.length === 0) {
      msg.textContent = 'No se encontraron servicios cerrados en ese rango.';
      return;
    }

    let totalIngresos = 0;
    let totalServicios = rows.length;
    const serviciosCount = {};

    for (const r of rows) {
      const precioFinal = Number(r.precio_final || 0);
      totalIngresos += precioFinal;
      const svc = r.servicio || 'Otro';
      serviciosCount[svc] = (serviciosCount[svc] || 0) + 1;

      const tr = document.createElement('tr');
      const fechaHora = r.fecha_hora
        ? new Date(r.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      const groomers = [r.groomer1, r.groomer2].filter(Boolean).join(', ');

      tr.innerHTML = `
        <td>${fechaHora}</td>
        <td>${r.nombre_mascota || '-'}</td>
        <td>${r.servicio || '-'}</td>
        <td>${r.tamano || '-'}</td>
        <td>${r.pelaje || '-'}</td>
        <td>${fmt.format(Number(r.precio || 0))}</td>
        <td class="${Number(r.adicionales_descuentos || 0) < 0 ? 'txt-red' : 'txt-green'}">${fmt.format(Number(r.adicionales_descuentos || 0))}</td>
        <td><strong>${fmt.format(precioFinal)}</strong></td>
        <td>${r.metodo_pago || '-'}</td>
        <td>${groomers || '-'}</td>
        <td>${r.telefono_propietario || '-'}</td>
      `;
      body_.appendChild(tr);
    }

    const svcSummary = Object.entries(serviciosCount).map(([k, v]) => `${k}: ${v}`).join(' · ');
    summary.innerHTML = `
      <div class="dash-stat"><span class="dash-stat-label">Total servicios</span><span class="dash-stat-value">${totalServicios}</span></div>
      <div class="dash-stat"><span class="dash-stat-label">Ingresos</span><span class="dash-stat-value">${fmt.format(totalIngresos)}</span></div>
      <div class="dash-stat"><span class="dash-stat-label">Detalle</span><span class="dash-stat-value dash-stat-detail">${svcSummary}</span></div>
    `;
    summary.hidden = false;
    results.hidden = false;
  } catch {
    msg.textContent = 'Error de red al consultar.';
  }
}
