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

const form = document.getElementById('origenForm');
const errorsEl = document.getElementById('origenErrors');
const listEl = document.getElementById('origenList');
const filtroEstadoEl = document.getElementById('filtroOrigenEstado');
const buscarEl = document.getElementById('buscarOrigen');
const btnCancel = document.getElementById('btnCancel');
const btnSubmit = document.getElementById('btnSubmit');
const formLegend = document.getElementById('formLegend');

let origenesCache = [];

function filtrarOrigenes(data) {
  const estado = filtroEstadoEl?.value || 'todos';
  const q = (buscarEl?.value || '').trim().toLowerCase();
  let out = data;
  if (estado === 'activos') out = out.filter((o) => o.activo);
  if (estado === 'inactivos') out = out.filter((o) => !o.activo);
  if (q) out = out.filter((o) => String(o.nombre || '').toLowerCase().includes(q));
  return out;
}

function renderOrigenList() {
  listEl.innerHTML = '';
  const data = filtrarOrigenes(origenesCache);

  if (origenesCache.length === 0) {
    listEl.innerHTML = '<p style="color:#9ca3af">No hay orígenes registrados. Crea el primero con el formulario de arriba.</p>';
    return;
  }

  if (data.length === 0) {
    const q = (buscarEl?.value || '').trim();
    const estado = filtroEstadoEl?.value || 'todos';
    let msg = 'No hay resultados para este filtro.';
    if (q) msg = `Sin coincidencias para "${q}".`;
    else if (estado === 'activos') msg = 'No hay orígenes activos.';
    else if (estado === 'inactivos') msg = 'No hay orígenes inactivos.';
    const p = document.createElement('p');
    p.style.color = '#9ca3af';
    p.textContent = msg;
    listEl.appendChild(p);
    return;
  }

  for (const o of data) {
    const card = document.createElement('div');
    card.className = 'groomer-card' + (o.activo ? '' : ' groomer-inactive');

    const info = document.createElement('div');
    info.className = 'groomer-info';
    const nombre = document.createElement('strong');
    nombre.textContent = o.nombre;
    const badge = document.createElement('span');
    badge.className = `badge ${o.activo ? 'badge-active' : 'badge-inactive'}`;
    badge.textContent = o.activo ? 'Activo' : 'Inactivo';
    info.appendChild(nombre);
    info.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'groomer-actions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.textContent = 'Editar';
    btnEdit.onclick = () => editOrigen(o);

    const btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.textContent = o.activo ? 'Desactivar' : 'Activar';
    btnToggle.className = o.activo ? 'btn-danger' : 'btn-success';
    btnToggle.onclick = () => toggleActivo(o.id, !o.activo);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.textContent = 'Eliminar';
    btnDelete.className = 'btn-danger';
    btnDelete.onclick = () => eliminarOrigen(o);

    actions.appendChild(btnEdit);
    actions.appendChild(btnToggle);
    actions.appendChild(btnDelete);

    card.appendChild(info);
    card.appendChild(actions);
    listEl.appendChild(card);
  }
}

async function loadOrigenes() {
  try {
    const resp = await fetch('/api/origenes');
    const { ok, data } = await resp.json();
    if (!ok || !data) {
      origenesCache = [];
      renderOrigenList();
      return;
    }
    origenesCache = data;
    renderOrigenList();
  } catch {
    origenesCache = [];
    listEl.innerHTML = '<p class="errors">Error al cargar los orígenes.</p>';
  }
}

function editOrigen(o) {
  form.elements['id'].value = o.id;
  form.elements['nombre'].value = o.nombre;
  formLegend.textContent = `Editando: ${o.nombre}`;
  btnSubmit.textContent = 'Actualizar origen';
  btnCancel.hidden = false;
  errorsEl.textContent = '';
  form.elements['nombre'].focus();
}

function resetForm() {
  form.reset();
  form.elements['id'].value = '';
  formLegend.textContent = 'Registrar nuevo origen';
  btnSubmit.textContent = 'Guardar origen';
  btnCancel.hidden = true;
  errorsEl.textContent = '';
}

btnCancel.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorsEl.textContent = '';
  const data = Object.fromEntries(new FormData(form).entries());
  const id = data.id && String(data.id).trim();

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/origenes/${id}` : '/api/origenes';
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: data.nombre }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body?.errors?.join(', ')) || 'Error al guardar';
      return;
    }
    resetForm();
    await loadOrigenes();
  } catch {
    errorsEl.textContent = 'Error de red al guardar';
  }
});

async function toggleActivo(id, activo) {
  try {
    const resp = await fetch(`/api/origenes/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
    if (resp.ok) await loadOrigenes();
  } catch { /* silent */ }
}

/** Los pedidos ya guardados conservan el texto del origen, así que borrar no altera el histórico. */
async function eliminarOrigen(o) {
  const ok = window.confirm(
    `¿Eliminar el origen "${o.nombre}"?\n\nDejará de aparecer en el pedido. Los pedidos ya guardados con ese origen no se modifican.`
  );
  if (!ok) return;
  try {
    const resp = await fetch(`/api/origenes/${o.id}`, { method: 'DELETE' });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body?.errors?.join(', ')) || 'Error al eliminar';
      return;
    }
    if (String(form.elements['id'].value) === String(o.id)) resetForm();
    await loadOrigenes();
  } catch {
    errorsEl.textContent = 'Error de red al eliminar';
  }
}

filtroEstadoEl?.addEventListener('change', () => renderOrigenList());
buscarEl?.addEventListener('input', () => renderOrigenList());

document.addEventListener('DOMContentLoaded', loadOrigenes);
