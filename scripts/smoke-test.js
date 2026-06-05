/**
 * Smoke test de arranque (sin base de datos).
 *
 * Levanta el servidor en un proceso aparte y verifica que responde.
 * No toca PostgreSQL: la app arranca y sirve /login.html sin conexión a BD
 * (el Pool de pg conecta de forma perezosa, solo al primer query real).
 *
 * Sirve para que CI detecte: errores de sintaxis, módulos que no cargan,
 * el CSV histórico que no parsea, o el servidor que no logra escuchar el puerto.
 *
 * Uso: node scripts/smoke-test.js
 * Sale con código 0 si todo OK, 1 si algo falla.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.SMOKE_PORT || '3100';
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'src', 'server.js');
const TIMEOUT_MS = 20000;

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume(); // descartar body
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('request timeout')));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Arranca el servidor en un puerto propio para no chocar con nada.
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  child.stdout.on('data', (d) => { serverLog += d.toString(); });
  child.stderr.on('data', (d) => { serverLog += d.toString(); });

  let exitedEarly = null;
  child.on('exit', (code) => { exitedEarly = code; });

  const deadline = Date.now() + TIMEOUT_MS;
  let ok = false;
  let lastErr = null;

  while (Date.now() < deadline) {
    if (exitedEarly !== null) {
      console.error(`✗ El servidor terminó antes de tiempo (código ${exitedEarly}).`);
      console.error('--- salida del servidor ---\n' + serverLog);
      process.exit(1);
    }
    try {
      const code = await get(`${BASE}/login.html`);
      if (code === 200) { ok = true; break; }
      lastErr = `HTTP ${code} en /login.html (se esperaba 200)`;
    } catch (e) {
      lastErr = e.message;
    }
    await sleep(500);
  }

  // Comprobación extra: una ruta protegida sin sesión debe responder 401.
  let authOk = false;
  if (ok) {
    try {
      const code = await get(`${BASE}/api/me`);
      authOk = code === 401;
      if (!authOk) lastErr = `HTTP ${code} en /api/me (se esperaba 401)`;
    } catch (e) {
      lastErr = e.message;
    }
  }

  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');

  if (ok && authOk) {
    console.log('✓ Smoke test OK: el servidor arranca y responde (login 200, /api/me 401).');
    process.exit(0);
  }

  console.error(`✗ Smoke test falló: ${lastErr || 'el servidor no respondió a tiempo'}`);
  console.error('--- salida del servidor ---\n' + serverLog);
  process.exit(1);
}

main().catch((e) => {
  console.error('✗ Error inesperado en smoke test:', e);
  process.exit(1);
});
