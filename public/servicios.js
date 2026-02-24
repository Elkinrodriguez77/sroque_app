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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnBuscar').addEventListener('click', buscarMascotas);
  document.getElementById('nombreMascota').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarMascotas(); }
  });
});

async function buscarMascotas() {
  const nombre = document.getElementById('nombreMascota').value.trim();
  const msg = document.getElementById('serviciosMsg');
  const mascotasList = document.getElementById('mascotasList');
  const mascotasUl = document.getElementById('mascotasUl');
  const pedidosList = document.getElementById('pedidosList');

  msg.textContent = '';
  mascotasList.hidden = true;
  pedidosList.hidden = true;
  mascotasUl.innerHTML = '';

  if (!nombre) {
    msg.innerHTML = '<span style="color:#f87171">Escribe el nombre de la mascota.</span>';
    return;
  }

  try {
    const resp = await fetch(`/api/servicios/buscar-mascotas?nombre=${encodeURIComponent(nombre)}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.innerHTML = '<span style="color:#f87171">Error al buscar.</span>';
      return;
    }

    const mascotas = data.data || [];
    if (mascotas.length === 0) {
      msg.innerHTML = '<span style="color:#9ca3af">No se encontraron mascotas con ese nombre.</span>';
      return;
    }

    mascotasUl.innerHTML = '';
    mascotas.forEach((m) => {
      const li = document.createElement('li');
      li.dataset.id = m.id;
      li.innerHTML = `
        <span class="mascota-nombre">${escapeHtml(m.nombre_mascota || 'Sin nombre')}</span>
        <span class="mascota-prop">Propietario: ${escapeHtml(m.nombre_propietario || '-')}</span>
        <span class="mascota-tel mascota-tel-key">Tel: ${escapeHtml(m.telefono_propietario || '-')}</span>
      `;
      li.addEventListener('click', () => seleccionarMascota(m));
      mascotasUl.appendChild(li);
    });
    mascotasList.hidden = false;
    msg.innerHTML = `<span style="color:#34d399">${mascotas.length} mascota(s) encontrada(s). Selecciona una.</span>`;
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al buscar.</span>';
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function seleccionarMascota(mascota) {
  const mascotasList = document.getElementById('mascotasList');
  const pedidosList = document.getElementById('pedidosList');
  const pedidosLegend = document.getElementById('pedidosLegend');
  const serviciosBody = document.getElementById('serviciosBody');
  const sinServicios = document.getElementById('sinServicios');
  const msg = document.getElementById('serviciosMsg');

  mascotasList.hidden = true;
  pedidosList.hidden = false;
  pedidosLegend.textContent = `Servicios realizados — ${mascota.nombre_mascota || 'Mascota'} (${mascota.nombre_propietario || 'Propietario'})`;
  serviciosBody.innerHTML = '';
  sinServicios.hidden = true;
  msg.textContent = '';

  try {
    const resp = await fetch(`/api/servicios/pedidos/${mascota.id}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.innerHTML = '<span style="color:#f87171">Error al cargar servicios.</span>';
      return;
    }

    const pedidos = data.data || [];
    if (pedidos.length === 0) {
      sinServicios.hidden = false;
      sinServicios.textContent = 'No hay servicios registrados para esta mascota.';
      return;
    }

    pedidos.forEach((p) => {
      const tr = document.createElement('tr');
      const fechaHora = p.fecha_hora
        ? new Date(p.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
      tr.innerHTML = `
        <td>${fechaHora}</td>
        <td>${escapeHtml(p.servicio || '-')}</td>
        <td>${escapeHtml(p.groomer1 || '-')}</td>
      `;
      serviciosBody.appendChild(tr);
    });
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al cargar servicios.</span>';
  }
}
