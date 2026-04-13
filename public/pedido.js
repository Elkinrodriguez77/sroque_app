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

let RAZAS = [];
let RAZA_TAMANO = {};
let MASCOTAS = [];

let GROOMERS_LIST = [];

/**
 * Precios sugeridos (COP). Editar aquí para actualizar tarifas.
 * - manto_corto: pelaje "Corto"
 * - manto_medio_largo: pelaje "Medio" o "Largo"
 * - perro: por tamaño (Minis…Gigantes). gato: fila única GATOS (ignora tamaño para el precio).
 * Claves de servicio deben coincidir con #servicioSelect (SanRoquero, Rockstar, Superstar, Shanti Spa).
 */
const PRECIOS = {
  manto_corto: {
    perro: {
      Minis: { SanRoquero: 69000, Rockstar: 81000, Superstar: 103000, 'Shanti Spa': 166000 },
      'Pequeños': { SanRoquero: 83000, Rockstar: 93000, Superstar: 117000, 'Shanti Spa': 180000 },
      Medianos: { SanRoquero: 96000, Rockstar: 107000, Superstar: 129000, 'Shanti Spa': 194000 },
      Grandes: { SanRoquero: 109000, Rockstar: 124000, Superstar: 152000, 'Shanti Spa': 218000 },
      Gigantes: { SanRoquero: 123000, Rockstar: 138000, Superstar: 164000, 'Shanti Spa': 243000 },
    },
    gato: {
      GATOS: { SanRoquero: 116000, Rockstar: 126000, Superstar: 148000, 'Shanti Spa': 212000 },
    },
  },
  manto_medio_largo: {
    perro: {
      Minis: { SanRoquero: 89000, Rockstar: 100000, Superstar: 123000, 'Shanti Spa': 186000 },
      'Pequeños': { SanRoquero: 103000, Rockstar: 112000, Superstar: 137000, 'Shanti Spa': 199000 },
      Medianos: { SanRoquero: 117000, Rockstar: 133000, Superstar: 154000, 'Shanti Spa': 213000 },
      Grandes: { SanRoquero: 137000, Rockstar: 166000, Superstar: 187000, 'Shanti Spa': 246000 },
      Gigantes: { SanRoquero: 231000, Rockstar: 261000, Superstar: 281000, 'Shanti Spa': 326000 },
    },
    gato: {
      GATOS: { SanRoquero: 136000, Rockstar: 156000, Superstar: 176000, 'Shanti Spa': 239000 },
    },
  },
};

const TAMANO_MAP = { 'Pequeño': 'Pequeños', 'Mediano': 'Medianos', 'Grande': 'Grandes' };
function normalizeTamano(t) { return TAMANO_MAP[t] || t; }

// ---- Searchable Raza dropdown ----
function initRazaDropdown() {
  const wrapper = document.getElementById('razaWrapper');
  const search = document.getElementById('razaSearch');
  const hidden = document.getElementById('razaValue');
  const dropdown = document.getElementById('razaDropdown');

  function render(filter) {
    dropdown.innerHTML = '';
    const q = (filter || '').toLowerCase();
    const filtered = q ? RAZAS.filter(r => r.toLowerCase().includes(q)) : RAZAS;
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="ss-empty">Sin resultados</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const raza of filtered) {
      const div = document.createElement('div');
      div.className = 'ss-option';
      div.textContent = raza;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectRaza(raza);
      });
      frag.appendChild(div);
    }
    dropdown.appendChild(frag);
  }

  function selectRaza(raza) {
    hidden.value = raza;
    search.value = raza;
    wrapper.classList.remove('open');
    onRazaChange();
  }

  search.addEventListener('focus', () => {
    wrapper.classList.add('open');
    render(search.value);
  });

  search.addEventListener('input', () => {
    wrapper.classList.add('open');
    render(search.value);
    hidden.value = search.value;
  });

  search.addEventListener('blur', () => {
    wrapper.classList.remove('open');
    if (search.value && !RAZAS.includes(search.value)) {
      hidden.value = search.value;
    }
  });

  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      wrapper.classList.remove('open');
      search.blur();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = dropdown.querySelector('.ss-option');
      if (first) selectRaza(first.textContent);
    }
  });
}

function setRazaValue(val) {
  document.getElementById('razaSearch').value = val || '';
  document.getElementById('razaValue').value = val || '';
}

// ---- Populate selects ----
function fillSelect(selectEl, items) {
  const current = selectEl.value;
  const first = selectEl.options[0];
  selectEl.innerHTML = '';
  if (first) selectEl.appendChild(first);
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    selectEl.appendChild(opt);
  }
  selectEl.value = current;
}

function onRazaChange() {
  const raza = document.getElementById('razaValue').value;
  const tamanoSelect = document.getElementById('tamanoSelect');
  if (RAZA_TAMANO[raza]) {
    tamanoSelect.value = normalizeTamano(RAZA_TAMANO[raza]);
  }
  suggestPrice();
}

function onServicioChange() {
  const s = document.getElementById('servicioSelect').value;
  document.getElementById('servicioOtroWrapper').hidden = s !== 'OTRO';
  suggestPrice();
}

function suggestPrice() {
  const servicio = document.getElementById('servicioSelect').value;
  const tamano = document.getElementById('tamanoSelect').value;
  const pelaje = document.getElementById('pelajeSelect').value;
  const tipo = document.getElementById('tipoMascotaSelect').value;
  const hintEl = document.getElementById('precioSugerido');
  const precioInput = document.querySelector('#pedidoForm [name="precio"]');

  if (!servicio || servicio === 'OTRO' || !pelaje || !tipo) {
    hintEl.hidden = true;
    return;
  }

  const manto = pelaje === 'Corto' ? 'manto_corto' : 'manto_medio_largo';
  const bloque = PRECIOS[manto]?.[tipo === 'Gato' ? 'gato' : 'perro'];
  if (!bloque) {
    hintEl.hidden = true;
    return;
  }

  let precio;
  if (tipo === 'Gato') {
    precio = bloque.GATOS?.[servicio];
  } else {
    if (!tamano) {
      hintEl.hidden = true;
      return;
    }
    precio = bloque[tamano]?.[servicio];
  }

  if (precio == null) {
    hintEl.hidden = true;
    return;
  }

  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const tamTxt = tipo === 'Gato' ? 'Gato' : tamano;
  hintEl.textContent = `Precio sugerido: ${fmt.format(precio)} (${servicio} · ${tipo} · ${tamTxt} · ${pelaje === 'Corto' ? 'Manto corto' : 'Manto medio/largo'})`;
  hintEl.hidden = false;

  if (Number(precioInput.value) === 0) {
    precioInput.value = precio;
    updateMoney();
  }
}

// ---- Adicionales: parse absolute or percentage ----
function parseAdicionales() {
  const raw = (document.getElementById('pedidoForm').elements['adicionales_descuentos'].value || '').trim();
  const base = Number(document.getElementById('pedidoForm').elements['precio'].value || 0);

  if (raw.endsWith('%')) {
    const pct = parseFloat(raw.slice(0, -1));
    if (isNaN(pct)) return 0;
    return Math.round(base * pct / 100);
  }

  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

// ---- Mixto payment ----
function onMetodoPagoChange() {
  const val = document.getElementById('metodoPagoSelect').value;
  const mixtoWrapper = document.getElementById('mixtoWrapper');
  mixtoWrapper.hidden = val !== 'Mixto';
}

function updateMixtoMoney() {
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const m1 = Number(document.querySelector('[name="monto_pago_1"]').value || 0);
  const m2 = Number(document.querySelector('[name="monto_pago_2"]').value || 0);
  document.getElementById('montoPago1Fmt').textContent = fmt.format(m1);
  document.getElementById('montoPago2Fmt').textContent = fmt.format(m2);
}

// ---- Info popup ----
function toggleInfoPopup() {
  const popup = document.getElementById('adicInfoPopup');
  popup.hidden = !popup.hidden;
}

async function submitPedido(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const errorsEl = document.getElementById('pedidoErrors');
  errorsEl.textContent = '';

  if (data.fecha_hora) {
    const ahora = new Date();
    const elegida = new Date(data.fecha_hora);
    if (!isNaN(elegida.getTime()) && elegida.getTime() > ahora.getTime()) {
      errorsEl.textContent = 'La fecha y hora del servicio no puede ser posterior al momento actual.';
      return;
    }
  }

  const groomerErr = validateGroomers();
  if (groomerErr) {
    errorsEl.textContent = groomerErr;
    return;
  }

  if (data.servicio === 'OTRO' && data.servicio_otro) {
    data.servicio = data.servicio_otro;
  }
  delete data.servicio_otro;

  // Resolve adicionales (percentage → absolute)
  data.adicionales_descuentos = parseAdicionales();

  // Handle Mixto payment
  if (data.metodo_pago === 'Mixto') {
    const mp1 = document.getElementById('mixtoPago1').value;
    const mp2 = document.getElementById('mixtoPago2').value;
    if (!mp1 || !mp2) {
      errorsEl.textContent = 'Para pago Mixto, seleccione ambos métodos de pago.';
      return;
    }
    if (mp1 === mp2) {
      errorsEl.textContent = 'Los dos métodos de pago Mixto no pueden ser iguales.';
      return;
    }
    data.metodo_pago = 'Mixto';
    data.metodo_pago_1 = mp1;
    data.metodo_pago_2 = mp2;
    data.monto_pago_1 = Number(document.querySelector('[name="monto_pago_1"]').value || 0);
    data.monto_pago_2 = Number(document.querySelector('[name="monto_pago_2"]').value || 0);
  } else {
    delete data.metodo_pago_1;
    delete data.metodo_pago_2;
    delete data.monto_pago_1;
    delete data.monto_pago_2;
  }

  try {
    const id = data.id && String(data.id).trim();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/pedidos/${id}` : '/api/pedidos';
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body?.errors?.join(', ')) || 'Error al guardar pedido';
      return;
    }
    form.reset();
    setRazaValue('');
    document.getElementById('precioSugerido').hidden = true;
    document.getElementById('mixtoWrapper').hidden = true;
    document.getElementById('adicInfoPopup').hidden = true;
    await buscarPedidos();
  } catch {
    errorsEl.textContent = 'Error de red al guardar pedido';
  }
}

async function buscarPedidos() {
  const tel = document.getElementById('filtroTelefono').value.trim();
  const ul = document.getElementById('listaPedidos');
  const msg = document.getElementById('pedidosMsg');
  ul.innerHTML = '';
  msg.textContent = '';
  if (!tel) { msg.innerHTML = '<span style="color:#f87171">Ingrese un teléfono</span>'; return; }

  // Step 1: lookup client and prefill data (like Clientes page → Registrar pedido)
  try {
    const clientResp = await fetch(`/api/clientes?telefono=${encodeURIComponent(tel)}`);
    if (clientResp.ok) {
      const clientBody = await clientResp.json();
      if (clientBody.ok && clientBody.data) {
        const c = clientBody.data;
        const form = document.getElementById('pedidoForm');
        form.elements['telefono_propietario'].value = c.telefono_propietario || tel;
        form.elements['telefono_acudiente'].value = c.telefono_acudiente || '';
        await cargarMascotasPorTelefono();
        const nombre = c.nombre_propietario || c.telefono_propietario;
        msg.innerHTML = `<span style="color:#34d399">Cliente encontrado: <strong>${nombre}</strong></span>`;
      }
    } else {
      document.querySelector('#pedidoForm [name="telefono_propietario"]').value = tel;
      document.querySelector('#pedidoForm [name="telefono_acudiente"]').value = '';
    }
  } catch { /* continue to pedidos search */ }

  // Step 2: pedidos del día (abiertos y cerrados) para poder eliminar duplicados
  try {
    const resp = await fetch(`/api/pedidos?telefono=${encodeURIComponent(tel)}&todos=1`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      msg.innerHTML += ' <span style="color:#f87171">Error al buscar pedidos</span>';
      return;
    }
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    if (body.data.length === 0) {
      const noP = document.createElement('li');
      noP.className = 'pedido-meta';
      noP.style.padding = '10px 0';
      noP.textContent = 'No hay pedidos del día para este teléfono.';
      ul.appendChild(noP);
    }
    body.data.forEach((p) => {
      const cerrado = !!p.cerrado;
      const li = document.createElement('li');
      li.className = 'pedido-item';
      if (cerrado) li.classList.add('pedido-cerrado');

      const header = document.createElement('div');
      header.className = 'pedido-item-header';
      const hora = p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
      const left = document.createElement('span');
      left.textContent = `${hora} · ${p.servicio || 'Sin servicio'}`;
      const right = document.createElement('span');
      right.className = 'badge';
      right.textContent = p.nombre_mascota || 'Sin nombre';
      const badgeEstado = document.createElement('span');
      badgeEstado.className = cerrado ? 'badge badge-inactive' : 'badge badge-active';
      badgeEstado.style.marginLeft = '8px';
      badgeEstado.textContent = cerrado ? 'Cerrado' : 'Abierto';
      header.appendChild(left);
      header.appendChild(right);
      header.appendChild(badgeEstado);

      const meta = document.createElement('div');
      meta.className = 'pedido-meta';
      const total = (Number(p.precio || 0) + Number(p.adicionales_descuentos || 0));
      let metodoTxt = p.metodo_pago || '';
      if (p.metodo_pago === 'Mixto' && p.metodo_pago_1 && p.metodo_pago_2) {
        metodoTxt = `Mixto: ${p.metodo_pago_1} + ${p.metodo_pago_2}`;
      }
      const pisoTxt = p.piso ? ` · ${p.piso}` : '';
      meta.textContent = `ID ${p.id} · ${fmt.format(total)} · ${metodoTxt}${pisoTxt} · Tel: ${p.telefono_propietario}`;

      const actions = document.createElement('div');
      actions.className = 'pedido-actions';
      if (!cerrado) {
        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.textContent = 'Editar';
        btnEdit.onclick = () => {
          cargarPedidoEnFormulario(p);
          document.querySelectorAll('.pedido-item.selected').forEach((n) => n.classList.remove('selected'));
          li.classList.add('selected');
        };
        const btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.textContent = 'Cerrar';
        btnClose.onclick = () => cerrarPedido(p.id);
        actions.appendChild(btnEdit);
        actions.appendChild(btnClose);
      }
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.textContent = 'Eliminar';
      btnDel.className = 'btn-danger';
      btnDel.onclick = () => eliminarPedido(p);
      actions.appendChild(btnDel);

      li.appendChild(header);
      li.appendChild(meta);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  } catch {
    msg.innerHTML += ' <span style="color:#f87171">Error de red al buscar pedidos</span>';
  }
}

function cargarPedidoEnFormulario(p) {
  const form = document.getElementById('pedidoForm');
  form.elements['id'].value = p.id;
  form.elements['telefono_propietario'].value = p.telefono_propietario || '';
  form.elements['telefono_acudiente'].value = p.telefono_acudiente || '';
  form.elements['fecha_hora'].value = p.fecha_hora ? new Date(p.fecha_hora).toISOString().slice(0, 16) : '';
  form.elements['piso'].value = p.piso || '';
  form.elements['mascota_id'].value = p.mascota_id || '';
  document.getElementById('nombreMascota').value = p.nombre_mascota || '';
  setRazaValue(p.raza || '');
  document.getElementById('tamanoSelect').value = normalizeTamano(p.tamano || '');
  document.getElementById('pelajeSelect').value = p.pelaje || '';
  const tipoSel = document.getElementById('tipoMascotaSelect');
  if (p.mascota_id) {
    const m = MASCOTAS.find((x) => String(x.id) === String(p.mascota_id));
    tipoSel.value = (m && m.tipo_mascota) ? m.tipo_mascota : '';
  } else {
    tipoSel.value = '';
  }
  document.getElementById('servicioSelect').value = p.servicio || '';
  onServicioChange();

  // Handle Mixto payment loading
  if (p.metodo_pago === 'Mixto' && p.metodo_pago_1) {
    document.getElementById('metodoPagoSelect').value = 'Mixto';
    onMetodoPagoChange();
    document.getElementById('mixtoPago1').value = p.metodo_pago_1 || '';
    document.getElementById('mixtoPago2').value = p.metodo_pago_2 || '';
    document.querySelector('[name="monto_pago_1"]').value = p.monto_pago_1 || 0;
    document.querySelector('[name="monto_pago_2"]').value = p.monto_pago_2 || 0;
    updateMixtoMoney();
  } else {
    document.getElementById('metodoPagoSelect').value = p.metodo_pago || '';
    onMetodoPagoChange();
  }

  form.elements['precio'].value = (p.precio != null) ? p.precio : 0;
  form.elements['adicionales_descuentos'].value = (p.adicionales_descuentos != null) ? p.adicionales_descuentos : 0;
  document.getElementById('groomer1Select').value = p.groomer1 || '';
  document.getElementById('groomer2Select').value = p.groomer2 || '';
  updateMoney();
  document.getElementById('precioSugerido').hidden = true;
  suggestPrice();
}

function prefillPhones() {
  const params = new URLSearchParams(window.location.search);
  const telProp = params.get('tel_prop');
  const telAcud = params.get('tel_acud');
  if (telProp) document.querySelector('#pedidoForm [name="telefono_propietario"]').value = telProp;
  if (telAcud) document.querySelector('#pedidoForm [name="telefono_acudiente"]').value = telAcud;
  if (telProp) document.getElementById('filtroTelefono').value = telProp;
  if (telProp || telAcud) {
    history.replaceState({}, '', window.location.pathname);
  }
}

async function cargarMascotasPorTelefono() {
  const tel = document.querySelector('#pedidoForm [name="telefono_propietario"]').value.trim();
  const sel = document.getElementById('mascotaSelect');
  sel.innerHTML = '<option value="">Nueva mascota / sin seleccionar</option>';
  MASCOTAS = [];
  if (!tel) return;
  try {
    const resp = await fetch(`/api/mascotas?telefono=${encodeURIComponent(tel)}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) return;
    MASCOTAS = body.data || [];
    for (const m of MASCOTAS) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.nombre_mascota || `Mascota ${m.id}`;
      sel.appendChild(opt);
    }
  } catch { /* silent */ }
}

function onMascotaChange() {
  const id = document.getElementById('mascotaSelect').value;
  const tipoSel = document.getElementById('tipoMascotaSelect');
  if (!id) {
    tipoSel.value = '';
    suggestPrice();
    return;
  }
  const m = MASCOTAS.find((x) => String(x.id) === String(id));
  if (!m) return;
  document.getElementById('nombreMascota').value = m.nombre_mascota || '';
  setRazaValue(m.raza || '');
  document.getElementById('tamanoSelect').value = normalizeTamano(m.tamano || '');
  document.getElementById('pelajeSelect').value = m.pelaje || '';
  tipoSel.value = m.tipo_mascota || '';
  suggestPrice();
}

async function eliminarPedido(p) {
  const msg = document.getElementById('pedidosMsg');
  const cerrado = !!p.cerrado;
  const texto = cerrado
    ? 'Este pedido ya está CERRADO. Al eliminarlo se borra el registro en la base de datos: dejará de contar en reportes, dashboard y cierre de caja. ¿Continuar?'
    : '¿Eliminar este pedido de forma permanente? No se puede deshacer.';
  if (!window.confirm(texto)) return;
  try {
    const resp = await fetch(`/api/pedidos/${p.id}`, { method: 'DELETE' });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      msg.innerHTML = `<span style="color:#f87171">${(body?.errors?.join(', ')) || 'No se pudo eliminar'}</span>`;
      return;
    }
    const form = document.getElementById('pedidoForm');
    if (String(form.elements['id'].value || '') === String(p.id)) {
      form.reset();
      form.elements['id'].value = '';
      setRazaValue('');
      updateMoney();
      document.getElementById('precioSugerido').hidden = true;
      document.getElementById('mixtoWrapper').hidden = true;
      document.getElementById('adicInfoPopup').hidden = true;
      document.querySelectorAll('.pedido-item.selected').forEach((n) => n.classList.remove('selected'));
    }
    await buscarPedidos();
    msg.innerHTML = '<span style="color:#34d399">Pedido eliminado.</span>';
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al eliminar</span>';
  }
}

async function cerrarPedido(id) {
  const msg = document.getElementById('pedidosMsg');
  msg.textContent = '';
  if (!window.confirm('¿Seguro que deseas cerrar este pedido? Ya no se podrá editar.')) return;
  try {
    const resp = await fetch(`/api/pedidos/${id}/cerrar`, { method: 'POST' });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      msg.innerHTML = `<span style="color:#f87171">${(body?.errors?.join(', ')) || 'No se pudo cerrar el pedido'}</span>`;
      return;
    }
    await buscarPedidos();
    const form = document.getElementById('pedidoForm');
    form.reset();
    setRazaValue('');
    updateMoney();
    document.getElementById('precioSugerido').hidden = true;
    document.getElementById('mixtoWrapper').hidden = true;
    document.getElementById('adicInfoPopup').hidden = true;
    document.querySelectorAll('.pedido-item.selected').forEach((n) => n.classList.remove('selected'));
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al cerrar pedido</span>';
  }
}

function updateMoney() {
  const f = document.getElementById('pedidoForm');
  const base = Number(f.elements['precio'].value || 0);
  const adic = parseAdicionales();
  const total = base + adic;
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  document.getElementById('precioFmt').textContent = fmt.format(base);
  const adicEl = document.getElementById('adicionalesFmt');
  adicEl.textContent = fmt.format(adic);
  adicEl.classList.toggle('negative', adic < 0);
  adicEl.classList.toggle('positive', adic > 0);
  document.getElementById('precioFinal').textContent = fmt.format(total);
  updateMixtoMoney();
}

async function loadGroomers() {
  try {
    const resp = await fetch('/api/groomers/activos');
    const { ok, data } = await resp.json();
    if (ok && data) {
      GROOMERS_LIST = data.map(g => ({ id: g.id, label: `${g.nombre} ${g.apellido}` }));
    }
  } catch { /* silent */ }
  const names = GROOMERS_LIST.map(g => g.label);
  fillSelect(document.getElementById('groomer1Select'), names);
  fillSelect(document.getElementById('groomer2Select'), names);
}

function validateGroomers() {
  const g1 = document.getElementById('groomer1Select').value;
  const g2 = document.getElementById('groomer2Select').value;
  if (g1 && g2 && g1 === g2) {
    return 'El Groomer 2 no puede ser igual al Groomer 1.';
  }
  return null;
}

function init() {
  fetch('/api/catalogos/raza-tamano')
    .then(r => r.json()).then(({ ok, data }) => {
      if (ok && data) {
        RAZAS = data.razas || [];
        RAZA_TAMANO = data.mapping || {};
      }
    })
    .catch(() => {});

  loadGroomers();
  initRazaDropdown();

  document.getElementById('servicioSelect').addEventListener('change', onServicioChange);
  document.getElementById('tamanoSelect').addEventListener('change', suggestPrice);
  document.getElementById('pelajeSelect').addEventListener('change', suggestPrice);
  document.getElementById('tipoMascotaSelect').addEventListener('change', suggestPrice);
  document.getElementById('pedidoForm').addEventListener('submit', submitPedido);
  document.getElementById('btnBuscarPedidos').addEventListener('click', buscarPedidos);
  document.getElementById('pedidoForm').elements['precio'].addEventListener('input', updateMoney);
  document.getElementById('pedidoForm').elements['adicionales_descuentos'].addEventListener('input', updateMoney);
  document.getElementById('pedidoForm').elements['telefono_propietario'].addEventListener('change', cargarMascotasPorTelefono);
  document.getElementById('mascotaSelect').addEventListener('change', onMascotaChange);

  // Mixto payment toggle
  document.getElementById('metodoPagoSelect').addEventListener('change', onMetodoPagoChange);
  document.querySelector('[name="monto_pago_1"]').addEventListener('input', updateMixtoMoney);
  document.querySelector('[name="monto_pago_2"]').addEventListener('input', updateMixtoMoney);

  // Info popup toggle
  document.getElementById('adicInfoBtn').addEventListener('click', toggleInfoPopup);

  prefillPhones();
  cargarMascotasPorTelefono();
  updateMoney();
}

document.addEventListener('DOMContentLoaded', init);
