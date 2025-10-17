async function submitForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const errorsEl = document.getElementById('formErrors');
  const successEl = document.getElementById('success');
  errorsEl.textContent = '';
  successEl.hidden = true;

  const required = ['es_propietario', 'telefono_propietario', 'autorizacion_tratamiento_datos'];
  const localErrors = required.filter((k) => !data[k]);
  if (localErrors.length) {
    errorsEl.textContent = 'Complete los campos obligatorios.';
    return;
  }

  try {
    const id = data.id && String(data.id).trim();
    const isUpdate = Boolean(id);
    const url = isUpdate ? `/api/clientes/${id}` : '/api/clientes';
    const method = isUpdate ? 'PUT' : 'POST';
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body && body.errors && body.errors.join(', ')) || 'Error al guardar';
      return;
    }
    form.reset();
    form.hidden = true;
    document.getElementById('lookupOptions').hidden = true;
    document.getElementById('lookupMsg').textContent = '';
    document.getElementById('buscarTelefono').value = '';
    document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth' });
    successEl.hidden = false;
  } catch (e) {
    errorsEl.textContent = 'Error de red. Intente nuevamente.';
  }
}

document.getElementById('clienteForm').addEventListener('submit', submitForm);

// Búsqueda y opciones
const buscarTelefonoInput = document.getElementById('buscarTelefono');
const btnBuscar = document.getElementById('btnBuscar');
const lookupMsg = document.getElementById('lookupMsg');
const lookupOptions = document.getElementById('lookupOptions');
const btnPedido = document.getElementById('btnPedido');
const btnActualizar = document.getElementById('btnActualizar');

async function buscarCliente() {
  lookupMsg.textContent = '';
  lookupOptions.hidden = true;
  const tel = (buscarTelefonoInput.value || '').trim();
  if (!tel) {
    lookupMsg.textContent = 'Ingrese un teléfono para buscar.';
    return;
  }
  try {
    const resp = await fetch(`/api/clientes?telefono=${encodeURIComponent(tel)}`);
    if (resp.status === 404) {
      // No existe: mostrar formulario de creación y prellenar el teléfono
      const form = document.getElementById('clienteForm');
      form.reset();
      form.hidden = false;
      form.elements['id'].value = '';
      form.elements['telefono_propietario'].value = tel;
      form.elements['es_propietario'].value = '';
      toggleAcudienteRequirement();
      document.getElementById('success').hidden = true;
      return;
    }
    const body = await resp.json();
    if (!resp.ok || !body || !body.ok) {
      lookupMsg.textContent = (body && body.errors && body.errors.join(', ')) || 'Error al buscar';
      return;
    }
    // Existe: mostrar opciones
    window._clienteEncontrado = body.data; // cache simple
    lookupOptions.hidden = false;
  } catch (e) {
    lookupMsg.textContent = 'Error de red al buscar.';
  }
}

btnBuscar.addEventListener('click', buscarCliente);

btnPedido.addEventListener('click', () => {
  window.location.href = '/pedido.html';
});

btnActualizar.addEventListener('click', () => {
  const c = window._clienteEncontrado;
  if (!c) return;
  const form = document.getElementById('clienteForm');
  form.hidden = false;
  document.getElementById('success').hidden = true;
  // Prefill
  form.elements['id'].value = c.id;
  form.elements['es_propietario'].value = String(c.es_propietario);
  form.elements['telefono_propietario'].value = c.telefono_propietario || '';
  form.elements['telefono_acudiente'].value = c.telefono_acudiente || '';
  form.elements['email'].value = c.email || '';
  form.elements['perfil_instagram'].value = c.perfil_instagram || '';
  form.elements['direccion'].value = c.direccion || '';
  form.elements['nombre_mascota'].value = c.nombre_mascota || '';
  form.elements['alimento_mascota'].value = c.alimento_mascota || '';
  form.elements['fecha_nacimiento'].value = c.fecha_nacimiento || '';
  form.elements['fecha_antipulgas'].value = c.fecha_antipulgas || '';
  form.elements['producto_antipulgas'].value = c.producto_antipulgas || '';
  form.elements['fecha_antiparasitario'].value = c.fecha_antiparasitario || '';
  form.elements['producto_antiparasitario'].value = c.producto_antiparasitario || '';
  form.elements['alergias'].value = c.alergias === null || c.alergias === undefined ? '' : String(c.alergias);
  form.elements['observaciones'].value = c.observaciones || '';
  form.elements['autorizacion_tratamiento_datos'].value = String(c.autorizacion_tratamiento_datos);
});

// Mostrar/ocultar y exigir teléfono de acudiente según es_propietario
const form = document.getElementById('clienteForm');
const esPropSelect = form.elements['es_propietario'];
const acudienteWrapper = document.getElementById('acudienteWrapper');

function toggleAcudienteRequirement() {
  const shouldShow = esPropSelect.value === 'false';
  const acudienteInput = form.elements['telefono_acudiente'];
  if (shouldShow) {
    acudienteInput.setAttribute('required', 'required');
    acudienteInput.classList.add('highlight-required');
    acudienteWrapper.classList.add('highlight-required');
  } else {
    acudienteInput.removeAttribute('required');
    acudienteInput.classList.remove('highlight-required');
    acudienteWrapper.classList.remove('highlight-required');
  }
}

esPropSelect.addEventListener('change', toggleAcudienteRequirement);
// Inicial: sin ocultar, solo resaltar si aplica
toggleAcudienteRequirement();


