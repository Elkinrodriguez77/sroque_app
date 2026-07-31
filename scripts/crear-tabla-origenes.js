require('../src/env');
const { pool } = require('../src/db');
const s = process.env.PGSCHEMA || 'prod';

const SEMILLA = [
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

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.origenes_cliente (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS origenes_cliente_nombre_uniq
    ON ${s}.origenes_cliente (lower(nombre))`);

  // ON CONFLICT se apoya en el índice único sobre lower(nombre).
  for (const nombre of SEMILLA) {
    await pool.query(
      `INSERT INTO ${s}.origenes_cliente (nombre) VALUES ($1::text) ON CONFLICT DO NOTHING`,
      [nombre]
    );
  }

  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${s}.origenes_cliente`);
  console.log(`Tabla origenes_cliente lista OK (${rows[0].n} registros)`);
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
