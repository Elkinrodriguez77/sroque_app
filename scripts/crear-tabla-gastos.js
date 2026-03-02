require('../src/env');
const { pool } = require('../src/db');
const s = process.env.PGSCHEMA || 'prod';

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${s}.gastos (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tercero VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    categoria_otro VARCHAR(100),
    metodo_pago VARCHAR(50) NOT NULL,
    piso VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  console.log('Tabla gastos creada OK');
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
