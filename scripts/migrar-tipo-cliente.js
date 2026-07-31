require('../src/env');
const { pool } = require('../src/db');
const s = process.env.PGSCHEMA || 'prod';

async function run() {
  await pool.query(`ALTER TABLE ${s}.pedidos ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20)`);
  console.log('Columna pedidos.tipo_cliente lista OK');
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
