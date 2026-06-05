/**
 * Utilidad compartida para buscar por nombre de mascota y resolver un teléfono.
 * Se usa en Clientes (index) y Pedidos. El campo es "inteligente":
 *   - solo dígitos  -> es teléfono (flujo actual por teléfono)
 *   - tiene letras  -> es nombre de mascota (busca y deja elegir)
 *
 * Expone window.BuscarMascota = { esTelefono, buscarPorNombre, render }.
 */
window.BuscarMascota = (function () {
  /** ¿La consulta es un teléfono? (solo dígitos, ignorando espacios/guiones) */
  function esTelefono(q) {
    const limpio = String(q || '').replace(/[\s\-()]/g, '');
    return limpio.length > 0 && /^\d+$/.test(limpio);
  }

  async function buscarPorNombre(nombre) {
    const resp = await fetch(`/api/buscar/mascotas-telefono?nombre=${encodeURIComponent(nombre)}`);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      throw new Error((body && body.errors && body.errors.join(', ')) || 'Error al buscar');
    }
    return body;
  }

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : s;
    return div.innerHTML;
  }

  /**
   * Pinta los resultados en `container` (un <ul>). Al hacer clic en uno llama
   * a onPick(telefono, item). Devuelve la cantidad mostrada.
   */
  function render(container, body, onPick) {
    container.innerHTML = '';
    container.hidden = false;
    const data = (body && body.data) || [];

    if (data.length === 0) {
      const li = document.createElement('li');
      li.className = 'bm-empty';
      li.textContent = 'No se encontró ninguna mascota con teléfono para ese nombre.';
      container.appendChild(li);
      return 0;
    }

    data.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'bm-item';
      const cls = m.origen === 'Sistema' ? 'bm-badge-sistema'
        : (m.origen === 'Ambos' ? 'bm-badge-ambos' : 'bm-badge-historico');
      li.innerHTML = `
        <div class="bm-info">
          <span class="bm-nombre">${esc(m.nombre_mascota)}</span>
          <span class="bm-prop">${esc(m.nombre_propietario || 'Sin propietario')}</span>
        </div>
        <div class="bm-right">
          <span class="bm-origen ${cls}">${esc(m.origen)}</span>
          <span class="bm-tel">${esc(m.telefono)}</span>
        </div>
      `;
      li.addEventListener('click', () => onPick(m.telefono, m));
      container.appendChild(li);
    });

    if (body.truncated) {
      const li = document.createElement('li');
      li.className = 'bm-more';
      li.textContent = `Mostrando ${data.length} de ${body.total}. Escribe más letras para refinar.`;
      container.appendChild(li);
    }
    return data.length;
  }

  return { esTelefono, buscarPorNombre, render };
})();
