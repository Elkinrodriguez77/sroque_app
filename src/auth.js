const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const BCRYPT_ROUNDS = 12;

function safeSchema() {
  const schema = (process.env.PGSCHEMA || 'prod').toString();
  if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(schema)) throw new Error('Nombre de esquema inválido');
  return schema;
}

async function findUserByUsername(username) {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `SELECT id, username, password_hash, nombre, activo FROM ${schema}.usuarios WHERE username = $1 LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function createUser(username, plainPassword, nombre) {
  const schema = safeSchema();
  const hash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.usuarios (username, password_hash, nombre)
     VALUES ($1, $2, $3) RETURNING id, username, nombre`,
    [username, hash, nombre || username]
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

async function changePassword(username, newPlainPassword) {
  const schema = safeSchema();
  const hash = await bcrypt.hash(newPlainPassword, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `UPDATE ${schema}.usuarios SET password_hash = $2 WHERE username = $1 RETURNING id, username, nombre`,
    [username, hash]
  );
  return rows[0] || null;
}

async function listUsers() {
  const schema = safeSchema();
  const { rows } = await pool.query(
    `SELECT id, username, nombre, activo, created_at FROM ${schema}.usuarios ORDER BY id`
  );
  return rows;
}

module.exports = {
  findUserByUsername, verifyPassword, createUser, requireAuth,
  loginRateLimiter, recordFailedAttempt, clearAttempts,
  deactivateUser, activateUser, changePassword, listUsers,
};
