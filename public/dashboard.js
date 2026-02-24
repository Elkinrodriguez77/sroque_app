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

function buildPagosTab(rows) {
  const pagos = {};
  for (const r of rows) {
    const precioFinal = Number(r.precio_final || 0);
    if (r.metodo_pago === 'Mixto' && r.metodo_pago_1 && r.metodo_pago_2) {
      const m1 = r.metodo_pago_1;
      const m2 = r.metodo_pago_2;
      const v1 = Number(r.monto_pago_1 || 0);
      const v2 = Number(r.monto_pago_2 || 0);
      if (!pagos[m1]) pagos[m1] = { count: 0, total: 0 };
      pagos[m1].count += 1;
      pagos[m1].total += v1;
      if (!pagos[m2]) pagos[m2] = { count: 0, total: 0 };
      pagos[m2].count += 1;
      pagos[m2].total += v2;
    } else {
      const m = r.metodo_pago || 'Sin especificar';
      if (!pagos[m]) pagos[m] = { count: 0, total: 0 };
      pagos[m].count += 1;
      pagos[m].total += precioFinal;
    }
  }
  const body = document.getElementById('dashPagosBody');
  body.innerHTML = '';
  const sorted = Object.entries(pagos).sort((a, b) => b[1].total - a[1].total);
  for (const [metodo, { count, total }] of sorted) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${metodo}</td>
      <td>${count}</td>
      <td><strong>${fmt.format(total)}</strong></td>
    `;
    body.appendChild(tr);
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.dash-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  document.getElementById('dashTabPedidos').hidden = tabName !== 'pedidos';
  document.getElementById('dashTabPagos').hidden = tabName !== 'pagos';
}

document.addEventListener('DOMContentLoaded', () => {
  const today = todayISO();
  document.getElementById('fechaDesde').value = today;
  document.getElementById('fechaHasta').value = today;

  document.getElementById('btnConsultar').addEventListener('click', consultar);

  document.querySelectorAll('.dash-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

async function consultar() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const estado = document.getElementById('filtroEstado').value;
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
    const resp = await fetch(`/api/dashboard/pedidos?desde=${desde}&hasta=${hasta}&estado=${estado}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.textContent = (data?.errors?.join(', ')) || 'Error al consultar';
      return;
    }

    const rows = data.data || [];
    if (rows.length === 0) {
      msg.textContent = 'No se encontraron pedidos en ese rango.';
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
        <td>${r.nombre_propietario || '-'}</td>
        <td>${r.nombre_mascota || '-'}</td>
        <td>${r.servicio || '-'}</td>
        <td>${r.piso || '-'}</td>
        <td>${r.tamano || '-'}</td>
        <td>${r.pelaje || '-'}</td>
        <td>${fmt.format(Number(r.precio || 0))}</td>
        <td class="${Number(r.adicionales_descuentos || 0) < 0 ? 'txt-red' : 'txt-green'}">${fmt.format(Number(r.adicionales_descuentos || 0))}</td>
        <td><strong>${fmt.format(precioFinal)}</strong></td>
        <td>${r.metodo_pago === 'Mixto' && r.metodo_pago_1 ? `Mixto: ${r.metodo_pago_1} + ${r.metodo_pago_2}` : (r.metodo_pago || '-')}</td>
        <td>${groomers || '-'}</td>
        <td>${r.telefono_propietario || '-'}</td>
      `;
      body_.appendChild(tr);
    }

    buildPagosTab(rows);

    const svcSummary = Object.entries(serviciosCount).map(([k, v]) => `${k}: ${v}`).join(' · ');
    summary.innerHTML = `
      <div class="dash-stat"><span class="dash-stat-label">Total servicios</span><span class="dash-stat-value">${totalServicios}</span></div>
      <div class="dash-stat"><span class="dash-stat-label">Ingresos</span><span class="dash-stat-value">${fmt.format(totalIngresos)}</span></div>
      <div class="dash-stat"><span class="dash-stat-label">Detalle</span><span class="dash-stat-value dash-stat-detail">${svcSummary}</span></div>
    `;
    summary.hidden = false;
    results.hidden = false;
    switchTab('pedidos');
  } catch {
    msg.textContent = 'Error de red al consultar.';
  }
}
