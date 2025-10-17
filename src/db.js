const { Pool } = require('pg');
require('./env');

const sslEnabled = String(process.env.PGSSL || 'true').toLowerCase() === 'true';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

async function ping() {
  const { rows } = await pool.query('SELECT 1 as ok');
  return rows[0];
}

function safeSchemaName(input) {
  const schema = (input || 'prod').toString();
  if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(schema)) {
    throw new Error('Nombre de esquema inválido');
  }
  return schema;
}

async function insertCliente(cliente) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const text = `
    INSERT INTO ${schema}.clientes (
      es_propietario,
      telefono_propietario,
      telefono_acudiente,
      email,
      perfil_instagram,
      direccion,
      alimento_mascota,
      nombre_mascota,
      fecha_nacimiento,
      fecha_antipulgas,
      producto_antipulgas,
      fecha_antiparasitario,
      producto_antiparasitario,
      alergias,
      observaciones,
      autorizacion_tratamiento_datos
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
    ) RETURNING id;
  `;
  const values = [
    cliente.es_propietario,
    cliente.telefono_propietario,
    cliente.telefono_acudiente || null,
    cliente.email || null,
    cliente.perfil_instagram || null,
    cliente.direccion || null,
    cliente.alimento_mascota || null,
    cliente.nombre_mascota || null,
    cliente.fecha_nacimiento || null,
    cliente.fecha_antipulgas || null,
    cliente.producto_antipulgas || null,
    cliente.fecha_antiparasitario || null,
    cliente.producto_antiparasitario || null,
    cliente.alergias,
    cliente.observaciones || null,
    cliente.autorizacion_tratamiento_datos,
  ];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function findClienteByTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT 
      id, es_propietario, telefono_propietario, telefono_acudiente, email,
      perfil_instagram, direccion, alimento_mascota, nombre_mascota,
      fecha_nacimiento, fecha_antipulgas, producto_antipulgas,
      fecha_antiparasitario, producto_antiparasitario, alergias, observaciones,
      autorizacion_tratamiento_datos
     FROM ${schema}.clientes WHERE telefono_propietario = $1 LIMIT 1`,
    [telefono]
  );
  return rows[0] || null;
}

async function updateCliente(id, cliente) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const text = `
    UPDATE ${schema}.clientes SET
      es_propietario = $1,
      telefono_propietario = $2,
      telefono_acudiente = $3,
      email = $4,
      perfil_instagram = $5,
      direccion = $6,
      alimento_mascota = $7,
      nombre_mascota = $8,
      fecha_nacimiento = $9,
      fecha_antipulgas = $10,
      producto_antipulgas = $11,
      fecha_antiparasitario = $12,
      producto_antiparasitario = $13,
      alergias = $14,
      observaciones = $15,
      autorizacion_tratamiento_datos = $16
    WHERE id = $17
    RETURNING id;
  `;
  const values = [
    cliente.es_propietario,
    cliente.telefono_propietario,
    cliente.telefono_acudiente || null,
    cliente.email || null,
    cliente.perfil_instagram || null,
    cliente.direccion || null,
    cliente.alimento_mascota || null,
    cliente.nombre_mascota || null,
    cliente.fecha_nacimiento || null,
    cliente.fecha_antipulgas || null,
    cliente.producto_antipulgas || null,
    cliente.fecha_antiparasitario || null,
    cliente.producto_antiparasitario || null,
    cliente.alergias,
    cliente.observaciones || null,
    cliente.autorizacion_tratamiento_datos,
    id,
  ];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

// ----- Pedidos -----
async function insertPedido(pedido) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const text = `
    INSERT INTO ${schema}.pedidos (
      telefono_propietario,
      telefono_acudiente,
      fecha_hora,
      raza,
      tamano,
      pelaje,
      servicio,
      precio,
      adicionales_descuentos,
      metodo_pago,
      groomer1,
      groomer2
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
    ) RETURNING id;
  `;
  const values = [
    pedido.telefono_propietario,
    pedido.telefono_acudiente || null,
    pedido.fecha_hora,
    pedido.raza || null,
    pedido.tamano || null,
    pedido.pelaje || null,
    pedido.servicio,
    pedido.precio || 0,
    pedido.adicionales_descuentos || 0,
    pedido.metodo_pago || null,
    pedido.groomer1 || null,
    pedido.groomer2 || null,
  ];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function updatePedido(id, pedido) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const text = `
    UPDATE ${schema}.pedidos SET
      telefono_propietario = $1,
      telefono_acudiente = $2,
      fecha_hora = $3,
      raza = $4,
      tamano = $5,
      pelaje = $6,
      servicio = $7,
      precio = $8,
      adicionales_descuentos = $9,
      metodo_pago = $10,
      groomer1 = $11,
      groomer2 = $12
    WHERE id = $13
    RETURNING id;
  `;
  const values = [
    pedido.telefono_propietario,
    pedido.telefono_acudiente || null,
    pedido.fecha_hora,
    pedido.raza || null,
    pedido.tamano || null,
    pedido.pelaje || null,
    pedido.servicio,
    pedido.precio || 0,
    pedido.adicionales_descuentos || 0,
    pedido.metodo_pago || null,
    pedido.groomer1 || null,
    pedido.groomer2 || null,
    id,
  ];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function findPedidosHoyPorTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT * FROM ${schema}.pedidos
     WHERE fecha_hora::date = CURRENT_DATE
       AND ($1 = telefono_propietario OR $1 = telefono_acudiente)
     ORDER BY fecha_hora DESC`,
    [telefono]
  );
  return rows;
}

async function getRazasTamano() {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  // La tabla tiene un nombre con carácter especial, se cita con comillas
  const { rows } = await pool.query(
    `SELECT raza, tamano FROM ${schema}."razas_tamaños" ORDER BY raza`
  );
  const razas = [];
  const mapping = {};
  for (const r of rows) {
    const raza = r.raza;
    const tam = r.tamano;
    if (raza) razas.push(raza);
    if (raza && tam) mapping[raza] = tam;
  }
  return { razas, mapping };
}

module.exports = {
  pool,
  ping,
  insertCliente,
  findClienteByTelefono,
  updateCliente,
  insertPedido,
  updatePedido,
  findPedidosHoyPorTelefono,
  getRazasTamano,
};


