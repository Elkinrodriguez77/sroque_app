/**
 * Migración de seguridad de cuentas.
 *
 *   node scripts/migrar-seguridad-usuarios.js [dias_gracia]
 *
 * Agrega a `usuarios` las columnas de caducidad de contraseña y rol, y le da a
 * las cuentas ya existentes un periodo de gracia (7 días por defecto) antes de
 * exigirles una contraseña nueva. Es idempotente: se puede correr varias veces.
 */
require('../src/env');
const { pool } = require('../src/db');
const s = process.env.PGSCHEMA || 'prod';

const diasGracia = Number(process.argv[2] || 7);

async function run() {
  if (!Number.isFinite(diasGracia) || diasGracia < 0) {
    console.error('El periodo de gracia debe ser un número de días >= 0.');
    process.exit(1);
  }

  await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`);

  const { rowCount } = await pool.query(
    `UPDATE ${s}.usuarios
     SET password_expires_at = NOW() + make_interval(days => $1::int)
     WHERE password_expires_at IS NULL AND rol <> 'owner'`,
    [diasGracia]
  );

  console.log(`Columnas de seguridad listas OK.`);
  console.log(`${rowCount} cuenta(s) existente(s) con ${diasGracia} día(s) de gracia; luego deberán cambiar la contraseña.`);

  const { rows } = await pool.query(
    `SELECT username, rol, activo,
            to_char(password_expires_at, 'YYYY-MM-DD') AS caduca
     FROM ${s}.usuarios ORDER BY id`
  );
  console.log('\n  Usuario           | Rol    | Activo | Caduca');
  console.log('  ------------------+--------+--------+------------');
  for (const u of rows) {
    console.log(`  ${u.username.padEnd(17)} | ${String(u.rol).padEnd(6)} | ${u.activo ? ' SI   ' : ' NO   '} | ${u.caduca || 'nunca'}`);
  }
  console.log('');

  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
