/**
 * Aplica TODAS las migraciones pendientes de la versión 3.0 en un solo paso.
 *
 *   node scripts/migrar-todo.js
 *
 * Es idempotente: se puede ejecutar las veces que haga falta sin romper nada
 * (usa IF NOT EXISTS y solo inserta lo que aún no existe).
 *
 * NO crea usuarios ni pide contraseñas: para eso está gestionar-usuario.js.
 */
require('../src/env');
const { pool } = require('../src/db');

const s = process.env.PGSCHEMA || 'prod';
const DIAS_GRACIA = Number(process.env.DIAS_GRACIA || 7);

const ORIGENES_SEMILLA = [
  'WhatsApp',
  'Instagram',
  'Facebook',
  'TikTok',
  'Google / Búsqueda web',
  'Referido / Recomendación',
  'Cliente frecuente',
  'Paso por el local (fachada)',
  'Publicidad / Volante',
];

async function paso(titulo, fn) {
  process.stdout.write(`  ${titulo}... `);
  try {
    const detalle = await fn();
    console.log(`OK${detalle ? ` (${detalle})` : ''}`);
  } catch (e) {
    console.log('FALLÓ');
    throw e;
  }
}

async function run() {
  console.log(`\nMigrando esquema "${s}"...\n`);

  await paso('Catálogo de orígenes de cliente', async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.origenes_cliente (
      id BIGSERIAL PRIMARY KEY,
      nombre VARCHAR(80) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS origenes_cliente_nombre_uniq
      ON ${s}.origenes_cliente (lower(nombre))`);
    // ON CONFLICT se apoya en el índice único sobre lower(nombre): no duplica
    // y evita deducir tipos ambiguos para el parámetro.
    let nuevos = 0;
    for (const nombre of ORIGENES_SEMILLA) {
      const r = await pool.query(
        `INSERT INTO ${s}.origenes_cliente (nombre) VALUES ($1::text) ON CONFLICT DO NOTHING`,
        [nombre]
      );
      nuevos += r.rowCount;
    }
    return `${nuevos} origen(es) nuevo(s)`;
  });

  await paso('Columna pedidos.tipo_cliente', async () => {
    await pool.query(`ALTER TABLE ${s}.pedidos ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20)`);
  });

  await paso('Seguridad de usuarios (rol + caducidad)', async () => {
    await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'user'`);
    await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE ${s}.usuarios ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`);
    const r = await pool.query(
      `UPDATE ${s}.usuarios
       SET password_expires_at = NOW() + make_interval(days => $1::int)
       WHERE password_expires_at IS NULL AND rol <> 'owner'`,
      [DIAS_GRACIA]
    );
    return `${r.rowCount} cuenta(s) con ${DIAS_GRACIA} día(s) de gracia`;
  });

  await paso('Auditoría de pedidos eliminados', async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.pedidos_eliminados (
      id BIGSERIAL PRIMARY KEY,
      pedido_id BIGINT,
      motivo TEXT,
      eliminado_por VARCHAR(100),
      origen_eliminacion VARCHAR(30) NOT NULL DEFAULT 'manual',
      eliminado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      telefono_propietario VARCHAR(20),
      fecha_hora TIMESTAMPTZ,
      piso VARCHAR(20),
      nombre_mascota VARCHAR(200),
      raza VARCHAR(100),
      servicio VARCHAR(200),
      groomer1 VARCHAR(200),
      groomer2 VARCHAR(200),
      precio NUMERIC(12,2),
      adicionales_descuentos NUMERIC(12,2),
      precio_final NUMERIC(12,2),
      metodo_pago VARCHAR(50),
      cerrado BOOLEAN,
      datos JSONB NOT NULL
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS pedidos_eliminados_fecha_idx
      ON ${s}.pedidos_eliminados (eliminado_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS pedidos_eliminados_pedido_idx
      ON ${s}.pedidos_eliminados (pedido_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS pedidos_eliminados_origen_idx
      ON ${s}.pedidos_eliminados (origen_eliminacion)`);
  });

  await paso('Tabla de sesiones (sobreviven a los reinicios)', async () => {
    // Estructura que espera connect-pg-simple.
    await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.sesiones (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      CONSTRAINT sesiones_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS sesiones_expire_idx ON ${s}.sesiones (expire)`);
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${s}.sesiones`);
    return `${rows[0].n} sesión(es) activa(s)`;
  });

  console.log('\n✓ Migraciones aplicadas.\n');

  const { rows } = await pool.query(
    `SELECT username, COALESCE(rol,'user') AS rol, activo,
            to_char(password_expires_at, 'YYYY-MM-DD') AS caduca
     FROM ${s}.usuarios ORDER BY id`
  );
  if (rows.length) {
    console.log('Estado de las cuentas:');
    console.log('  Usuario           | Rol    | Activo | Clave caduca');
    console.log('  ------------------+--------+--------+-------------');
    for (const u of rows) {
      console.log(`  ${u.username.padEnd(17)} | ${u.rol.padEnd(6)} | ${u.activo ? ' SI   ' : ' NO   '} | ${u.caduca || 'nunca'}`);
    }
    console.log('');
  }

  console.log('Siguiente paso: crear tu cuenta de dueño (te pedirá la clave sin mostrarla):');
  console.log('  node scripts/gestionar-usuario.js crear-owner elkin_owner\n');

  await pool.end();
}

run().catch((e) => {
  console.error('\nError en la migración:', e.message);
  console.error('No se aplicaron cambios parciales peligrosos: puedes corregir y volver a ejecutar.\n');
  process.exit(1);
});
