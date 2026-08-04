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

const fmtMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const queryEl = document.getElementById('hvQuery');
const msgEl = document.getElementById('hvMsg');
const resultadosEl = document.getElementById('hvResultados');
const resultadosGrid = document.getElementById('hvResultadosGrid');
const fichaEl = document.getElementById('hvFicha');

let ultimosResultados = [];

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : s;
  return div.innerHTML;
}

function money(v) {
  if (v == null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? fmtMoneda.format(n) : '-';
}

function fechaCorta(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fechaHora(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Fecha suelta tipo DATE (sin hora): evita el corrimiento por zona horaria. */
function fechaSolaCorta(v) {
  if (!v) return '-';
  const iso = String(v).slice(0, 10);
  const p = iso.split('-');
  if (p.length !== 3) return fechaCorta(v);
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function setMsg(texto, tipo) {
  const colores = { error: '#f87171', ok: '#34d399', info: '#9ca3af' };
  msgEl.innerHTML = texto ? `<span style="color:${colores[tipo] || colores.info}">${esc(texto)}</span>` : '';
}

// ===== Búsqueda =====
async function buscar() {
  const q = queryEl.value.trim();
  resultadosEl.hidden = true;
  fichaEl.hidden = true;
  resultadosGrid.innerHTML = '';
  setMsg('');

  if (q.length < 2) {
    setMsg('Escribe al menos 2 caracteres (teléfono o nombre de la mascota).', 'error');
    return;
  }

  setMsg('Buscando...', 'info');
  try {
    const resp = await fetch(`/api/hoja-vida/buscar?q=${encodeURIComponent(q)}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      setMsg((body?.errors?.join(', ')) || 'Error al buscar.', 'error');
      return;
    }

    ultimosResultados = body.data || [];
    if (ultimosResultados.length === 0) {
      setMsg(
        body.modo === 'telefono'
          ? 'No hay mascotas registradas para ese teléfono.'
          : 'No se encontró ninguna mascota con ese nombre.',
        'error'
      );
      return;
    }

    // Con un solo resultado, abrimos la ficha directo: es lo que el usuario quería.
    if (ultimosResultados.length === 1) {
      setMsg('');
      await abrirFicha(ultimosResultados[0].id);
      return;
    }

    renderResultados(ultimosResultados);
    setMsg(`${ultimosResultados.length} mascota(s) encontrada(s).`, 'ok');
  } catch {
    setMsg('Error de red al buscar.', 'error');
  }
}

function renderResultados(items) {
  resultadosGrid.innerHTML = '';
  for (const m of items) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `hv-res-card hv-sem-${m.semaforo?.nivel || 'sin-datos'}`;
    const dias = m.dias_sin_venir;
    const diasTexto = dias == null ? 'Sin visitas' : (dias === 0 ? 'Vino hoy' : `${dias} día${dias === 1 ? '' : 's'}`);
    card.innerHTML = `
      <span class="hv-res-dot" aria-hidden="true"></span>
      <span class="hv-res-body">
        <span class="hv-res-nombre">${esc(m.nombre_mascota || 'Sin nombre')}</span>
        <span class="hv-res-meta">${esc(m.raza || m.tipo_mascota || 'Sin raza')} · ${esc(m.nombre_propietario || 'Sin propietario')}</span>
        <span class="hv-res-meta hv-res-tel">Tel: ${esc(m.telefono_propietario || '-')}</span>
      </span>
      <span class="hv-res-right">
        <span class="hv-res-dias">${esc(diasTexto)}</span>
        <span class="hv-res-servicios">${m.total_servicios} servicio${Number(m.total_servicios) === 1 ? '' : 's'}</span>
      </span>
    `;
    card.addEventListener('click', () => abrirFicha(m.id));
    resultadosGrid.appendChild(card);
  }
  resultadosEl.hidden = false;
}

// ===== Ficha =====
async function abrirFicha(mascotaId) {
  setMsg('Cargando hoja de vida...', 'info');
  try {
    const resp = await fetch(`/api/hoja-vida/${mascotaId}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      setMsg((body?.errors?.join(', ')) || 'No se pudo cargar la hoja de vida.', 'error');
      return;
    }
    setMsg('');
    renderFicha(body.data);
    resultadosEl.hidden = true;
    fichaEl.hidden = false;
    fichaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    setMsg('Error de red al cargar la hoja de vida.', 'error');
  }
}

function renderFicha(d) {
  const { mascota, cliente, gestion, estadisticas, servicios } = d;

  // --- Identidad ---
  document.getElementById('hvNombre').textContent = mascota.nombre_mascota || 'Sin nombre';

  const propietario = cliente?.nombre_propietario || 'Propietario no registrado';
  document.getElementById('hvSubtitulo').textContent =
    `${mascota.tipo_mascota || 'Mascota'} · ${mascota.raza || 'Raza sin registrar'} · Familia de ${propietario}`;

  const tipoBadge = document.getElementById('hvTipoBadge');
  if (gestion.tipo_cliente) {
    tipoBadge.hidden = false;
    tipoBadge.textContent = gestion.tipo_cliente;
    tipoBadge.className = `tc-badge tc-badge-${String(gestion.tipo_cliente).toLowerCase()}`;
  } else {
    tipoBadge.hidden = true;
  }

  // Chips de rasgos rápidos
  const chips = [];
  if (mascota.edad) chips.push({ t: mascota.edad, c: '' });
  if (mascota.tamano) chips.push({ t: mascota.tamano, c: '' });
  if (mascota.pelaje) chips.push({ t: `Manto ${mascota.pelaje.toLowerCase()}`, c: '' });
  if (mascota.alergias === true) chips.push({ t: '⚠ Con alergias', c: 'hv-chip-alerta' });
  if (gestion.origen_cliente) chips.push({ t: `Llegó por ${gestion.origen_cliente}`, c: 'hv-chip-soft' });
  document.getElementById('hvChips').innerHTML = chips
    .map((c) => `<span class="hv-chip ${c.c}">${esc(c.t)}</span>`).join('');

  // --- Semáforo ---
  const sem = gestion.semaforo || {};
  const semEl = document.getElementById('hvSemaforo');
  semEl.className = `hv-semaforo hv-sem-${sem.nivel || 'sin-datos'}`;
  const dias = gestion.dias_sin_venir;
  document.getElementById('hvSemaforoDias').textContent =
    dias == null ? '—' : (dias === 0 ? 'Vino hoy' : `${dias} día${dias === 1 ? '' : 's'} sin venir`);
  document.getElementById('hvSemaforoEtiqueta').textContent = sem.etiqueta || '';
  document.getElementById('hvSemaforoAccion').textContent = sem.accion || '';

  // --- KPIs ---
  const kpis = [
    { label: 'Servicios totales', valor: estadisticas.total_servicios, sub: '' },
    { label: 'Ticket promedio', valor: money(estadisticas.ticket_promedio), sub: '' },
    { label: 'Total facturado', valor: money(estadisticas.total_gastado), sub: '' },
    {
      label: 'Viene cada',
      valor: estadisticas.frecuencia_dias != null ? `${estadisticas.frecuencia_dias} días` : '—',
      sub: estadisticas.frecuencia_dias != null ? 'promedio histórico' : 'necesita 2+ visitas',
    },
    {
      label: 'Servicio favorito',
      valor: estadisticas.servicio_favorito?.valor || '—',
      sub: estadisticas.servicio_favorito ? `${estadisticas.servicio_favorito.veces} veces` : '',
    },
    {
      label: 'Groomer de confianza',
      valor: estadisticas.groomer_favorito?.valor || '—',
      sub: estadisticas.groomer_favorito ? `${estadisticas.groomer_favorito.veces} servicios` : '',
    },
  ];
  document.getElementById('hvKpis').innerHTML = kpis.map((k) => `
    <div class="hv-kpi">
      <span class="hv-kpi-label">${esc(k.label)}</span>
      <span class="hv-kpi-valor">${esc(k.valor)}</span>
      ${k.sub ? `<span class="hv-kpi-sub">${esc(k.sub)}</span>` : ''}
    </div>
  `).join('');

  // --- Último servicio ---
  document.getElementById('hvUltimo').innerHTML = gestion.ultima_visita ? dl([
    ['Fecha', fechaHora(gestion.ultima_visita)],
    ['Servicio', gestion.ultimo_servicio],
    ['Groomer', gestion.ultimo_groomer],
    ['Piso', gestion.ultimo_piso],
    ['Valor', money(gestion.ultimo_valor)],
    ['Primera visita', fechaCorta(estadisticas.primera_visita)],
  ]) : '<p class="hv-vacio">Sin servicios registrados todavía.</p>';

  // --- Contacto ---
  document.getElementById('hvContacto').innerHTML = dl([
    ['Propietario', cliente?.nombre_propietario],
    ['Teléfono', mascota.telefono_propietario],
    ['Acudiente', cliente?.nombre_acudiente],
    ['Tel. acudiente', cliente?.telefono_acudiente],
    ['Email', cliente?.email],
    ['Instagram', cliente?.perfil_instagram],
    ['Dirección', cliente?.direccion],
  ]);
  renderAccionesContacto(mascota, cliente);

  // --- Cuidados ---
  renderCuidados(mascota);

  // --- Perfil ---
  document.getElementById('hvPerfil').innerHTML = dl([
    ['Tipo', mascota.tipo_mascota],
    ['Raza', mascota.raza],
    ['Tamaño', mascota.tamano],
    ['Pelaje', mascota.pelaje],
    ['Nacimiento', fechaSolaCorta(mascota.fecha_nacimiento)],
    ['Edad', mascota.edad],
  ]);

  renderHistorial(servicios);
}

/** Construye las filas de una lista de definición, ocultando lo que no tiene dato. */
function dl(pares) {
  const filas = pares
    .filter(([, v]) => v != null && v !== '' && v !== '-')
    .map(([k, v]) => `<div class="hv-dl-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`);
  return filas.length ? filas.join('') : '<p class="hv-vacio">Sin información registrada.</p>';
}

function renderAccionesContacto(mascota, cliente) {
  const cont = document.getElementById('hvContactoAcciones');
  cont.innerHTML = '';
  const tel = String(mascota.telefono_propietario || '').replace(/[\s\-()]/g, '');
  if (!tel) return;

  // WhatsApp con mensaje listo para gestionar el regreso de la mascota.
  const nombre = mascota.nombre_mascota || 'tu peludito';
  const saludo = cliente?.nombre_propietario ? `Hola ${cliente.nombre_propietario}` : 'Hola';
  const texto = `${saludo}! Te saludamos de Spa San Roque 🐾 ¿Cómo está ${nombre}? Queremos agendar su próximo baño.`;
  const waTel = tel.length === 10 ? `57${tel}` : tel;

  const wa = document.createElement('a');
  wa.className = 'hv-accion hv-accion-wa';
  wa.href = `https://wa.me/${waTel}?text=${encodeURIComponent(texto)}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.textContent = 'Escribir por WhatsApp';
  cont.appendChild(wa);

  const llamar = document.createElement('a');
  llamar.className = 'hv-accion';
  llamar.href = `tel:${tel}`;
  llamar.textContent = 'Llamar';
  cont.appendChild(llamar);

  const copiar = document.createElement('button');
  copiar.type = 'button';
  copiar.className = 'hv-accion';
  copiar.textContent = 'Copiar teléfono';
  copiar.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(tel);
      ok = true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tel;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(ta);
    }
    copiar.textContent = ok ? '✓ Copiado' : 'Error';
    setTimeout(() => { copiar.textContent = 'Copiar teléfono'; }, 1500);
  });
  cont.appendChild(copiar);
}

function renderCuidados(m) {
  const cont = document.getElementById('hvCuidados');
  const bloques = [];

  if (m.alergias === true) {
    bloques.push(`
      <div class="hv-alerta hv-alerta-roja">
        <strong>⚠ Mascota con alergias</strong>
        <p>Confirmar productos hipoalergénicos antes del baño.</p>
      </div>`);
  } else if (m.alergias === false) {
    bloques.push('<div class="hv-nota-ok">✓ Sin alergias reportadas</div>');
  }

  if (m.observaciones) {
    bloques.push(`
      <div class="hv-obs">
        <span class="hv-obs-label">Observaciones del cuidado</span>
        <p>${esc(m.observaciones)}</p>
      </div>`);
  }

  const filas = [];
  if (m.alimento_mascota) filas.push(['Alimento', m.alimento_mascota]);
  if (m.producto_antipulgas || m.fecha_antipulgas) {
    filas.push(['Antipulgas', `${m.producto_antipulgas || 'Aplicado'}${m.fecha_antipulgas ? ` · ${fechaSolaCorta(m.fecha_antipulgas)}` : ''}`]);
  }
  if (m.producto_antiparasitario || m.fecha_antiparasitario) {
    filas.push(['Antiparasitario', `${m.producto_antiparasitario || 'Aplicado'}${m.fecha_antiparasitario ? ` · ${fechaSolaCorta(m.fecha_antiparasitario)}` : ''}`]);
  }
  if (filas.length) bloques.push(`<dl class="hv-dl">${dl(filas)}</dl>`);

  cont.innerHTML = bloques.length
    ? bloques.join('')
    : '<p class="hv-vacio">Aún no hay recomendaciones de cuidado registradas para esta mascota. Se cargan desde el módulo de Clientes.</p>';
}

function renderHistorial(servicios) {
  const body = document.getElementById('hvHistorialBody');
  const vacio = document.getElementById('hvSinHistorial');
  const count = document.getElementById('hvHistorialCount');
  body.innerHTML = '';

  count.textContent = servicios.length ? `(${servicios.length})` : '';

  if (!servicios.length) {
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  for (const s of servicios) {
    const tr = document.createElement('tr');
    const groomers = [s.groomer1, s.groomer2].filter(Boolean).join(', ');
    const pago = s.metodo_pago === 'Mixto' ? 'Mixto' : (s.metodo_pago || '-');
    tr.innerHTML = `
      <td>${esc(fechaHora(s.fecha_hora))}</td>
      <td>${esc(s.servicio || '-')}</td>
      <td>${esc(groomers || '-')}</td>
      <td>${esc(s.piso || '-')}</td>
      <td>${esc(pago)}</td>
      <td><strong>${esc(money(s.precio_final))}</strong></td>
    `;
    body.appendChild(tr);
  }
}

// ===== Eventos =====
document.getElementById('hvBtnBuscar').addEventListener('click', buscar);
queryEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); buscar(); }
});
document.getElementById('hvBtnVolver').addEventListener('click', () => {
  fichaEl.hidden = true;
  if (ultimosResultados.length > 1) {
    renderResultados(ultimosResultados);
  } else {
    queryEl.focus();
  }
});
