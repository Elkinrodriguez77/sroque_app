/**
 * Detecta la sesión caída en cualquier pantalla.
 *
 * Antes, si la sesión expiraba, cada módulo se limitaba a imprimir el texto
 * crudo del servidor ("No autenticado") junto al botón y ahí quedaba el usuario:
 * con el formulario lleno, sin saber qué pasó ni qué hacer, y creyendo a veces
 * que el registro sí había quedado.
 *
 * Este script envuelve fetch() una sola vez y, ante un 401 de la API, avisa con
 * claridad y lleva al login recordando en qué pantalla estaba.
 *
 * Debe cargarse ANTES que el script propio de cada página.
 */
(function () {
  const fetchOriginal = window.fetch.bind(window);
  let yaManejado = false;

  function urlDe(entrada) {
    if (typeof entrada === 'string') return entrada;
    if (entrada instanceof Request) return entrada.url;
    return String((entrada && entrada.url) || '');
  }

  function irALogin() {
    // Al volver a entrar, se regresa a la pantalla donde estaba trabajando.
    const destino = window.location.pathname + window.location.search;
    window.location.href = `/login.html?volver=${encodeURIComponent(destino)}`;
  }

  function sesionCaida() {
    if (yaManejado) return;
    yaManejado = true;

    const titulo = 'Tu sesión expiró';
    const detalle = 'Vuelve a iniciar sesión. Lo que estabas registrando NO se guardó: tendrás que ingresarlo de nuevo.';

    if (window.Toast) {
      window.Toast.error(titulo, detalle);
      // Da tiempo a leer el aviso antes de cambiar de página.
      setTimeout(irALogin, 2600);
    } else {
      window.alert(`${titulo}. ${detalle}`);
      irALogin();
    }
  }

  window.fetch = async function (entrada, opciones) {
    const respuesta = await fetchOriginal(entrada, opciones);
    try {
      const url = urlDe(entrada);
      const esApi = url.includes('/api/');
      // /api/login responde 401 con credenciales malas: eso lo maneja el login.
      const esLogin = url.includes('/api/login');
      // /api/me es la comprobación de arranque; cada página ya redirige sola.
      const esMe = url.includes('/api/me');
      if (respuesta.status === 401 && esApi && !esLogin && !esMe) {
        sesionCaida();
      }
    } catch { /* nunca romper la petición por culpa del aviso */ }
    return respuesta;
  };
})();
