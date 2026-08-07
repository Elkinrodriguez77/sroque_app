/**
 * Avisos emergentes (toasts) para confirmar o alertar sobre una acción.
 *
 * Nace de un caso real: al guardar un pedido, si la validación fallaba el único
 * indicio era un texto rojo al final de un formulario muy largo. La usuaria no
 * lo veía, creía que había guardado y reportaba que "el pedido desapareció".
 * Ahora toda acción responde con un aviso visible, tanto si sale bien como si no.
 *
 * Uso:
 *   Toast.exito('Pedido guardado', 'Annie Garces · Superstar');
 *   Toast.error('No se pudo guardar', 'Falta el origen del cliente');
 *   Toast.info('Buscando...');
 */
window.Toast = (function () {
  const DURACION = { exito: 3800, info: 3200, error: 7000 };
  let contenedor = null;

  function getContenedor() {
    if (contenedor && document.body.contains(contenedor)) return contenedor;
    contenedor = document.createElement('div');
    contenedor.className = 'toast-contenedor';
    // El contenedor no debe bloquear clics; cada toast reactiva los suyos.
    contenedor.setAttribute('aria-live', 'polite');
    document.body.appendChild(contenedor);
    return contenedor;
  }

  const ICONOS = {
    exito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16.5h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  function cerrar(toast) {
    if (!toast || toast.dataset.cerrando === '1') return;
    toast.dataset.cerrando = '1';
    toast.classList.add('toast-saliendo');
    // Coincide con la animación de salida del CSS.
    setTimeout(() => toast.remove(), 220);
  }

  function mostrar(titulo, detalle, tipo) {
    const clase = ICONOS[tipo] ? tipo : 'info';
    const cont = getContenedor();

    const toast = document.createElement('div');
    toast.className = `toast toast-${clase}`;
    // Los errores interrumpen al lector de pantalla; los éxitos no.
    toast.setAttribute('role', clase === 'error' ? 'alert' : 'status');

    const icono = document.createElement('span');
    icono.className = 'toast-icono';
    icono.setAttribute('aria-hidden', 'true');
    icono.innerHTML = ICONOS[clase];

    const cuerpo = document.createElement('div');
    cuerpo.className = 'toast-cuerpo';
    const t = document.createElement('p');
    t.className = 'toast-titulo';
    t.textContent = titulo || '';
    cuerpo.appendChild(t);
    if (detalle) {
      const d = document.createElement('p');
      d.className = 'toast-detalle';
      d.textContent = detalle;
      cuerpo.appendChild(d);
    }

    const cerrarBtn = document.createElement('button');
    cerrarBtn.type = 'button';
    cerrarBtn.className = 'toast-cerrar';
    cerrarBtn.setAttribute('aria-label', 'Cerrar aviso');
    cerrarBtn.innerHTML = '&times;';
    cerrarBtn.addEventListener('click', () => cerrar(toast));

    toast.appendChild(icono);
    toast.appendChild(cuerpo);
    toast.appendChild(cerrarBtn);
    cont.appendChild(toast);

    // Más de 3 avisos a la vez satura: se retira el más antiguo.
    while (cont.children.length > 3) cerrar(cont.firstElementChild);

    let temporizador = setTimeout(() => cerrar(toast), DURACION[clase]);
    // Si el usuario pasa el mouse para leerlo, no se cierra encima.
    toast.addEventListener('mouseenter', () => clearTimeout(temporizador));
    toast.addEventListener('mouseleave', () => {
      temporizador = setTimeout(() => cerrar(toast), 1500);
    });

    return toast;
  }

  return {
    mostrar,
    exito: (titulo, detalle) => mostrar(titulo, detalle, 'exito'),
    error: (titulo, detalle) => mostrar(titulo, detalle, 'error'),
    info: (titulo, detalle) => mostrar(titulo, detalle, 'info'),
  };
})();
