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

const form = document.getElementById('groomerForm');
const errorsEl = document.getElementById('groomerErrors');
const listEl = document.getElementById('groomerList');
const btnCancel = document.getElementById('btnCancel');
const btnSubmit = document.getElementById('btnSubmit');
const formLegend = document.getElementById('formLegend');

async function loadGroomers() {
  listEl.innerHTML = '';
  try {
    const resp = await fetch('/api/groomers');
    const { ok, data } = await resp.json();
    if (!ok || !data) return;
    for (const g of data) {
      const card = document.createElement('div');
      card.className = 'groomer-card' + (g.activo ? '' : ' groomer-inactive');

      const info = document.createElement('div');
      info.className = 'groomer-info';
      info.innerHTML = `
        <strong>${g.nombre} ${g.apellido}</strong>
        <span class="groomer-doc">Doc: ${g.documento}</span>
        <span class="badge ${g.activo ? 'badge-active' : 'badge-inactive'}">${g.activo ? 'Activo' : 'Inactivo'}</span>
      `;

      const actions = document.createElement('div');
      actions.className = 'groomer-actions';

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.textContent = 'Editar';
      btnEdit.onclick = () => editGroomer(g);

      const btnToggle = document.createElement('button');
      btnToggle.type = 'button';
      btnToggle.textContent = g.activo ? 'Desactivar' : 'Activar';
      btnToggle.className = g.activo ? 'btn-danger' : 'btn-success';
      btnToggle.onclick = () => toggleActivo(g.id, !g.activo);

      actions.appendChild(btnEdit);
      actions.appendChild(btnToggle);

      card.appendChild(info);
      card.appendChild(actions);
      listEl.appendChild(card);
    }
    if (data.length === 0) {
      listEl.innerHTML = '<p style="color:#9ca3af">No hay groomers registrados.</p>';
    }
  } catch {
    listEl.innerHTML = '<p class="errors">Error al cargar groomers.</p>';
  }
}

function editGroomer(g) {
  form.elements['id'].value = g.id;
  form.elements['documento'].value = g.documento;
  form.elements['nombre'].value = g.nombre;
  form.elements['apellido'].value = g.apellido;
  formLegend.textContent = `Editando: ${g.nombre} ${g.apellido}`;
  btnSubmit.textContent = 'Actualizar groomer';
  btnCancel.hidden = false;
  errorsEl.textContent = '';
  form.elements['documento'].focus();
}

function resetForm() {
  form.reset();
  form.elements['id'].value = '';
  formLegend.textContent = 'Registrar nuevo groomer';
  btnSubmit.textContent = 'Guardar groomer';
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
    const url = id ? `/api/groomers/${id}` : '/api/groomers';
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errorsEl.textContent = (body?.errors?.join(', ')) || 'Error al guardar';
      return;
    }
    resetForm();
    await loadGroomers();
  } catch {
    errorsEl.textContent = 'Error de red al guardar';
  }
});

async function toggleActivo(id, activo) {
  try {
    const resp = await fetch(`/api/groomers/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    });
    if (resp.ok) await loadGroomers();
  } catch { /* silent */ }
}

document.addEventListener('DOMContentLoaded', loadGroomers);
