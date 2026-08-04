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

const fmtMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** Formatea un valor monetario; devuelve '-' si no hay dato. */
function money(v) {
  if (v == null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? fmtMoneda.format(n) : '-';
}

/** Agrega a un <li> de resultado un botón para copiar el teléfono al portapapeles. */
function addCopyTelBtn(li, telefono) {
  const tel = String(telefono || '').trim();
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-copy-tel';
  if (!tel) {
    btn.textContent = 'Sin teléfono';
    btn.disabled = true;
    li.appendChild(btn);
    return;
  }
  btn.textContent = '📋 Copiar';
  btn.title = `Copiar teléfono ${tel}`;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation(); // no seleccionar la mascota al copiar
    let ok = false;
    try {
      await navigator.clipboard.writeText(tel);
      ok = true;
    } catch {
      // Fallback para navegadores/contextos sin Clipboard API
      const ta = document.createElement('textarea');
      ta.value = tel;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(ta);
    }
    btn.textContent = ok ? '✓ Copiado' : 'Error';
    btn.classList.toggle('copied', ok);
    setTimeout(() => { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 1500);
  });
  li.appendChild(btn);
}

/** Agrega una fila de servicio a la tabla (columnas comunes a Sistema y Excel). */
function appendServicioRow(body, { fecha, servicio, precio, adicionales, precioFinal, groomer }) {
  const tr = document.createElement('tr');
  const tieneAdic = adicionales != null && adicionales !== '';
  const adicNum = Number(adicionales || 0);
  const adicClass = tieneAdic ? (adicNum < 0 ? 'txt-red' : 'txt-green') : '';
  tr.innerHTML = `
    <td>${fecha}</td>
    <td>${esc(servicio || '-')}</td>
    <td>${money(precio)}</td>
    <td class="${adicClass}">${money(adicionales)}</td>
    <td><strong>${money(precioFinal)}</strong></td>
    <td>${esc(groomer || '-')}</td>
  `;
  body.appendChild(tr);
}

function switchSource(source) {
  currentSource = source;
  document.querySelectorAll('.dash-mode').forEach(b => b.classList.toggle('active', b.dataset.source === source));
  document.getElementById('mascotasList').hidden = true;
  document.getElementById('pedidosList').hidden = true;
  document.getElementById('serviciosMsg').textContent = '';
  document.getElementById('nombreMascota').value = '';
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
      addCopyTelBtn(li, m.telefono_propietario);
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
      const fechaHora = p.fecha_hora
        ? new Date(p.fecha_hora).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
      appendServicioRow(serviciosBody, {
        fecha: fechaHora,
        servicio: p.servicio,
        precio: p.precio,
        adicionales: p.adicionales_descuentos,
        precioFinal: p.precio_final,
        groomer: p.groomer1,
      });
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
      addCopyTelBtn(li, m.telefono);
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
      appendServicioRow(serviciosBody, {
        fecha: formatDateSafe(s.fecha),
        servicio: s.servicio,
        precio: s.precio,
        adicionales: s.adicionales,
        precioFinal: s.precio_final,
        groomer: s.groomer,
      });
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
