// Session UI
(async function loadSession() {
  try {
    const r = await fetch('/api/me');
    if (!r.ok) { window.location.href = '/login.html'; return; }
    const me = await r.json();
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = me.nombre || me.username || '';
  } catch { window.location.href = '/login.html'; }
})();

document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

const fmtNum = new Intl.NumberFormat('es-CO');

/** Última respuesta del servidor: el CSV y el texto para pegar salen de aquí sin volver a consultar. */
let datos = null;

function setMsg(texto, tipo) {
  const el = document.getElementById('bdcMsg');
  const colores = { error: '#f87171', ok: '#34d399', info: '#9ca3af' };
  el.innerHTML = texto ? `<span style="color:${colores[tipo] || colores.info}">${texto}</span>` : '';
}

async function consultar() {
  const boton = document.getElementById('bdcBtnActualizar');
  boton.disabled = true;
  setMsg('Consultando...', 'info');
  try {
    const resp = await fetch('/api/bd-clientes');
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      setMsg((body?.errors?.join(', ')) || 'Error al consultar.', 'error');
      document.getElementById('bdcResultado').hidden = true;
      return;
    }

    datos = body.data;
    const iEstado = datos.columnas.indexOf('Estado');
    const riesgo = datos.filas.filter((f) => f[iEstado] === 'En riesgo').length;

    document.getElementById('bdcCorte').textContent = datos.fechaCorte || '—';
    document.getElementById('bdcTotal').textContent = fmtNum.format(datos.filas.length);
    document.getElementById('bdcRiesgo').textContent = fmtNum.format(riesgo);
    document.getElementById('bdcPerdidos').textContent = fmtNum.format(datos.filas.length - riesgo);
    document.getElementById('bdcResultado').hidden = false;
    setMsg(datos.filas.length
      ? `${fmtNum.format(datos.filas.length)} cliente(s) listos para descargar.`
      : 'No hay clientes en riesgo ni perdidos.', datos.filas.length ? 'ok' : 'info');
  } catch {
    setMsg('Error de red al consultar.', 'error');
    document.getElementById('bdcResultado').hidden = true;
  } finally {
    boton.disabled = false;
  }
}

/** Escapa un valor para CSV con separador coma (el que Sheets detecta sin preguntar). */
function celdaCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Para pegar: las tabulaciones separan columnas, así que no pueden ir dentro de un valor. */
function celdaTsv(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[\t\r\n]+/g, ' ');
}

function descargarCsv() {
  if (!datos) return;
  const lineas = [datos.columnas, ...datos.filas].map((f) => f.map(celdaCsv).join(','));
  const blob = new Blob([lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const nombre = `BD_Clientes_${datos.fechaCorte || 'sin_corte'}.csv`;

  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
  window.Toast?.exito('Archivo descargado', nombre);
}

async function copiar() {
  if (!datos) return;
  const texto = datos.filas.map((f) => f.map(celdaTsv).join('\t')).join('\n');
  try {
    await navigator.clipboard.writeText(texto);
    window.Toast?.exito('Datos copiados', `${fmtNum.format(datos.filas.length)} fila(s). Pégalos en la celda A2 de BD_Clientes.`);
  } catch {
    window.Toast?.error('No se pudo copiar', 'El navegador bloqueó el portapapeles. Usa "Descargar CSV".');
  }
}

document.getElementById('bdcBtnActualizar').addEventListener('click', consultar);
document.getElementById('bdcBtnCsv').addEventListener('click', descargarCsv);
document.getElementById('bdcBtnCopiar').addEventListener('click', copiar);
consultar();
