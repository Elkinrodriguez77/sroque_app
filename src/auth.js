const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const BCRYPT_ROUNDS = 12;

/** Días de vigencia de una contraseña antes de exigir cambio (rol 'user'). */
const PASSWORD_MAX_DIAS = Number(process.env.PASSWORD_MAX_DIAS || 90);
/** Días antes de la caducidad en que se empieza a avisar en la interfaz. */
const PASSWORD_AVISO_DIAS = Number(process.env.PASSWORD_AVISO_DIAS || 10);
/** Rol exento de caducidad y con acceso a todo. */
const ROL_OWNER = 'owner';
const PASSWORD_MIN_LEN = 10;

function safeSchema() {
  const schema = (process.env.PGSCHEMA || 'prod').toString();
  if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(schema)) throw new Error('Nombre de esquema inválido');
  return schema;
}

async function findUserByUsername(username) {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `SELECT id, username, password_hash, nombre, activo,
            COALESCE(rol, 'user') AS rol,
            password_changed_at, password_expires_at,
            COALESCE(must_change_password, false) AS must_change_password
     FROM ${schema}.usuarios WHERE username = $1 LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Estado de la contraseña de un usuario.
 * Las cuentas 'owner' nunca caducan; el resto caduca en password_expires_at.
 * @returns {{debeCambiar: boolean, motivo: string|null, diasRestantes: number|null, porCaducar: boolean}}
 */
function estadoPassword(user) {
  if (!user) return { debeCambiar: false, motivo: null, diasRestantes: null, porCaducar: false };

  if (user.must_change_password) {
    return {
      debeCambiar: true,
      motivo: 'Debes definir una contraseña nueva antes de continuar.',
      diasRestantes: 0,
      porCaducar: true,
    };
  }

  // El dueño no rota contraseña: es la cuenta de respaldo permanente.
  if (user.rol === ROL_OWNER || !user.password_expires_at) {
    return { debeCambiar: false, motivo: null, diasRestantes: null, porCaducar: false };
  }

  const vence = new Date(user.password_expires_at).getTime();
  if (!Number.isFinite(vence)) {
    return { debeCambiar: false, motivo: null, diasRestantes: null, porCaducar: false };
  }

  const diasRestantes = Math.ceil((vence - Date.now()) / 86400000);
  if (diasRestantes <= 0) {
    return {
      debeCambiar: true,
      motivo: 'Tu contraseña caducó. Define una nueva para seguir usando la aplicación.',
      diasRestantes: 0,
      porCaducar: true,
    };
  }
  return {
    debeCambiar: false,
    motivo: null,
    diasRestantes,
    porCaducar: diasRestantes <= PASSWORD_AVISO_DIAS,
  };
}

/**
 * Reglas mínimas de contraseña. Se buscó un equilibrio: suficientemente fuerte
 * para que no se repitan claves triviales, sin forzar símbolos que el equipo
 * termine anotando en papel.
 * @returns {string[]} lista de errores (vacía si es válida)
 */
function validarPassword(plain, username) {
  const errors = [];
  const pw = String(plain || '');
  if (pw.length < PASSWORD_MIN_LEN) {
    errors.push(`La contraseña debe tener al menos ${PASSWORD_MIN_LEN} caracteres`);
  }
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(pw)) errors.push('La contraseña debe incluir al menos una letra');
  if (!/\d/.test(pw)) errors.push('La contraseña debe incluir al menos un número');
  if (username && pw.toLowerCase().includes(String(username).toLowerCase())) {
    errors.push('La contraseña no puede contener el nombre de usuario');
  }
  const comunes = ['12345678', 'password', 'contrasena', 'sanroque', 'qwerty', 'admin123'];
  if (comunes.some((c) => pw.toLowerCase().includes(c))) {
    errors.push('La contraseña es demasiado predecible, elige otra');
  }
  return errors;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Crea un usuario. Los 'user' arrancan con contraseña vigente PASSWORD_MAX_DIAS;
 * los 'owner' no caducan nunca (password_expires_at = NULL).
 */
async function createUser(username, plainPassword, nombre, rol = 'user') {
  const schema = safeSchema();
  const hash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  const esOwner = rol === ROL_OWNER;
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.usuarios (username, password_hash, nombre, rol, password_changed_at, password_expires_at, must_change_password)
     VALUES ($1, $2, $3, $4, NOW(), ${esOwner ? 'NULL' : `NOW() + ($5 || ' days')::interval`}, false)
     RETURNING id, username, nombre, rol, password_expires_at`,
    esOwner
      ? [username, hash, nombre || username, ROL_OWNER]
      : [username, hash, nombre || username, 'user', String(PASSWORD_MAX_DIAS)]
  );
  return rows[0];
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ ok: false, errors: ['No autenticado'] });
  }
  return res.redirect('/login.html');
}

/**
 * Con la contraseña caducada la sesión queda "en cuarentena": solo se permite
 * la pantalla de cambio de clave y lo mínimo para que funcione. Cualquier otra
 * ruta redirige (o responde 403 en API) hasta que defina una contraseña nueva.
 */
const RUTAS_LIBRES_CAMBIO = new Set([
  '/cambiar-password.html',
  '/cambiar-password.js',
  '/styles.css',
  '/sidebar.js',
  '/api/me',
  '/api/logout',
  '/api/cambiar-password',
]);

function requirePasswordVigente(req, res, next) {
  if (!req.session || !req.session.mustChangePassword) return next();
  if (RUTAS_LIBRES_CAMBIO.has(req.path) || req.path.startsWith('/img/')) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(403).json({
      ok: false,
      mustChangePassword: true,
      errors: ['Tu contraseña caducó. Define una nueva para continuar.'],
    });
  }
  return res.redirect('/cambiar-password.html');
}

// Rate limiter en memoria por IP para login
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Limpiar intentos fuera de la ventana
    record.attempts = record.attempts.filter(t => now - t < WINDOW_MS);
    if (record.attempts.length >= MAX_ATTEMPTS) {
      const waitMs = WINDOW_MS - (now - record.attempts[0]);
      const waitMin = Math.ceil(waitMs / 60000);
      return res.status(429).json({
        ok: false,
        errors: [`Demasiados intentos. Espera ${waitMin} minuto(s) e intenta de nuevo.`],
      });
    }
  }
  next();
}

function recordFailedAttempt(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { attempts: [] });
  }
  loginAttempts.get(ip).attempts.push(now);
}

function clearAttempts(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  loginAttempts.delete(ip);
}

// Limpiar registros viejos cada 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts) {
    record.attempts = record.attempts.filter(t => now - t < WINDOW_MS);
    if (record.attempts.length === 0) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000).unref();

async function deactivateUser(username) {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios SET activo = false WHERE username = $1 RETURNING id, username, nombre, activo`,
    [username]
  );
  return rows[0] || null;
}

async function activateUser(username) {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios SET activo = true WHERE username = $1 RETURNING id, username, nombre, activo`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Cambia la contraseña y reinicia el reloj de caducidad.
 * Los 'owner' quedan sin fecha de caducidad; el resto suma PASSWORD_MAX_DIAS.
 */
async function changePassword(username, newPlainPassword) {
  const schema = safeSchema();
  const hash = await bcrypt.hash(newPlainPassword, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios
     SET password_hash = $2,
         password_changed_at = NOW(),
         password_expires_at = CASE WHEN COALESCE(rol,'user') = $3 THEN NULL
                                    ELSE NOW() + ($4 || ' days')::interval END,
         must_change_password = false
     WHERE username = $1
     RETURNING id, username, nombre, rol, password_expires_at`,
    [username, hash, ROL_OWNER, String(PASSWORD_MAX_DIAS)]
  );
  return rows[0] || null;
}

/** Marca una cuenta para que deba cambiar la contraseña en el próximo ingreso. */
async function forcePasswordChange(username) {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios SET must_change_password = true
     WHERE username = $1 RETURNING id, username, nombre`,
    [username]
  );
  return rows[0] || null;
}

/** Cambia el rol de una cuenta ('owner' | 'user'). */
async function setUserRol(username, rol) {
  const schema = safeSchema();
  const esOwner = rol === ROL_OWNER;
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios
     SET rol = $2,
         password_expires_at = CASE WHEN $2 = $3 THEN NULL ELSE password_expires_at END
     WHERE username = $1
     RETURNING id, username, nombre, rol, password_expires_at`,
    [username, esOwner ? ROL_OWNER : 'user', ROL_OWNER]
  );
  return rows[0] || null;
}

async function listUsers() {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `SELECT id, username, nombre, activo, created_at,
            COALESCE(rol, 'user') AS rol,
            password_expires_at,
            COALESCE(must_change_password, false) AS must_change_password
     FROM ${schema}.usuarios ORDER BY id`
  );
  return rows;
}

module.exports = {
  findUserByUsername, verifyPassword, createUser, requireAuth,
  loginRateLimiter, recordFailedAttempt, clearAttempts,
  deactivateUser, activateUser, changePassword, listUsers,
  estadoPassword, validarPassword, requirePasswordVigente,
  forcePasswordChange, setUserRol,
  ROL_OWNER, PASSWORD_MAX_DIAS, PASSWORD_MIN_LEN,
};
