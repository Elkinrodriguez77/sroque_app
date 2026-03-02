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

let currentMode = 'ingresos';

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.dash-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('secIngresos').hidden = mode !== 'ingresos';
  document.getElementById('secGastos').hidden = mode !== 'gastos';
  document.getElementById('filtroEstadoWrap').hidden = mode !== 'ingresos';
  document.getElementById('dashSummary').hidden = true;
  document.getElementById('dashResults').hidden = true;
  document.getElementById('gastosResults').hidden = true;
  document.getElementById('dashMsg').textContent = '';
}

function switchTab(tabName) {
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.getElementById('dashTabPedidos').hidden = tabName !== 'pedidos';
  document.getElementById('dashTabPagos').hidden = tabName !== 'pagos';
  document.getElementById('dashTabGroomers').hidden = tabName !== 'groomers';
}

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
  const foot = document.getElementById('dashPagosFoot');
  body.innerHTML = '';
  foot.innerHTML = '';
  const sorted = Object.entries(pagos).sort((a, b) => b[1].total - a[1].total);
  let totCount = 0, totAmount = 0;
  for (const [metodo, { count, total }] of sorted) {
    totCount += count;
    totAmount += total;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${metodo}</td><td>${count}</td><td><strong>${fmt.format(total)}</strong></td>`;
    body.appendChild(tr);
  }
  const trF = document.createElement('tr');
  trF.innerHTML = `<td><strong>TOTAL</strong></td><td><strong>${totCount}</strong></td><td><strong>${fmt.format(totAmount)}</strong></td>`;
  foot.appendChild(trF);
}

function buildGroomersTab(rows) {
  const groomers = {};
  for (const r of rows) {
    if (r.groomer1) {
      groomers[r.groomer1] = (groomers[r.groomer1] || 0) + 1;
    }
    if (r.groomer2) {
      groomers[r.groomer2] = (groomers[r.groomer2] || 0) + 1;
    }
  }
  const body = document.getElementById('dashGroomersBody');
  const foot = document.getElementById('dashGroomersFoot');
  body.innerHTML = '';
  foot.innerHTML = '';
  const sorted = Object.entries(groomers).sort((a, b) => b[1] - a[1]);
  let totalServicios = 0;
  for (const [nombre, count] of sorted) {
    totalServicios += count;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${nombre}</td><td>${count}</td>`;
    body.appendChild(tr);
  }
  const trF = document.createElement('tr');
  trF.innerHTML = `<td><strong>TOTAL</strong></td><td><strong>${totalServicios}</strong></td>`;
  foot.appendChild(trF);
}

function formatDateSafe(val) {
  if (!val) return '-';
  const s = String(val);
  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const parts = iso.split('-');
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function consultarIngresos() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const estado = document.getElementById('filtroEstado').value;
  const piso = document.getElementById('filtroPiso').value;
  const msg = document.getElementById('dashMsg');
  const body_ = document.getElementById('dashBody');
  const foot_ = document.getElementById('dashPedidosFoot');
  const results = document.getElementById('dashResults');
  const summary = document.getElementById('dashSummary');
  msg.textContent = '';
  body_.innerHTML = '';
  foot_.innerHTML = '';
  results.hidden = true;
  summary.hidden = true;

  let url = `/api/dashboard/pedidos?desde=${desde}&hasta=${hasta}&estado=${estado}`;
  if (piso) url += `&piso=${encodeURIComponent(piso)}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || !data.ok) { msg.textContent = (data?.errors?.join(', ')) || 'Error al consultar'; return; }
    const rows = data.data || [];
    if (rows.length === 0) { msg.textContent = 'No se encontraron pedidos en ese rango.'; return; }

    let totalPrecio = 0, totalAdic = 0, totalIngresos = 0;
    const serviciosCount = {};
    for (const r of rows) {
      const precio = Number(r.precio || 0);
      const adic = Number(r.adicionales_descuentos || 0);
      const precioFinal = Number(r.precio_final || 0);
      totalPrecio += precio;
      totalAdic += adic;
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
        <td>${fmt.format(precio)}</td>
        <td class="${adic < 0 ? 'txt-red' : 'txt-green'}">${fmt.format(adic)}</td>
        <td><strong>${fmt.format(precioFinal)}</strong></td>
        <td>${r.metodo_pago === 'Mixto' && r.metodo_pago_1 ? `Mixto: ${r.metodo_pago_1} + ${r.metodo_pago_2}` : (r.metodo_pago || '-')}</td>
        <td>${groomers || '-'}</td>
        <td>${r.telefono_propietario || '-'}</td>
      `;
      body_.appendChild(tr);
    }

    const trF = document.createElement('tr');
    trF.innerHTML = `
      <td colspan="7"><strong>TOTAL (${rows.length} pedidos)</strong></td>
      <td><strong>${fmt.format(totalPrecio)}</strong></td>
      <td class="${totalAdic < 0 ? 'txt-red' : 'txt-green'}"><strong>${fmt.format(totalAdic)}</strong></td>
      <td><strong>${fmt.format(totalIngresos)}</strong></td>
      <td colspan="3"></td>
    `;
    foot_.appendChild(trF);

    buildPagosTab(rows);
    buildGroomersTab(rows);

    const svcSummary = Object.entries(serviciosCount).map(([k, v]) => `${k}: ${v}`).join(' · ');
    summary.innerHTML = `
      <div class="dash-stat"><span class="dash-stat-label">Total servicios</span><span class="dash-stat-value">${rows.length}</span></div>
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

async function consultarGastos() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const piso = document.getElementById('filtroPiso').value;
  const msg = document.getElementById('dashMsg');
  const body_ = document.getElementById('dashGastosBody');
  const foot_ = document.getElementById('dashGastosFoot');
  const results = document.getElementById('gastosResults');
  const summary = document.getElementById('dashSummary');
  msg.textContent = '';
  body_.innerHTML = '';
  foot_.innerHTML = '';
  results.hidden = true;
  summary.hidden = true;

  let url = `/api/gastos?desde=${desde}&hasta=${hasta}`;
  if (piso) url += `&piso=${encodeURIComponent(piso)}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || !data.ok) { msg.textContent = (data?.errors?.join(', ')) || 'Error al consultar'; return; }
    const rows = data.data || [];
    if (rows.length === 0) { msg.textContent = 'No se encontraron gastos en ese rango.'; return; }

    let totalMonto = 0;
    for (const g of rows) {
      totalMonto += Number(g.monto || 0);
      const tr = document.createElement('tr');
      const catTxt = g.categoria === 'Otros' && g.categoria_otro ? `Otros: ${g.categoria_otro}` : (g.categoria || '-');
      tr.innerHTML = `
        <td>${formatDateSafe(g.fecha)}</td>
        <td>${g.tercero || '-'}</td>
        <td>${g.descripcion || '-'}</td>
        <td><strong>${fmt.format(Number(g.monto || 0))}</strong></td>
        <td>${catTxt}</td>
        <td>${g.metodo_pago || '-'}</td>
        <td>${g.piso || '-'}</td>
      `;
      body_.appendChild(tr);
    }

    const trF = document.createElement('tr');
    trF.innerHTML = `
      <td colspan="3"><strong>TOTAL (${rows.length} gastos)</strong></td>
      <td><strong>${fmt.format(totalMonto)}</strong></td>
      <td colspan="3"></td>
    `;
    foot_.appendChild(trF);

    summary.innerHTML = `
      <div class="dash-stat"><span class="dash-stat-label">Total gastos</span><span class="dash-stat-value">${rows.length}</span></div>
      <div class="dash-stat"><span class="dash-stat-label">Monto total</span><span class="dash-stat-value">${fmt.format(totalMonto)}</span></div>
    `;
    summary.hidden = false;
    results.hidden = false;
  } catch {
    msg.textContent = 'Error de red al consultar.';
  }
}

function consultar() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  if (!desde || !hasta) {
    document.getElementById('dashMsg').textContent = 'Selecciona ambas fechas.';
    return;
  }
  if (desde > hasta) {
    document.getElementById('dashMsg').textContent = 'La fecha "Desde" no puede ser mayor que "Hasta".';
    return;
  }
  if (currentMode === 'ingresos') consultarIngresos();
  else consultarGastos();
}

document.addEventListener('DOMContentLoaded', () => {
  const today = todayISO();
  document.getElementById('fechaDesde').value = today;
  document.getElementById('fechaHasta').value = today;

  document.getElementById('btnConsultar').addEventListener('click', consultar);

  document.querySelectorAll('.dash-mode').forEach(btn => {
    btn.addEventListener('click', () => { switchMode(btn.dataset.mode); });
  });

  document.querySelectorAll('.dash-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});
