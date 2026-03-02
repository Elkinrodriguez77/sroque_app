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

let currentSource = 'sistema';

function switchSource(source) {
  currentSource = source;
  document.querySelectorAll('.dash-mode').forEach(b => b.classList.toggle('active', b.dataset.source === source));
  document.getElementById('mascotasList').hidden = true;
  document.getElementById('pedidosList').hidden = true;
  document.getElementById('serviciosMsg').textContent = '';
  document.getElementById('nombreMascota').value = '';
  document.getElementById('thGroomer').textContent = source === 'sistema' ? 'Groomer' : '';
  document.getElementById('thGroomer').hidden = source !== 'sistema';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnBuscar').addEventListener('click', buscar);
  document.getElementById('nombreMascota').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscar(); }
  });
  document.querySelectorAll('.dash-mode').forEach(btn => {
    btn.addEventListener('click', () => switchSource(btn.dataset.source));
  });
});

function buscar() {
  if (currentSource === 'sistema') buscarSistema();
  else buscarExcel();
}

// ===== SISTEMA (PostgreSQL) =====
async function buscarSistema() {
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

    mascotas.forEach((m) => {
      const li = document.createElement('li');
      li.dataset.id = m.id;
      li.innerHTML = `
        <span class="mascota-nombre">${esc(m.nombre_mascota || 'Sin nombre')}</span>
        <span class="mascota-prop">Propietario: ${esc(m.nombre_propietario || '-')}</span>
        <span class="mascota-tel mascota-tel-key">Tel: ${esc(m.telefono_propietario || '-')}</span>
      `;
      li.addEventListener('click', () => seleccionarSistema(m));
      mascotasUl.appendChild(li);
    });
    mascotasList.hidden = false;
    msg.innerHTML = `<span style="color:#34d399">${mascotas.length} mascota(s) encontrada(s). Selecciona una.</span>`;
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al buscar.</span>';
  }
}

async function seleccionarSistema(mascota) {
  const pedidosList = document.getElementById('pedidosList');
  const pedidosLegend = document.getElementById('pedidosLegend');
  const serviciosBody = document.getElementById('serviciosBody');
  const sinServicios = document.getElementById('sinServicios');
  const msg = document.getElementById('serviciosMsg');

  document.getElementById('mascotasList').hidden = true;
  pedidosList.hidden = false;
  pedidosLegend.textContent = `Servicios — ${mascota.nombre_mascota || 'Mascota'} (${mascota.nombre_propietario || 'Propietario'})`;
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
      return;
    }

    pedidos.forEach((p) => {
      const tr = document.createElement('tr');
      const fechaHora = p.fecha_hora
        ? new Date(p.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
      tr.innerHTML = `
        <td>${fechaHora}</td>
        <td>${esc(p.servicio || '-')}</td>
        <td>${esc(p.groomer1 || '-')}</td>
      `;
      serviciosBody.appendChild(tr);
    });
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al cargar servicios.</span>';
  }
}

// ===== EXCEL (CSV histórico) =====
async function buscarExcel() {
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
    const resp = await fetch(`/api/historico/buscar-mascotas?nombre=${encodeURIComponent(nombre)}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.innerHTML = '<span style="color:#f87171">Error al buscar.</span>';
      return;
    }

    const mascotas = data.data || [];
    if (mascotas.length === 0) {
      msg.innerHTML = '<span style="color:#9ca3af">No se encontraron mascotas con ese nombre en el histórico.</span>';
      return;
    }

    mascotas.forEach((m) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="mascota-nombre">${esc(m.nombre_mascota)}</span>
        <span class="mascota-prop">Propietario: ${esc(m.nombre_propietario || '-')}</span>
        <span class="mascota-tel mascota-tel-key">Tel: ${esc(m.telefono || '-')}</span>
      `;
      li.addEventListener('click', () => seleccionarExcel(m));
      mascotasUl.appendChild(li);
    });
    mascotasList.hidden = false;
    msg.innerHTML = `<span style="color:#34d399">${mascotas.length} mascota(s) encontrada(s) en histórico. Selecciona una.</span>`;
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al buscar.</span>';
  }
}

async function seleccionarExcel(mascota) {
  const pedidosList = document.getElementById('pedidosList');
  const pedidosLegend = document.getElementById('pedidosLegend');
  const serviciosBody = document.getElementById('serviciosBody');
  const sinServicios = document.getElementById('sinServicios');
  const msg = document.getElementById('serviciosMsg');

  document.getElementById('mascotasList').hidden = true;
  pedidosList.hidden = false;
  pedidosLegend.textContent = `Servicios (histórico) — ${mascota.nombre_mascota} (${mascota.nombre_propietario || '-'})`;
  serviciosBody.innerHTML = '';
  sinServicios.hidden = true;
  msg.textContent = '';

  try {
    const resp = await fetch(`/api/historico/servicios?mascota=${encodeURIComponent(mascota.nombre_mascota)}&telefono=${encodeURIComponent(mascota.telefono)}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      msg.innerHTML = '<span style="color:#f87171">Error al cargar servicios.</span>';
      return;
    }

    const servicios = data.data || [];
    if (servicios.length === 0) {
      sinServicios.hidden = false;
      return;
    }

    servicios.forEach((s) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDateSafe(s.fecha)}</td>
        <td>${esc(s.servicio || '-')}</td>
      `;
      serviciosBody.appendChild(tr);
    });
  } catch {
    msg.innerHTML = '<span style="color:#f87171">Error de red al cargar servicios.</span>';
  }
}

function formatDateSafe(val) {
  if (!val) return '-';
  const s = String(val);
  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const parts = iso.split('-');
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
