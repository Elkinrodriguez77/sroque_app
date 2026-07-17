// Elimina los pedidos que quedaron ABIERTOS (sin cerrar).
//
// Uso:
//   node scripts/purgar-pedidos-abiertos.js               → borra abiertos de jornadas PASADAS (seguro a cualquier hora)
//   node scripts/purgar-pedidos-abiertos.js --incluir-hoy → borra también los abiertos de HOY (usar en un job de FIN de jornada, ~23:59 Bogotá)
//
// Pensado para un job programado (cron del hosting). La app también hace una
// limpieza perezosa de jornadas pasadas al consultar pedidos, así que este
// script solo es indispensable si quieres la purga exacta al cierre del día.

require('../src/env');
const { pool, purgarPedidosAbiertos } = require('../src/db');

const incluirHoy = process.argv.includes('--incluir-hoy')
  || String(process.env.PURGAR_INCLUIR_HOY || '').toLowerCase() === 'true';

async function run() {
  const n = await purgarPedidosAbiertos(incluirHoy);
  console.log(`Purga de pedidos abiertos (${incluirHoy ? 'incluye hoy' : 'solo jornadas pasadas'}): ${n} eliminado(s).`);
  await pool.end();
}

run().catch((e) => { console.error('Error en purga de abiertos:', e.message); process.exit(1); });
