// Toggle mostrar/ocultar contraseña
document.getElementById('togglePw').addEventListener('click', () => {
  const input = document.getElementById('passwordInput');
  const eyeOn = document.getElementById('eyeIcon');
  const eyeOff = document.getElementById('eyeOffIcon');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  eyeOn.style.display = visible ? '' : 'none';
  eyeOff.style.display = visible ? 'none' : '';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginErrors');
  errEl.textContent = '';
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      errEl.textContent = (body.errors && body.errors.join(', ')) || 'Error al iniciar sesión';
      return;
    }
    // Contraseña caducada u obligada a cambiar: va directo a definir una nueva.
    if (body.mustChangePassword) {
      window.location.href = '/cambiar-password.html';
      return;
    }
    // Si la sesión se cayó estando en otra pantalla, se regresa a ella.
    const volver = new URLSearchParams(window.location.search).get('volver');
    const destinoSeguro = volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : '/';
    window.location.href = destinoSeguro;
  } catch {
    errEl.textContent = 'Error de red. Intente de nuevo.';
  }
});
