let RAZAS = [];
let RAZA_TAMANO = {};

const SERVICIOS = ['HERBAL PET SPA','ROCKSTAR','SANROQUERO','SHANTI PET SPA','SUPERSTAR','OTRO'];
const METODOS_PAGO = ['Billetera digital','Cortesía','Efectivo','Garantía','Promoción','Tarjeta crédito','Tarjeta débito','Transferencia'];
const PELAJE = ['Corto','Medio','Largo'];
const GROOMERS = ['Alejandra','Andrés','Angie','Camila','Carolina','Daniela','Darwin','Eliana','Esteban','Gustavo','Héctor','Isabel','Jeidy','Jeison','Jesús','Joel','Jordy','Juan','Julieth','Karol','Katherine','Keni','Laura','Lili','Loren','Lulu','Manuel','María Fernanda','Maryori','Miguel','San Roque','Santiago','Steven','Tatiana','Vanessa','Otro'];

function fillDatalist(datalist, items) {
  datalist.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item;
    frag.appendChild(opt);
  }
  datalist.appendChild(frag);
}

function setupFilterable(input, select) {
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    for (const opt of select.options) {
      if (!opt.value) continue;
      opt.hidden = !opt.textContent.toLowerCase().includes(q);
    }
  });
}

function onRazaChange() {
  const raza = document.getElementById('razaSelect').value;
  const tamanoSelect = document.getElementById('tamanoSelect');
  if (RAZA_TAMANO[raza]) {
    tamanoSelect.value = RAZA_TAMANO[raza];
  }
  document.getElementById('razaOtroWrapper').hidden = !(raza && raza.toUpperCase() === 'OTROS');
}

function onServicioChange() {
  const s = document.getElementById('servicioSelect').value;
  document.getElementById('servicioOtroWrapper').hidden = s !== 'OTRO';
}

async function submitPedido(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const errorsEl = document.getElementById('pedidoErrors');
  errorsEl.textContent = '';

  // Si servicio = OTRO usar servicio_otro
  if (data.servicio === 'OTRO' && data.servicio_otro) {
    data.servicio = data.servicio_otro;
  }
  delete data.servicio_otro;
  // Omitir campo libre de raza: siempre usar lista
  delete data.raza_otro;

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
      errorsEl.textContent = (body && body.errors && body.errors.join(', ')) || 'Error al guardar pedido';
      return;
    }
    form.reset();
    // prefill from storage again
    prefillPhones();
    await buscarPedidos();
  } catch (e) {
    errorsEl.textContent = 'Error de red al guardar pedido';
  }
}

async function buscarPedidos() {
  const tel = document.getElementById('filtroTelefono').value.trim();
  const ul = document.getElementById('listaPedidos');
  const msg = document.getElementById('pedidosMsg');
  ul.innerHTML = '';
  msg.textContent = '';
  if (!tel) { msg.textContent = 'Ingrese un teléfono'; return; }
  try {
    const resp = await fetch(`/api/pedidos?telefono=${encodeURIComponent(tel)}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) { msg.textContent = 'Error al buscar'; return; }
    for (const p of body.data) {
      const li = document.createElement('li');
      li.textContent = `${new Date(p.fecha_hora).toLocaleString()} - ${p.servicio} - ${p.telefono_propietario}`;
      li.addEventListener('click', () => cargarPedidoEnFormulario(p));
      ul.appendChild(li);
    }
  } catch (e) {
    msg.textContent = 'Error de red al buscar';
  }
}

function cargarPedidoEnFormulario(p) {
  const form = document.getElementById('pedidoForm');
  form.elements['id'].value = p.id;
  form.elements['telefono_propietario'].value = p.telefono_propietario || '';
  form.elements['telefono_acudiente'].value = p.telefono_acudiente || '';
  form.elements['fecha_hora'].value = p.fecha_hora ? new Date(p.fecha_hora).toISOString().slice(0,16) : '';
  form.elements['raza'].value = p.raza || '';
  document.getElementById('tamanoSelect').value = p.tamano || '';
  document.getElementById('pelajeSelect').value = p.pelaje || '';
  document.getElementById('servicioSelect').value = p.servicio || '';
  document.getElementById('metodoPagoSelect').value = p.metodo_pago || '';
  document.getElementById('groomer1Select').value = p.groomer1 || '';
  document.getElementById('groomer2Select').value = p.groomer2 || '';
}

function prefillPhones() {
  try {
    const pre = JSON.parse(localStorage.getItem('pedido_prefill') || '{}');
    if (pre.telefono_propietario) document.querySelector('#pedidoForm [name="telefono_propietario"]').value = pre.telefono_propietario;
    if (pre.telefono_acudiente) document.querySelector('#pedidoForm [name="telefono_acudiente"]').value = pre.telefono_acudiente;
  } catch {}
}

function updateMoney() {
  const f = document.getElementById('pedidoForm');
  const base = Number(f.elements['precio'].value || 0);
  const adic = Number(f.elements['adicionales_descuentos'].value || 0);
  const total = base + adic;
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const baseEl = document.getElementById('precioFmt');
  const adicEl = document.getElementById('adicionalesFmt');
  const totalEl = document.getElementById('precioFinal');
  baseEl.textContent = fmt.format(base);
  adicEl.textContent = fmt.format(adic);
  totalEl.textContent = fmt.format(total);
  adicEl.classList.toggle('negative', adic < 0);
  adicEl.classList.toggle('positive', adic > 0);
}

function init() {
  // Cargar catálogo desde servidor
  fetch('/api/catalogos/raza-tamano')
    .then(r => r.json()).then(({ ok, data }) => {
      if (ok && data) {
        RAZAS = data.razas || [];
        RAZA_TAMANO = data.mapping || {};
      }
      fillDatalist(document.getElementById('razas'), RAZAS);
    })
    .catch(() => fillDatalist(document.getElementById('razas'), RAZAS));
  fillDatalist(document.getElementById('servicios'), SERVICIOS);
  fillDatalist(document.getElementById('metodosPago'), METODOS_PAGO);
  fillDatalist(document.getElementById('groomers'), GROOMERS);
  document.getElementById('razaSelect').addEventListener('change', onRazaChange);
  document.getElementById('servicioSelect').addEventListener('change', onServicioChange);
  document.getElementById('pedidoForm').addEventListener('submit', submitPedido);
  document.getElementById('btnBuscarPedidos').addEventListener('click', buscarPedidos);
  document.getElementById('pedidoForm').elements['precio'].addEventListener('input', updateMoney);
  document.getElementById('pedidoForm').elements['adicionales_descuentos'].addEventListener('input', updateMoney);
  prefillPhones();
  // Prefill filtro con teléfono propietario si existe
  const pre = JSON.parse(localStorage.getItem('pedido_prefill') || '{}');
  if (pre.telefono_propietario) document.getElementById('filtroTelefono').value = pre.telefono_propietario;
  updateMoney();
}

document.addEventListener('DOMContentLoaded', init);


