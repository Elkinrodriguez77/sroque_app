// Session UI + control de acceso
(async function loadSession() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login.html'; return; }
    const me = await r.json();
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = me.nombre || me.username || '';

    /*
     * Esto solo decide qué se dibuja. El permiso real lo valida el servidor en
     * cada petición: entrar por URL directa no sirve de nada sin autorización.
     */
    if (me.puedeExportar) {
      document.getElementById('expContenido').hidden = false;
      init();
    } else {
      document.getElementById('expDenegado').hidden = false;
    }
  } catch { window.location.href = '/login.html'; }
})();

document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

const fmtNum = new Intl.NumberFormat('es-CO');
const fmtMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** Fecha local en formato YYYY-MM-DD (en-CA da justo ese formato). */
function isoLocal(d) {
  return d.toLocaleDateString('en-CA');
}

function setMsg(texto, tipo) {
  const el = document.getElementById('expMsg');
  const colores = { error: '#f87171', ok: '#34d399', info: '#9ca3af' };
  el.innerHTML = texto ? `<span style="color:${colores[tipo] || colores.info}">${texto}</span>` : '';
}

/** Rellena el rango de fechas según el atajo pulsado. */
function aplicarRango(clave) {
  const hoy = new Date();
  let desde = new Date(hoy);
  let hasta = new Date(hoy);

  if (clave === 'hoy') { /* ambos hoy */ }
  else if (clave === '7') desde.setDate(hoy.getDate() - 6);
  else if (clave === 'mes') desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  else if (clave === 'mes-pasado') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0); // último día del mes anterior
  } else if (clave === 'anio') desde = new Date(hoy.getFullYear(), 0, 1);
  else if (clave === 'todo') desde = new Date(2020, 0, 1);

  document.getElementById('expDesde').value = isoLocal(desde);
  document.getElementById('expHasta').value = isoLocal(hasta);
  consultar();
}

function paramsActuales() {
  const desde = document.getElementById('expDesde').value;
  const hasta = document.getElementById('expHasta').value;
  const porFecha = document.getElementById('expPorFecha').value;
  return { desde, hasta, porFecha };
}

async function consultar() {
  const { desde, hasta, porFecha } = paramsActuales();
  const resultado = document.getElementById('expResultado');

  if (!desde || !hasta) { setMsg('Selecciona ambas fechas.', 'error'); return; }
  if (desde > hasta) { setMsg('"Desde" no puede ser mayor que "Hasta".', 'error'); return; }

  setMsg('Consultando...', 'info');
  try {
    const resp = await fetch(`/api/exportar/resumen?desde=${desde}&hasta=${hasta}&porFecha=${porFecha}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      setMsg((body?.errors?.join(', ')) || 'Error al consultar.', 'error');
      resultado.hidden = true;
      return;
    }

    const d = body.data;
    document.getElementById('expNumPedidos').textContent = fmtNum.format(d.pedidos);
    document.getElementById('expNumAbiertos').textContent = fmtNum.format(d.pedidos_abiertos);
    document.getElementById('expTotalCerrados').textContent = fmtMoneda.format(Number(d.total_cerrados || 0));
    document.getElementById('expNumEliminados').textContent = fmtNum.format(d.eliminados);

    resultado.hidden = false;
    const total = d.pedidos + d.eliminados;
    setMsg(total === 0
      ? 'No hay datos en ese rango.'
      : `${fmtNum.format(total)} registro(s) disponibles para descargar.`,
      total === 0 ? 'info' : 'ok');
  } catch {
    setMsg('Error de red al consultar.', 'error');
    resultado.hidden = true;
  }
}

/**
 * Descarga el archivo. Se pide con fetch (no con un enlace directo) para poder
 * mostrar el error real si el servidor rechaza, en vez de dejar al usuario con
 * una pestaña en blanco.
 */
async function descargar(boton) {
  const conjunto = boton.getAttribute('data-conjunto');
  const formato = boton.getAttribute('data-formato');
  const { desde, hasta, porFecha } = paramsActuales();
  if (!desde || !hasta) { setMsg('Selecciona ambas fechas.', 'error'); return; }

  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Generando...';

  try {
    const url = `/api/exportar/${conjunto}?desde=${desde}&hasta=${hasta}&porFecha=${porFecha}&formato=${formato}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const detalle = (body?.errors?.join(', ')) || `El servidor respondió ${resp.status}.`;
      window.Toast?.error('No se pudo generar el archivo', detalle);
      setMsg(detalle, 'error');
      return;
    }

    const blob = await resp.blob();
    // El nombre real lo define el servidor en Content-Disposition.
    const cd = resp.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const nombre = m ? m[1] : `${conjunto}.${formato === 'excel' ? 'xlsx' : 'csv'}`;

    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);

    window.Toast?.exito('Archivo descargado', nombre);
  } catch {
    window.Toast?.error('No se pudo descargar', 'Error de red al generar el archivo.');
    setMsg('Error de red al descargar.', 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

function init() {
  // Arranca mostrando el mes en curso.
  const hoy = new Date();
  document.getElementById('expDesde').value = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  document.getElementById('expHasta').value = isoLocal(hoy);

  document.getElementById('expBtnConsultar').addEventListener('click', consultar);
  document.getElementById('expPorFecha').addEventListener('change', consultar);
  document.querySelectorAll('.exp-atajo').forEach((b) => {
    b.addEventListener('click', () => aplicarRango(b.getAttribute('data-rango')));
  });
  document.querySelectorAll('.exp-btn').forEach((b) => {
    b.addEventListener('click', () => descargar(b));
  });

  consultar();
}
