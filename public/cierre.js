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

function formatDateSafe(val) {
  if (!val) return '-';
  const s = String(val);
  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const parts = iso.split('-');
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const today = todayISO();
  document.getElementById('fechaDesde').value = today;
  document.getElementById('fechaHasta').value = today;
  document.querySelector('#boutiqueForm [name="fecha"]').value = today;

  document.getElementById('btnConsultar').addEventListener('click', consultarCierre);
  document.getElementById('boutiqueForm').addEventListener('submit', submitBoutique);
});

async function submitBoutique(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const errEl = document.getElementById('boutiqueErrors');
  const msgEl = document.getElementById('boutiqueMsg');
  errEl.textContent = '';
  msgEl.textContent = '';

  try {
    const resp = await fetch('/api/boutique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errEl.textContent = (body?.errors?.join(', ')) || 'Error al registrar';
      return;
    }
    form.reset();
    document.querySelector('#boutiqueForm [name="fecha"]').value = todayISO();
    msgEl.innerHTML = '<span style="color:#34d399">Venta Boutique registrada.</span>';
    await consultarCierre();
  } catch {
    errEl.textContent = 'Error de red';
  }
}

async function eliminarBoutique(id) {
  if (!confirm('¿Eliminar esta venta Boutique?')) return;
  try {
    const resp = await fetch(`/api/boutique/${id}`, { method: 'DELETE' });
    if (!resp.ok) { alert('No se pudo eliminar'); return; }
    await consultarCierre();
  } catch {
    alert('Error de red');
  }
}

async function consultarCierre() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const piso = document.getElementById('filtroPiso').value;
  const msg = document.getElementById('cierreMsg');
  msg.textContent = '';
  document.getElementById('cierreReport').hidden = true;

  if (!desde || !hasta) { msg.textContent = 'Selecciona ambas fechas.'; return; }
  if (desde > hasta) { msg.textContent = '"Desde" no puede ser mayor que "Hasta".'; return; }

  const pisoQ = piso ? `&piso=${encodeURIComponent(piso)}` : '';

  try {
    const [resSpa, resBoutique, resGastos, resInicio] = await Promise.all([
      fetch(`/api/dashboard/pedidos?desde=${desde}&hasta=${hasta}&estado=cerrados${pisoQ}`),
      fetch(`/api/boutique?desde=${desde}&hasta=${hasta}${pisoQ}`),
      fetch(`/api/gastos?desde=${desde}&hasta=${hasta}${pisoQ}`),
      fetch(`/api/cierre/inicio-caja?antes=${desde}${pisoQ}`),
    ]);

    const dataSpa = await resSpa.json();
    const dataBoutique = await resBoutique.json();
    const dataGastos = await resGastos.json();
    const dataInicio = await resInicio.json();

    if (!dataSpa.ok || !dataBoutique.ok || !dataGastos.ok || !dataInicio.ok) {
      msg.textContent = 'Error al consultar datos.';
      return;
    }

    const inicioMap = dataInicio.data || {};
    renderBoutiqueList(dataBoutique.data || []);
    buildCierreReport(dataSpa.data || [], dataBoutique.data || [], dataGastos.data || [], inicioMap);
  } catch {
    msg.textContent = 'Error de red al consultar.';
  }
}

function renderBoutiqueList(rows) {
  const list = document.getElementById('boutiqueList');
  const body = document.getElementById('boutiqueBody');
  const foot = document.getElementById('boutiqueFoot');
  body.innerHTML = '';
  foot.innerHTML = '';
  if (rows.length === 0) { list.hidden = true; return; }

  let totalMonto = 0;
  for (const b of rows) {
    totalMonto += Number(b.monto || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateSafe(b.fecha)}</td>
      <td>${b.metodo_pago || '-'}</td>
      <td><strong>${fmt.format(Number(b.monto || 0))}</strong></td>
      <td>${b.piso || '-'}</td>
      <td class="pedido-actions"></td>
    `;
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.textContent = 'Eliminar';
    btnDel.className = 'btn-danger';
    btnDel.onclick = () => eliminarBoutique(b.id);
    tr.querySelector('.pedido-actions').appendChild(btnDel);
    body.appendChild(tr);
  }
  const trF = document.createElement('tr');
  trF.innerHTML = `<td colspan="2"><strong>TOTAL (${rows.length})</strong></td><td><strong>${fmt.format(totalMonto)}</strong></td><td colspan="2"></td>`;
  foot.appendChild(trF);
  list.hidden = false;
}

function buildCierreReport(spaRows, boutiqueRows, gastosRows, inicioMap) {
  const report = document.getElementById('cierreReport');
  const tbody = document.getElementById('cierreBody');
  const tfoot = document.getElementById('cierreFoot');
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  const agg = {};

  function ensure(m) {
    if (!agg[m]) agg[m] = { inicio: 0, spa: 0, boutique: 0, gastos: 0 };
  }

  // Seed with inicio de caja data
  for (const [m, vals] of Object.entries(inicioMap)) {
    ensure(m);
    agg[m].inicio = (Number(vals.spa) || 0) + (Number(vals.boutique) || 0) - (Number(vals.gastos) || 0);
  }

  // Period: SPA ingresos
  for (const r of spaRows) {
    const pf = Number(r.precio_final || 0);
    if (r.metodo_pago === 'Mixto' && r.metodo_pago_1 && r.metodo_pago_2) {
      ensure(r.metodo_pago_1);
      agg[r.metodo_pago_1].spa += Number(r.monto_pago_1 || 0);
      ensure(r.metodo_pago_2);
      agg[r.metodo_pago_2].spa += Number(r.monto_pago_2 || 0);
    } else {
      const m = r.metodo_pago || 'Sin especificar';
      ensure(m);
      agg[m].spa += pf;
    }
  }

  // Period: Boutique ingresos
  for (const b of boutiqueRows) {
    const m = b.metodo_pago || 'Sin especificar';
    ensure(m);
    agg[m].boutique += Number(b.monto || 0);
  }

  // Period: Gastos
  for (const g of gastosRows) {
    const m = g.metodo_pago || 'Sin especificar';
    ensure(m);
    agg[m].gastos += Number(g.monto || 0);
  }

  const methods = Object.keys(agg).sort();
  let totInicio = 0, totSpa = 0, totBoutique = 0, totGastos = 0, totCierre = 0;

  for (const m of methods) {
    const d = agg[m];
    const cierre = d.inicio + d.spa + d.boutique - d.gastos;
    totInicio += d.inicio;
    totSpa += d.spa;
    totBoutique += d.boutique;
    totGastos += d.gastos;
    totCierre += cierre;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m}</td>
      <td class="${d.inicio >= 0 ? '' : 'txt-red'}">${fmt.format(d.inicio)}</td>
      <td>${fmt.format(d.spa)}</td>
      <td>${fmt.format(d.boutique)}</td>
      <td>${fmt.format(d.gastos)}</td>
      <td class="${cierre >= 0 ? 'txt-green' : 'txt-red'}"><strong>${fmt.format(cierre)}</strong></td>
    `;
    tbody.appendChild(tr);
  }

  const trFoot = document.createElement('tr');
  trFoot.innerHTML = `
    <td><strong>TOTAL</strong></td>
    <td><strong>${fmt.format(totInicio)}</strong></td>
    <td><strong>${fmt.format(totSpa)}</strong></td>
    <td><strong>${fmt.format(totBoutique)}</strong></td>
    <td><strong>${fmt.format(totGastos)}</strong></td>
    <td class="${totCierre >= 0 ? 'txt-green' : 'txt-red'}"><strong>${fmt.format(totCierre)}</strong></td>
  `;
  tfoot.appendChild(trFoot);

  const granTotal = document.getElementById('cierreGranTotal');
  granTotal.innerHTML = `
    <div class="cierre-label">CIERRE DE CAJA</div>
    <div class="cierre-value ${totCierre >= 0 ? 'cierre-positive' : 'cierre-negative'}">${fmt.format(totCierre)}</div>
    <div class="cierre-detail">
      Inicio ${fmt.format(totInicio)}
      + Ingresos SPA ${fmt.format(totSpa)}
      + Boutique ${fmt.format(totBoutique)}
      &minus; Gastos ${fmt.format(totGastos)}
    </div>
  `;

  report.hidden = false;
}
