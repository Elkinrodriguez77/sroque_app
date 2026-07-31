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
let fotoPreviewObjectUrl = null;

let GROOMERS_LIST = [];

/**
 * Orígenes de cliente. La lista real se administra en «Orígenes» (/origenes.html)
 * y llega por /api/origenes/activos; esta constante solo es el respaldo si la
 * consulta falla. «Otros» siempre se agrega al final (habilita el texto libre).
 */
const ORIGEN_OTROS = 'Otros';
const ORIGENES_CLIENTE_FALLBACK = [
  'WhatsApp',
  'Instagram',
  'Facebook',
  'TikTok',
  'Google / Búsqueda web',
  'Referido / Recomendación',
  'Cliente frecuente',
  'Paso por el local (fachada)',
  'Publicidad / Volante',
];
let ORIGENES_CLIENTE = [...ORIGENES_CLIENTE_FALLBACK, ORIGEN_OTROS];

/** Tags de clasificación del cliente (campo opcional). Debe coincidir con src/types.js. */
const TIPOS_CLIENTE = ['Antiguo', 'Nuevo', 'VIP'];

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
    syncRazaRequiredValidity();
  }

  search.addEventListener('focus', () => {
    wrapper.classList.add('open');
    render(search.value);
  });

  search.addEventListener('input', () => {
    wrapper.classList.add('open');
    render(search.value);
    hidden.value = search.value;
    syncRazaRequiredValidity();
  });

  search.addEventListener('blur', () => {
    wrapper.classList.remove('open');
    if (search.value && !RAZAS.includes(search.value)) {
      hidden.value = search.value;
    }
    syncRazaRequiredValidity();
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
  syncRazaRequiredValidity();
}

function groomerLabels() {
  return GROOMERS_LIST.map((g) => g.label);
}

function setGroomerPickerValue(suffix, label) {
  const hidden = document.getElementById(`groomer${suffix}Value`);
  const search = document.getElementById(`groomer${suffix}Search`);
  if (hidden) hidden.value = label || '';
  if (search) search.value = label || '';
}

/** Listas filtrables tipo «Raza» para Groomer 1 y 2. */
function initGroomerPickers() {
  function attach(suffix) {
    const wrapper = document.getElementById(`groomer${suffix}Wrapper`);
    const search = document.getElementById(`groomer${suffix}Search`);
    const hidden = document.getElementById(`groomer${suffix}Value`);
    const dropdown = document.getElementById(`groomer${suffix}Dropdown`);
    if (!wrapper || !search || !hidden || !dropdown) return;

    function render(filter) {
      dropdown.innerHTML = '';
      const q = (filter || '').trim().toLowerCase();
      const names = groomerLabels();
      const filtered = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
      if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="ss-empty">Sin resultados</div>';
        return;
      }
      const frag = document.createDocumentFragment();
      for (const name of filtered) {
        const div = document.createElement('div');
        div.className = 'ss-option';
        div.textContent = name;
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pick(name);
        });
        frag.appendChild(div);
      }
      dropdown.appendChild(frag);
    }

    function pick(name) {
      hidden.value = name;
      search.value = name;
      wrapper.classList.remove('open');
    }

    function syncBlur() {
      wrapper.classList.remove('open');
      const q = search.value.trim();
      const names = groomerLabels();
      if (!q) {
        hidden.value = '';
        search.value = '';
        return;
      }
      const exact = names.find((n) => n.toLowerCase() === q.toLowerCase());
      if (exact) {
        hidden.value = exact;
        search.value = exact;
        return;
      }
      search.value = hidden.value || '';
    }

    search.addEventListener('focus', () => {
      wrapper.classList.add('open');
      render(search.value);
    });

    search.addEventListener('input', () => {
      wrapper.classList.add('open');
      render(search.value);
    });

    search.addEventListener('blur', syncBlur);

    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        wrapper.classList.remove('open');
        search.blur();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = dropdown.querySelector('.ss-option');
        if (first && !first.classList.contains('ss-empty')) pick(first.textContent);
      }
    });
  }

  attach('1');
  attach('2');
}

/** Tag opcional «Tipo Cliente». Al tocar el tag activo se deselecciona. */
function setTipoClienteValue(val) {
  const hidden = document.getElementById('tipoClienteValue');
  const clear = document.getElementById('tipoClienteClear');
  const v = TIPOS_CLIENTE.includes(val) ? val : '';
  if (hidden) hidden.value = v;
  document.querySelectorAll('#tipoClienteTags .tc-tag').forEach((btn) => {
    const on = btn.getAttribute('data-tipo') === v;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (clear) clear.hidden = !v;
}

function initTipoClientePicker() {
  document.querySelectorAll('#tipoClienteTags .tc-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = btn.getAttribute('data-tipo');
      const actual = document.getElementById('tipoClienteValue')?.value || '';
      setTipoClienteValue(actual === tipo ? '' : tipo);
    });
  });
  document.getElementById('tipoClienteClear')?.addEventListener('click', () => setTipoClienteValue(''));
}

/** Muestra/oculta el campo "Especifica el origen" según la selección. */
function onOrigenChange() {
  const val = (document.getElementById('origenValue')?.value || '').trim();
  const wrapper = document.getElementById('origenOtroWrapper');
  if (wrapper) wrapper.hidden = val !== ORIGEN_OTROS;
  syncOrigenRequiredValidity();
}

/**
 * Carga el valor guardado del origen. Si no está en la lista fija se trata como
 * "Otros" y el texto libre se coloca en el campo "Especifica el origen".
 */
function setOrigenValue(val) {
  const search = document.getElementById('origenSearch');
  const hidden = document.getElementById('origenValue');
  const otroInput = document.querySelector('#pedidoForm [name="origen_cliente_otro"]');
  const v = (val || '').trim();
  if (!v) {
    if (hidden) hidden.value = '';
    if (search) search.value = '';
    if (otroInput) otroInput.value = '';
    onOrigenChange();
    return;
  }
  if (ORIGENES_CLIENTE.includes(v) && v !== ORIGEN_OTROS) {
    if (hidden) hidden.value = v;
    if (search) search.value = v;
    if (otroInput) otroInput.value = '';
  } else {
    // Valor personalizado (o un origen que ya no está en el catálogo) → "Otros" + texto libre
    if (hidden) hidden.value = ORIGEN_OTROS;
    if (search) search.value = ORIGEN_OTROS;
    if (otroInput) otroInput.value = v;
  }
  onOrigenChange();
}

/** Lista filtrable tipo «Raza» para el origen del cliente (con opción "Otros"). */
function initOrigenPicker() {
  const wrapper = document.getElementById('origenWrapper');
  const search = document.getElementById('origenSearch');
  const hidden = document.getElementById('origenValue');
  const dropdown = document.getElementById('origenDropdown');
  if (!wrapper || !search || !hidden || !dropdown) return;

  function render(filter) {
    dropdown.innerHTML = '';
    const q = (filter || '').trim().toLowerCase();
    const filtered = q ? ORIGENES_CLIENTE.filter((n) => n.toLowerCase().includes(q)) : ORIGENES_CLIENTE;
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="ss-empty">Sin resultados</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const name of filtered) {
      const div = document.createElement('div');
      div.className = 'ss-option';
      div.textContent = name;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pick(name);
      });
      frag.appendChild(div);
    }
    dropdown.appendChild(frag);
  }

  function pick(name) {
    hidden.value = name;
    search.value = name;
    wrapper.classList.remove('open');
    onOrigenChange();
    if (name === ORIGEN_OTROS) {
      const otroInput = document.querySelector('#pedidoForm [name="origen_cliente_otro"]');
      if (otroInput) queueMicrotask(() => otroInput.focus());
    }
  }

  function syncBlur() {
    wrapper.classList.remove('open');
    const q = search.value.trim();
    if (!q) {
      hidden.value = '';
      search.value = '';
      onOrigenChange();
      return;
    }
    const exact = ORIGENES_CLIENTE.find((n) => n.toLowerCase() === q.toLowerCase());
    if (exact) {
      hidden.value = exact;
      search.value = exact;
    } else {
      search.value = hidden.value || '';
    }
    onOrigenChange();
  }

  search.addEventListener('focus', () => {
    wrapper.classList.add('open');
    render(search.value);
  });
  search.addEventListener('input', () => {
    wrapper.classList.add('open');
    render(search.value);
  });
  search.addEventListener('blur', syncBlur);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      wrapper.classList.remove('open');
      search.blur();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = dropdown.querySelector('.ss-option');
      if (first && !first.classList.contains('ss-empty')) pick(first.textContent);
    }
  });
}

// ---- Raza / precios ----
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
  syncServicioRequiredValidity();
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

function revokeFotoPreviewObjectUrl() {
  if (fotoPreviewObjectUrl) {
    URL.revokeObjectURL(fotoPreviewObjectUrl);
    fotoPreviewObjectUrl = null;
  }
}

function refreshMascotaFotoPreview() {
  const input = document.getElementById('mascotaFotoInput');
  const wrap = document.getElementById('mascotaFotoWrap');
  const img = document.getElementById('mascotaFotoPreview');
  const btnAmpliar = document.getElementById('btnAmpliarFoto');
  const btnQuitar = document.getElementById('btnQuitarFotoSeleccion');
  const btnEliminar = document.getElementById('btnEliminarFotoGuardada');
  const selId = document.getElementById('mascotaSelect').value;

  revokeFotoPreviewObjectUrl();

  if (input.files && input.files[0]) {
    fotoPreviewObjectUrl = URL.createObjectURL(input.files[0]);
    img.src = fotoPreviewObjectUrl;
    img.hidden = false;
    wrap.hidden = false;
    btnAmpliar.hidden = false;
    btnQuitar.hidden = false;
    btnEliminar.hidden = true;
    return;
  }

  btnQuitar.hidden = true;

  if (!selId) {
    img.removeAttribute('src');
    img.hidden = true;
    wrap.hidden = true;
    btnAmpliar.hidden = true;
    btnEliminar.hidden = true;
    return;
  }

  const m = MASCOTAS.find((x) => String(x.id) === String(selId));
  if (m && m.foto_url) {
    img.src = `${m.foto_url}?v=${encodeURIComponent(m.foto_referencia || String(m.id))}`;
    img.hidden = false;
    wrap.hidden = false;
    btnAmpliar.hidden = false;
    btnEliminar.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
    wrap.hidden = true;
    btnAmpliar.hidden = true;
    btnEliminar.hidden = true;
  }
}

function getMascotaFotoPreviewSrc() {
  const img = document.getElementById('mascotaFotoPreview');
  if (!img || img.hidden || !img.getAttribute('src')) return null;
  return img.src;
}

function abrirFotoLightbox() {
  const src = getMascotaFotoPreviewSrc();
  if (!src) return;
  const lb = document.getElementById('mascotaFotoLightbox');
  const lbImg = document.getElementById('mascotaFotoLightboxImg');
  const errEl = document.getElementById('mascotaFotoLightboxError');
  errEl.hidden = true;
  lbImg.onload = () => { errEl.hidden = true; };
  lbImg.onerror = () => { errEl.hidden = false; };
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  lbImg.src = src;
  const closeBtn = document.getElementById('mascotaFotoLightboxClose');
  if (closeBtn) queueMicrotask(() => closeBtn.focus());
}

function cerrarFotoLightbox() {
  const lb = document.getElementById('mascotaFotoLightbox');
  const lbImg = document.getElementById('mascotaFotoLightboxImg');
  const errEl = document.getElementById('mascotaFotoLightboxError');
  lbImg.onload = null;
  lbImg.onerror = null;
  lbImg.removeAttribute('src');
  if (errEl) errEl.hidden = true;
  lb.hidden = true;
  document.body.style.overflow = '';
}

async function eliminarFotoGuardadaMascota() {
  const id = document.getElementById('mascotaSelect').value;
  const errorsEl = document.getElementById('pedidoErrors');
  if (!id) return;
  if (!window.confirm('¿Eliminar la foto de referencia guardada para esta mascota? El pedido no se borra.')) return;
  try {
    const resp = await fetch(`/api/mascotas/${id}/foto`, { method: 'DELETE' });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      errorsEl.textContent = (body.errors && body.errors.join(', ')) || 'No se pudo eliminar la foto';
      return;
    }
    errorsEl.textContent = '';
    await cargarMascotasPorTelefono();
    document.getElementById('mascotaSelect').value = id;
    refreshMascotaFotoPreview();
  } catch {
    errorsEl.textContent = 'Error de red al eliminar la foto';
  }
}

async function submitPedido(event) {
  event.preventDefault();
  const form = event.currentTarget;
  syncAllPedidoConstraints();
  if (!form.reportValidity()) return;
  const fotoInput = document.getElementById('mascotaFotoInput');
  const fotoFile = fotoInput.files && fotoInput.files[0] ? fotoInput.files[0] : null;
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

  // Origen del cliente: obligatorio. Si eligió "Otros", guardar el texto libre escrito.
  if (!(data.origen_cliente || '').trim()) {
    errorsEl.textContent = 'Selecciona el origen del cliente (¿cómo nos conoció?).';
    document.getElementById('origenSearch')?.focus();
    return;
  }
  if (data.origen_cliente === ORIGEN_OTROS) {
    const otro = (data.origen_cliente_otro || '').trim();
    if (!otro) {
      errorsEl.textContent = 'Seleccionaste "Otros" en Origen del cliente: escribe cuál.';
      document.querySelector('#pedidoForm [name="origen_cliente_otro"]')?.focus();
      return;
    }
    data.origen_cliente = otro;
  }
  delete data.origen_cliente_otro;

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

    const keepTel = data.telefono_propietario || '';
    const keepAcud = data.telefono_acudiente || '';
    const mascotaIdParaFoto = body.mascota_id || null;

    form.reset();
    setRazaValue('');
    setOrigenValue('');
    setTipoClienteValue('');
    document.getElementById('precioSugerido').hidden = true;
    document.getElementById('mixtoWrapper').hidden = true;
    document.getElementById('adicInfoPopup').hidden = true;

    form.elements['telefono_propietario'].value = keepTel;
    form.elements['telefono_acudiente'].value = keepAcud;

    syncAllPedidoConstraints();

    await buscarPedidos();

    if (fotoFile && mascotaIdParaFoto) {
      const fd = new FormData();
      fd.append('foto', fotoFile);
      try {
        const up = await fetch(`/api/mascotas/${mascotaIdParaFoto}/foto`, { method: 'POST', body: fd });
        const upBody = await up.json().catch(() => ({}));
        if (!up.ok || !upBody.ok) {
          errorsEl.textContent = `Pedido guardado. La foto no se subió: ${(upBody.errors && upBody.errors.join(', ')) || 'error'}`;
        }
      } catch {
        errorsEl.textContent = 'Pedido guardado. Error de red al subir la foto; podés intentar de nuevo en el próximo pedido.';
      }
    }

    await cargarMascotasPorTelefono();
    if (mascotaIdParaFoto) {
      document.getElementById('mascotaSelect').value = String(mascotaIdParaFoto);
    }
    fotoInput.value = '';
    refreshMascotaFotoPreview();
  } catch {
    errorsEl.textContent = 'Error de red al guardar pedido';
  }
}

/**
 * Búsqueda inteligente: si el texto es un teléfono, busca pedidos directo;
 * si es un nombre de mascota, muestra resultados para elegir y al seleccionar
 * fija el teléfono y continúa con el flujo normal de pedidos.
 */
async function buscarPedidosSmart() {
  const input = document.getElementById('filtroTelefono');
  const q = input.value.trim();
  const resultados = document.getElementById('resultadosMascota');
  const msg = document.getElementById('pedidosMsg');
  resultados.hidden = true;
  resultados.innerHTML = '';

  if (!q) { msg.innerHTML = '<span style="color:#f87171">Ingrese un teléfono o nombre de mascota</span>'; return; }

  if (BuscarMascota.esTelefono(q)) {
    await buscarPedidos();
    return;
  }

  if (q.length < 2) { msg.innerHTML = '<span style="color:#9ca3af">Escribe al menos 2 letras del nombre.</span>'; return; }
  msg.innerHTML = '<span style="color:#9ca3af">Buscando mascotas…</span>';
  try {
    const body = await BuscarMascota.buscarPorNombre(q);
    msg.textContent = '';
    BuscarMascota.render(resultados, body, (telefono) => {
      input.value = telefono;
      resultados.hidden = true;
      resultados.innerHTML = '';
      buscarPedidos();
    });
  } catch (e) {
    msg.innerHTML = `<span style="color:#f87171">${e.message || 'Error al buscar'}</span>`;
  }
}

async function buscarPedidos() {
  const tel = document.getElementById('filtroTelefono').value.trim();
  const ul = document.getElementById('listaPedidos');
  const msg = document.getElementById('pedidosMsg');
  ul.innerHTML = '';
  msg.textContent = '';
  if (!tel) { msg.innerHTML = '<span style="color:#f87171">Ingrese un teléfono</span>'; return; }

  // Step 1: prellenar teléfono, buscar cliente y siempre recargar mascotas (incl. foto) desde el API
  const form = document.getElementById('pedidoForm');
  form.elements['telefono_propietario'].value = tel;
  form.elements['telefono_acudiente'].value = '';
  try {
    const clientResp = await fetch(`/api/clientes?telefono=${encodeURIComponent(tel)}`);
    if (clientResp.ok) {
      const clientBody = await clientResp.json();
      if (clientBody.ok && clientBody.data) {
        const c = clientBody.data;
        form.elements['telefono_propietario'].value = c.telefono_propietario || tel;
        form.elements['telefono_acudiente'].value = c.telefono_acudiente || '';
        const nombre = c.nombre_propietario || c.telefono_propietario;
        msg.innerHTML = `<span style="color:#34d399">Cliente encontrado: <strong>${nombre}</strong></span>`;
      }
    }
  } catch { /* seguir sin cliente */ }
  try {
    await cargarMascotasPorTelefono();
  } catch { /* */ }

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
        btnEdit.onclick = async () => {
          await cargarPedidoEnFormulario(p);
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

async function cargarPedidoEnFormulario(p) {
  const form = document.getElementById('pedidoForm');
  form.elements['id'].value = p.id;
  form.elements['telefono_propietario'].value = p.telefono_propietario || '';
  form.elements['telefono_acudiente'].value = p.telefono_acudiente || '';
  form.elements['fecha_hora'].value = p.fecha_hora ? new Date(p.fecha_hora).toISOString().slice(0, 16) : '';
  form.elements['piso'].value = p.piso || '';
  document.getElementById('nombreMascota').value = p.nombre_mascota || '';
  setRazaValue(p.raza || '');
  document.getElementById('tamanoSelect').value = normalizeTamano(p.tamano || '');
  document.getElementById('pelajeSelect').value = p.pelaje || '';
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
  setGroomerPickerValue('1', p.groomer1 || '');
  setGroomerPickerValue('2', p.groomer2 || '');
  setOrigenValue(p.origen_cliente || '');
  setTipoClienteValue(p.tipo_cliente || '');
  updateMoney();
  document.getElementById('precioSugerido').hidden = true;
  suggestPrice();

  await cargarMascotasPorTelefono(true);
  form.elements['mascota_id'].value = p.mascota_id || '';
  const tipoSel = document.getElementById('tipoMascotaSelect');
  if (p.mascota_id) {
    const m = MASCOTAS.find((x) => String(x.id) === String(p.mascota_id));
    tipoSel.value = (m && m.tipo_mascota) ? m.tipo_mascota : '';
  } else {
    tipoSel.value = '';
  }

  document.getElementById('mascotaFotoInput').value = '';
  refreshMascotaFotoPreview();
  syncAllPedidoConstraints();
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
    syncTelefonoPropietarioValidity();
  }
}

/**
 * @param {boolean} [skipRefresh] si true, no actualiza la vista de foto (usar cuando todavía vas a setear mascota_id).
 */
async function cargarMascotasPorTelefono(skipRefresh) {
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
    if (!skipRefresh) refreshMascotaFotoPreview();
  } catch { /* silent */ }
}

async function onMascotaChange() {
  const id = document.getElementById('mascotaSelect').value;
  const tipoSel = document.getElementById('tipoMascotaSelect');
  document.getElementById('mascotaFotoInput').value = '';
  if (!id) {
    tipoSel.value = '';
    suggestPrice();
    refreshMascotaFotoPreview();
    syncAllPedidoConstraints();
    return;
  }
  let m = MASCOTAS.find((x) => String(x.id) === String(id));
  if (!m) {
    await cargarMascotasPorTelefono(true);
    document.getElementById('mascotaSelect').value = id;
    m = MASCOTAS.find((x) => String(x.id) === String(id));
  }
  if (!m) {
    syncAllPedidoConstraints();
    return;
  }
  document.getElementById('nombreMascota').value = m.nombre_mascota || '';
  setRazaValue(m.raza || '');
  document.getElementById('tamanoSelect').value = normalizeTamano(m.tamano || '');
  document.getElementById('pelajeSelect').value = m.pelaje || '';
  tipoSel.value = m.tipo_mascota || '';
  suggestPrice();
  refreshMascotaFotoPreview();
  syncAllPedidoConstraints();
}

/**
 * Pide el motivo de la eliminación en un modal. Devuelve el texto escrito o
 * null si el usuario cancela. El motivo queda en la auditoría del servidor.
 */
function pedirMotivoEliminacion(p) {
  return new Promise((resolve) => {
    const modal = document.getElementById('motivoModal');
    const textarea = document.getElementById('motivoTexto');
    const errorEl = document.getElementById('motivoError');
    const detalle = document.getElementById('motivoModalDetalle');
    const aviso = document.getElementById('motivoModalAviso');
    const btnOk = document.getElementById('motivoConfirmar');
    const btnCancel = document.getElementById('motivoCancelar');
    const backdrop = document.getElementById('motivoModalBackdrop');
    const chips = document.querySelectorAll('#motivoChips .motivo-chip');

    const fecha = p.fecha_hora
      ? new Date(p.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '';
    detalle.textContent = `${p.nombre_mascota || 'Sin mascota'} · ${p.servicio || 'Sin servicio'}`
      + `${fecha ? ` · ${fecha}` : ''}${p.piso ? ` · ${p.piso}` : ''}`;

    if (p.cerrado) {
      aviso.hidden = false;
      aviso.textContent = 'Este pedido ya está CERRADO: al eliminarlo dejará de contar en reportes, dashboard y cierre de caja.';
    } else {
      aviso.hidden = true;
    }

    textarea.value = '';
    errorEl.textContent = '';
    chips.forEach((c) => c.classList.remove('active'));
    modal.hidden = false;
    document.body.classList.add('modal-abierto');
    setTimeout(() => textarea.focus(), 50);

    function limpiar() {
      modal.hidden = true;
      document.body.classList.remove('modal-abierto');
      chips.forEach((c) => c.removeEventListener('click', onChip));
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    }

    function onChip(e) {
      const btn = e.currentTarget;
      const preset = btn.getAttribute('data-motivo') || '';
      chips.forEach((c) => c.classList.toggle('active', c === btn));
      textarea.value = preset;
      errorEl.textContent = '';
      textarea.focus();
    }

    function onOk() {
      const motivo = textarea.value.trim();
      if (motivo.length < 3) {
        errorEl.textContent = 'Escribe el motivo (mínimo 3 caracteres).';
        textarea.focus();
        return;
      }
      limpiar();
      resolve(motivo);
    }

    function onCancel() {
      limpiar();
      resolve(null);
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      // Ctrl/Cmd + Enter confirma sin salir del textarea.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onOk(); }
    }

    chips.forEach((c) => c.addEventListener('click', onChip));
    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

async function eliminarPedido(p) {
  const msg = document.getElementById('pedidosMsg');
  const motivo = await pedirMotivoEliminacion(p);
  if (!motivo) return;
  try {
    const resp = await fetch(`/api/pedidos/${p.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
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
      setOrigenValue('');
      setTipoClienteValue('');
      syncAllPedidoConstraints();
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
    setOrigenValue('');
    setTipoClienteValue('');
    syncAllPedidoConstraints();
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
}

/** Trae el catálogo editable de orígenes; si falla, deja el respaldo del código. */
async function loadOrigenesCliente() {
  try {
    const resp = await fetch('/api/origenes/activos');
    const { ok, data } = await resp.json();
    if (!ok || !Array.isArray(data) || data.length === 0) return;
    const nombres = data
      .map((o) => String(o.nombre || '').trim())
      .filter((n) => n && n.toLowerCase() !== ORIGEN_OTROS.toLowerCase());
    ORIGENES_CLIENTE = [...nombres, ORIGEN_OTROS];
  } catch { /* se queda el respaldo */ }
}

function validateGroomers() {
  const g1 = (document.getElementById('groomer1Value')?.value || '').trim();
  const g2 = (document.getElementById('groomer2Value')?.value || '').trim();
  if (g1 && g2 && g1 === g2) {
    return 'El Groomer 2 no puede ser igual al Groomer 1.';
  }
  return null;
}

/** Mensaje en español para validación nativa del select Piso (required). */
function syncPisoRequiredValidity() {
  const pisoSel = document.getElementById('pisoSelect');
  if (!pisoSel) return;
  pisoSel.setCustomValidity(pisoSel.value.trim() ? '' : 'Selecciona el piso.');
}

/** Validación HTML5 (`required`): mensajes en español. */
function syncTelefonoPropietarioValidity() {
  const el = document.querySelector('#pedidoForm [name="telefono_propietario"]');
  if (!el) return;
  el.setCustomValidity(el.value.trim() ? '' : 'Ingresa el teléfono del propietario.');
}

function syncTipoRequiredValidity() {
  const el = document.getElementById('tipoMascotaSelect');
  if (!el) return;
  el.setCustomValidity(el.value.trim() ? '' : 'Selecciona Perro o Gato.');
}

function syncServicioRequiredValidity() {
  const el = document.getElementById('servicioSelect');
  if (!el) return;
  el.setCustomValidity(el.value.trim() ? '' : 'Selecciona un servicio.');
}

function syncRazaRequiredValidity() {
  const h = document.getElementById('razaValue');
  if (!h) return;
  h.setCustomValidity((h.value || '').trim() ? '' : 'Indica la raza.');
}

/**
 * Origen del cliente es obligatorio. El valor real vive en un input hidden
 * (barrado de la validación nativa), así que el mensaje se apoya en el input
 * de búsqueda visible y el bloqueo definitivo se hace en submitPedido().
 */
function syncOrigenRequiredValidity() {
  const hidden = document.getElementById('origenValue');
  const search = document.getElementById('origenSearch');
  if (!hidden || !search) return;
  const val = (hidden.value || '').trim();
  const otroInput = document.querySelector('#pedidoForm [name="origen_cliente_otro"]');
  if (!val) {
    search.setCustomValidity('Selecciona el origen del cliente.');
  } else if (val === ORIGEN_OTROS && !(otroInput?.value || '').trim()) {
    search.setCustomValidity('Elegiste "Otros": escribe cuál en el campo de abajo.');
  } else {
    search.setCustomValidity('');
  }
}

function syncAllPedidoConstraints() {
  syncTelefonoPropietarioValidity();
  syncPisoRequiredValidity();
  syncTipoRequiredValidity();
  syncServicioRequiredValidity();
  syncRazaRequiredValidity();
  syncOrigenRequiredValidity();
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
  loadOrigenesCliente();
  initRazaDropdown();
  initGroomerPickers();
  initOrigenPicker();
  initTipoClientePicker();

  document.querySelector('#pedidoForm [name="origen_cliente_otro"]')
    ?.addEventListener('input', syncOrigenRequiredValidity);

  document.getElementById('servicioSelect').addEventListener('change', onServicioChange);
  document.getElementById('tamanoSelect').addEventListener('change', suggestPrice);
  document.getElementById('pelajeSelect').addEventListener('change', suggestPrice);
  document.getElementById('tipoMascotaSelect').addEventListener('change', () => {
    suggestPrice();
    syncTipoRequiredValidity();
  });
  document.getElementById('pedidoForm').addEventListener('submit', submitPedido);
  document.getElementById('btnBuscarPedidos').addEventListener('click', buscarPedidosSmart);
  document.getElementById('filtroTelefono').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarPedidosSmart(); }
  });
  const pisoSel = document.getElementById('pisoSelect');
  if (pisoSel) {
    syncAllPedidoConstraints();
    pisoSel.addEventListener('change', syncPisoRequiredValidity);
  }
  document.getElementById('pedidoForm').elements['precio'].addEventListener('input', updateMoney);
  document.getElementById('pedidoForm').elements['adicionales_descuentos'].addEventListener('input', updateMoney);
  const telPropietario = document.getElementById('pedidoForm').elements['telefono_propietario'];
  const onTelPropChange = () => {
    syncTelefonoPropietarioValidity();
    void cargarMascotasPorTelefono();
  };
  telPropietario.addEventListener('input', syncTelefonoPropietarioValidity);
  telPropietario.addEventListener('change', onTelPropChange);
  telPropietario.addEventListener('blur', () => {
    syncTelefonoPropietarioValidity();
    if (telPropietario.value.trim()) void cargarMascotasPorTelefono();
  });
  document.getElementById('mascotaSelect').addEventListener('change', () => { void onMascotaChange(); });

  document.getElementById('mascotaFotoLightboxBackdrop').addEventListener('click', cerrarFotoLightbox);
  document.getElementById('mascotaFotoLightboxClose').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    cerrarFotoLightbox();
  });
  document.getElementById('btnAmpliarFoto').addEventListener('click', (e) => {
    e.preventDefault();
    abrirFotoLightbox();
  });
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('mascotaFotoLightbox');
    if (e.key === 'Escape' && lb && !lb.hidden) {
      e.preventDefault();
      cerrarFotoLightbox();
    }
  });

  // Mixto payment toggle
  document.getElementById('metodoPagoSelect').addEventListener('change', onMetodoPagoChange);
  document.querySelector('[name="monto_pago_1"]').addEventListener('input', updateMixtoMoney);
  document.querySelector('[name="monto_pago_2"]').addEventListener('input', updateMixtoMoney);

  // Info popup toggle
  document.getElementById('adicInfoBtn').addEventListener('click', toggleInfoPopup);

  document.getElementById('mascotaFotoInput').addEventListener('change', refreshMascotaFotoPreview);
  document.getElementById('btnQuitarFotoSeleccion').addEventListener('click', () => {
    document.getElementById('mascotaFotoInput').value = '';
    refreshMascotaFotoPreview();
  });
  document.getElementById('btnEliminarFotoGuardada').addEventListener('click', eliminarFotoGuardadaMascota);

  prefillPhones();
  cargarMascotasPorTelefono();
  updateMoney();
}

document.addEventListener('DOMContentLoaded', init);
