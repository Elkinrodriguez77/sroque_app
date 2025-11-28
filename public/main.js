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

  // Adjuntar mascotas desde el estado dinámico
  data.mascotas = (window._mascotasState || []).filter((m) => m && m.nombre_mascota);

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
  const c = window._clienteEncontrado || {};
  try {
    const prefill = {
      telefono_propietario: c.telefono_propietario || document.getElementById('buscarTelefono').value || '',
      telefono_acudiente: c.telefono_acudiente || ''
    };
    localStorage.setItem('pedido_prefill', JSON.stringify(prefill));
  } catch {}
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
  form.elements['nombre_propietario'].value = c.nombre_propietario || '';
  form.elements['nombre_acudiente'].value = c.nombre_acudiente || '';
  form.elements['email'].value = c.email || '';
  form.elements['perfil_instagram'].value = c.perfil_instagram || '';
  form.elements['direccion'].value = c.direccion || '';
  form.elements['autorizacion_tratamiento_datos'].value = String(c.autorizacion_tratamiento_datos);
  initMascotasSection(
    (c.mascotas && c.mascotas.length)
      ? c.mascotas
      : []
  );
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

// -------- Mascotas dinámicas --------
window._mascotasState = [];
const mascotasContainer = document.getElementById('mascotasContainer');
const btnAddMascota = document.getElementById('btnAddMascota');

function createEmptyMascota() {
  return {
    nombre_mascota: '',
    alimento_mascota: '',
    fecha_nacimiento: '',
    fecha_antipulgas: '',
    producto_antipulgas: '',
    fecha_antiparasitario: '',
    producto_antiparasitario: '',
    alergias: '',
    observaciones: '',
  };
}

function renderMascotas() {
  mascotasContainer.innerHTML = '';
  window._mascotasState.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'mascota-card';

    const header = document.createElement('div');
    header.className = 'mascota-card-header';
    header.innerHTML = `<span>Mascota ${idx + 1}</span>`;
    if (window._mascotasState.length > 1) {
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.textContent = 'Eliminar';
      btnDel.onclick = () => {
        window._mascotasState.splice(idx, 1);
        renderMascotas();
      };
      header.appendChild(btnDel);
    }
    card.appendChild(header);

    const fields = [
      { label: 'Nombre', key: 'nombre_mascota', type: 'text', max: 200 },
      { label: 'Alimento', key: 'alimento_mascota', type: 'text', max: 50 },
      { label: 'Fecha nacimiento', key: 'fecha_nacimiento', type: 'date' },
      { label: 'Fecha antipulgas', key: 'fecha_antipulgas', type: 'date' },
      { label: 'Producto antipulgas', key: 'producto_antipulgas', type: 'text', max: 50 },
      { label: 'Fecha antiparasitario', key: 'fecha_antiparasitario', type: 'date' },
      { label: 'Producto antiparasitario', key: 'producto_antiparasitario', type: 'text', max: 50 },
    ];

    fields.forEach((f) => {
      const lab = document.createElement('label');
      lab.textContent = f.label;
      const input = document.createElement('input');
      input.type = f.type;
      if (f.max) input.maxLength = f.max;
      input.value = m[f.key] || '';
      input.addEventListener('input', (e) => {
        window._mascotasState[idx][f.key] = e.target.value;
      });
      lab.appendChild(input);
      card.appendChild(lab);
    });

    const alergiasLabel = document.createElement('label');
    alergiasLabel.textContent = '¿Alergias?';
    const selAlergias = document.createElement('select');
    ['', 'true', 'false'].forEach((val) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val === '' ? 'No especifica' : (val === 'true' ? 'Sí' : 'No');
      selAlergias.appendChild(opt);
    });
    selAlergias.value =
      m.alergias === true ? 'true' :
      m.alergias === false ? 'false' :
      (m.alergias || '');
    selAlergias.addEventListener('change', (e) => {
      const v = e.target.value;
      window._mascotasState[idx].alergias = v === '' ? '' : (v === 'true');
    });
    alergiasLabel.appendChild(selAlergias);
    card.appendChild(alergiasLabel);

    const obsLabel = document.createElement('label');
    obsLabel.textContent = 'Observaciones';
    const ta = document.createElement('textarea');
    ta.maxLength = 500;
    ta.value = m.observaciones || '';
    ta.addEventListener('input', (e) => {
      window._mascotasState[idx].observaciones = e.target.value;
    });
    obsLabel.appendChild(ta);
    card.appendChild(obsLabel);

    mascotasContainer.appendChild(card);
  });
}

function initMascotasSection(initialMascotas) {
  const list = Array.isArray(initialMascotas) && initialMascotas.length
    ? initialMascotas
    : [createEmptyMascota()];
  window._mascotasState = list.map((m) => ({
    nombre_mascota: m.nombre_mascota || '',
    alimento_mascota: m.alimento_mascota || '',
    fecha_nacimiento: m.fecha_nacimiento || '',
    fecha_antipulgas: m.fecha_antipulgas || '',
    producto_antipulgas: m.producto_antipulgas || '',
    fecha_antiparasitario: m.fecha_antiparasitario || '',
    producto_antiparasitario: m.producto_antiparasitario || '',
    alergias: m.alergias,
    observaciones: m.observaciones || '',
  }));
  renderMascotas();
}

btnAddMascota.addEventListener('click', () => {
  window._mascotasState.push(createEmptyMascota());
  renderMascotas();
});

// Inicial al cargar la página (nuevo cliente)
initMascotasSection([]);


