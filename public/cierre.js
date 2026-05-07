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

const METODO_EFECTIVO = 'Efectivo';
/** Debe coincidir con las opciones de método de pago (boutique, pedidos, gastos). */
const METODO_DATAFONO = 'Datáfono';

/** Denominaciones de billetes COP para arqueo físico */
const BILLETES_ARQUEO = [
  { id: '2000', denom: 2000, label: '$ 2.000' },
  { id: '5000', denom: 5000, label: '$ 5.000' },
  { id: '10000', denom: 10000, label: '$ 10.000' },
  { id: '20000', denom: 20000, label: '$ 20.000' },
  { id: '50000', denom: 50000, label: '$ 50.000' },
  { id: '100000', denom: 100000, label: '$ 100.000' },
];

/** Monedas COP (pesos) */
const MONEDAS_ARQUEO = [
  { id: 'm50', denom: 50, label: '$ 50' },
  { id: 'm100', denom: 100, label: '$ 100' },
  { id: 'm200', denom: 200, label: '$ 200' },
  { id: 'm500', denom: 500, label: '$ 500' },
  { id: 'm1000', denom: 1000, label: '$ 1.000' },
];

let cierreEfectivoActual = null;
let cierreDatfonoActual = null;

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

  function poblarGrupoArqueo(containerId, items) {
    const arqueoGrid = document.getElementById(containerId);
    if (!arqueoGrid) return;
    for (const b of items) {
      const wrap = document.createElement('div');
      wrap.className = 'arqueo-field';
      wrap.innerHTML = `
        <label for="arqueo_${b.id}">${b.label} <span style="color:#64748b">(cant.)</span></label>
        <input type="number" id="arqueo_${b.id}" min="0" step="1" inputmode="numeric" value="0" autocomplete="off" data-denom="${b.denom}" />
      `;
      arqueoGrid.appendChild(wrap);
    }
    arqueoGrid.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', actualizarTotalArqueo);
    });
  }
  poblarGrupoArqueo('arqueoGridBilletes', BILLETES_ARQUEO);
  poblarGrupoArqueo('arqueoGridMonedas', MONEDAS_ARQUEO);
  actualizarTotalArqueo();
  document.getElementById('btnValidarCierre')?.addEventListener('click', validarArqueoConCierre);

  document.getElementById('btnValidarDatafono')?.addEventListener('click', validarDatafonoCierre);
  const datafonoInp = document.getElementById('datafonoRealInput');
  if (datafonoInp) {
    datafonoInp.addEventListener('focus', () => {
      const n = parseCopMoneda(datafonoInp.value);
      datafonoInp.value = n ? String(n) : '';
    });
    datafonoInp.addEventListener('blur', () => {
      const n = parseCopMoneda(datafonoInp.value);
      datafonoInp.value = n ? fmt.format(n) : '';
      validarDatafonoCierre();
    });
  }
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
  cierreEfectivoActual = null;
  cierreDatfonoActual = null;
  const elTeoDf = document.getElementById('datafonoTeorico');
  if (elTeoDf) elTeoDf.textContent = '—';
  const inpDf = document.getElementById('datafonoRealInput');
  if (inpDf) inpDf.value = '';
  limpiarValidacionDatafono();
  const ctxArqueo = document.getElementById('cierreContextoArqueo');
  if (ctxArqueo) {
    ctxArqueo.textContent = '';
    ctxArqueo.hidden = true;
  }
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
    buildCierreReport(dataSpa.data || [], dataBoutique.data || [], dataGastos.data || [], inicioMap, {
      desde,
      hasta,
      piso,
    });
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

function buildCierreReport(spaRows, boutiqueRows, gastosRows, inicioMap, contexto) {
  const report = document.getElementById('cierreReport');
  const tbody = document.getElementById('cierreBody');
  const tfoot = document.getElementById('cierreFoot');
  tbody.innerHTML = '';
  tfoot.innerHTML = '';

  const agg = {};

  function ensure(m) {
    if (!agg[m]) agg[m] = { inicio: 0, spa: 0, boutique: 0, gastos: 0 };
  }

  // Inicio de caja: solo Efectivo arrastra saldo día a día (histórico antes del periodo).
  // El resto de medios se consideran con inicio 0 cada vez (no se acumula inicio digital).
  ensure(METODO_EFECTIVO);
  const iniEfe = inicioMap[METODO_EFECTIVO];
  if (iniEfe) {
    agg[METODO_EFECTIVO].inicio =
      (Number(iniEfe.spa) || 0) + (Number(iniEfe.boutique) || 0) - (Number(iniEfe.gastos) || 0);
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
  let totSpa = 0, totBoutique = 0, totGastos = 0, totCierre = 0;

  const efe = agg[METODO_EFECTIVO] || { inicio: 0, spa: 0, boutique: 0, gastos: 0 };
  const totInicioEfectivo = efe.inicio;

  for (const m of methods) {
    const d = agg[m];
    const cierre =
      m === METODO_EFECTIVO
        ? d.inicio + d.spa + d.boutique - d.gastos
        : d.spa + d.boutique - d.gastos;
    totSpa += d.spa;
    totBoutique += d.boutique;
    totGastos += d.gastos;
    totCierre += cierre;

    const inicioCell =
      m === METODO_EFECTIVO
        ? `<td class="${d.inicio >= 0 ? '' : 'txt-red'}">${fmt.format(d.inicio)}</td>`
        : `<td class="cierre-inicio-zero">${fmt.format(0)}</td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m}</td>
      ${inicioCell}
      <td>${fmt.format(d.spa)}</td>
      <td>${fmt.format(d.boutique)}</td>
      <td>${fmt.format(d.gastos)}</td>
      <td class="${cierre >= 0 ? 'txt-green' : 'txt-red'}"><strong>${fmt.format(cierre)}</strong></td>
    `;
    tbody.appendChild(tr);
  }

  const cierreEfectivo = efe.inicio + efe.spa + efe.boutique - efe.gastos;
  cierreEfectivoActual = cierreEfectivo;

  const aggDf = agg[METODO_DATAFONO];
  cierreDatfonoActual = aggDf ? aggDf.spa + aggDf.boutique - aggDf.gastos : 0;
  const elTeoDf = document.getElementById('datafonoTeorico');
  if (elTeoDf) elTeoDf.textContent = fmt.format(cierreDatfonoActual);

  const trFoot = document.createElement('tr');
  trFoot.innerHTML = `
    <td><strong>TOTAL</strong></td>
    <td><strong>${fmt.format(totInicioEfectivo)}</strong></td>
    <td><strong>${fmt.format(totSpa)}</strong></td>
    <td><strong>${fmt.format(totBoutique)}</strong></td>
    <td><strong>${fmt.format(totGastos)}</strong></td>
    <td class="${totCierre >= 0 ? 'txt-green' : 'txt-red'}"><strong>${fmt.format(totCierre)}</strong></td>
  `;
  tfoot.appendChild(trFoot);

  const granTotal = document.getElementById('cierreGranTotal');
  const cierreEfeClass = cierreEfectivo >= 0 ? 'cierre-positive' : 'cierre-negative';
  granTotal.innerHTML = `
    <div class="cierre-label">CIERRE DE CAJA (efectivo)</div>
    <div class="cierre-value ${cierreEfeClass}">${fmt.format(cierreEfectivo)}</div>
    <div class="cierre-detail">
      Inicio ${fmt.format(efe.inicio)}
      + Ingresos SPA ${fmt.format(efe.spa)}
      + Boutique ${fmt.format(efe.boutique)}
      &minus; Gastos ${fmt.format(efe.gastos)}
    </div>
    <div class="cierre-gran-total-note">Solo método de pago &laquo;Efectivo&raquo;, mismo periodo y piso que elegiste arriba.</div>
  `;

  if (contexto) {
    const elCtx = document.getElementById('cierreContextoArqueo');
    if (elCtx) {
      const pisoLabel = contexto.piso && String(contexto.piso).trim()
        ? contexto.piso
        : 'General (todos los pisos)';
      elCtx.textContent = `Cierre y arqueo para: ${formatDateSafe(contexto.desde)} – ${formatDateSafe(contexto.hasta)} · ${pisoLabel}. Los datos ya vienen filtrados por piso (pedidos, boutique, gastos e inicio de caja).`;
      elCtx.hidden = false;
    }
  }

  actualizarTotalArqueo();
  limpiarMensajeValidacionArqueo();
  limpiarValidacionDatafono();

  report.hidden = false;
}

function leerTotalArqueo() {
  let sum = 0;
  const grupos = [...BILLETES_ARQUEO, ...MONEDAS_ARQUEO];
  for (const b of grupos) {
    const el = document.getElementById(`arqueo_${b.id}`);
    if (!el) continue;
    const n = Math.max(0, Math.floor(Number(el.value) || 0));
    sum += n * b.denom;
  }
  return sum;
}

function actualizarTotalArqueo() {
  const total = leerTotalArqueo();
  const el = document.getElementById('arqueoTotal');
  if (el) el.textContent = fmt.format(total);
}

function limpiarMensajeValidacionArqueo() {
  const box = document.getElementById('arqueoValidacion');
  if (!box) return;
  box.textContent = '';
  box.className = 'arqueo-validacion';
  box.hidden = true;
}

function validarArqueoConCierre() {
  const box = document.getElementById('arqueoValidacion');
  if (!box) return;

  if (cierreEfectivoActual === null || Number.isNaN(cierreEfectivoActual)) {
    box.hidden = false;
    box.className = 'arqueo-validacion err';
    box.textContent = 'Consulta el reporte del periodo primero para calcular el cierre en efectivo.';
    return;
  }

  const arqueo = leerTotalArqueo();
  const diff = arqueo - cierreEfectivoActual;
  const tol = 0;

  box.hidden = false;
  if (Math.abs(diff) <= tol) {
    box.className = 'arqueo-validacion ok';
    box.textContent = `El arqueo (${fmt.format(arqueo)}) coincide con el cierre en efectivo del sistema (${fmt.format(cierreEfectivoActual)}) para el mismo periodo y piso consultados.`;
    return;
  }

  box.className = 'arqueo-validacion err';
  const sign = diff > 0 ? 'Sobran' : 'Faltan';
  box.textContent = `${sign} ${fmt.format(Math.abs(diff))}: arqueo físico ${fmt.format(arqueo)} vs cierre sistema ${fmt.format(cierreEfectivoActual)}.`;
}

function parseCopMoneda(str) {
  const digits = String(str ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function limpiarValidacionDatafono() {
  const box = document.getElementById('datafonoValidacion');
  if (!box) return;
  box.textContent = '';
  box.className = 'arqueo-validacion';
  box.hidden = true;
}

function validarDatafonoCierre() {
  const box = document.getElementById('datafonoValidacion');
  const inp = document.getElementById('datafonoRealInput');
  if (!box || !inp) return;

  if (cierreDatfonoActual === null || Number.isNaN(cierreDatfonoActual)) {
    box.hidden = false;
    box.className = 'arqueo-validacion err';
    box.textContent = 'Consulta el periodo primero para obtener el Datáfono teórico del sistema.';
    return;
  }

  const raw = inp.value;
  if (!/\d/.test(raw)) {
    limpiarValidacionDatafono();
    return;
  }

  const real = parseCopMoneda(raw);
  const teorico = cierreDatfonoActual;
  const diff = real - teorico;
  const tol = 0;

  box.hidden = false;
  if (Math.abs(diff) <= tol) {
    box.className = 'arqueo-validacion ok';
    box.textContent = 'Ok';
    return;
  }

  box.className = 'arqueo-validacion err';
  const sign = diff > 0 ? 'Sobran' : 'Faltan';
  box.textContent = `${sign} ${fmt.format(Math.abs(diff))}: dispositivo ${fmt.format(real)} vs sistema ${fmt.format(teorico)}.`;
}
