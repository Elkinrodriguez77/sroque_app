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
    window.location.href = '/';
  } catch {
    errEl.textContent = 'Error de red. Intente de nuevo.';
  }
});
