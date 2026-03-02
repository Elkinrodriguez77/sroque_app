require('../src/env');
const { pool } = require('../src/db');
const s = process.env.PGSCHEMA || 'prod';

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.venta_boutique (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    piso VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  console.log('Tabla venta_boutique creada OK');
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
