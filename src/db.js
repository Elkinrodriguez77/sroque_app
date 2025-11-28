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
      nombre_propietario,
      nombre_acudiente,
      email,
      perfil_instagram,
      direccion,
      autorizacion_tratamiento_datos
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    ) RETURNING id;
  `;
  const values = [
    cliente.es_propietario,
    cliente.telefono_propietario,
    cliente.telefono_acudiente || null,
    cliente.nombre_propietario,
    cliente.nombre_acudiente || null,
    cliente.email || null,
    cliente.perfil_instagram || null,
    cliente.direccion || null,
    cliente.autorizacion_tratamiento_datos,
  ];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function findClienteByTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT 
      id,
      es_propietario,
      telefono_propietario,
      telefono_acudiente,
      nombre_propietario,
      nombre_acudiente,
      email,
      perfil_instagram,
      direccion,
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
      nombre_propietario = $4,
      nombre_acudiente = $5,
      email = $6,
      perfil_instagram = $7,
      direccion = $8,
      autorizacion_tratamiento_datos = $9
    WHERE id = $10
    RETURNING id;
  `;
  const values = [
    cliente.es_propietario,
    cliente.telefono_propietario,
    cliente.telefono_acudiente || null,
    cliente.nombre_propietario,
    cliente.nombre_acudiente || null,
    cliente.email || null,
    cliente.perfil_instagram || null,
    cliente.direccion || null,
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
      groomer2,
      mascota_id,
      nombre_mascota
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
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
    pedido.mascota_id || null,
    pedido.nombre_mascota || null,
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
      groomer2 = $12,
      mascota_id = $13,
      nombre_mascota = $14
    WHERE id = $15
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
    pedido.mascota_id || null,
    pedido.nombre_mascota || null,
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

// ----- Mascotas por cliente -----
async function getMascotasByTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT
       id,
       telefono_propietario,
       nombre_mascota,
       alimento_mascota,
       fecha_nacimiento,
       fecha_antipulgas,
       producto_antipulgas,
       fecha_antiparasitario,
       producto_antiparasitario,
       alergias,
       observaciones,
       raza,
       tamano,
       pelaje
     FROM ${schema}.mascotas
     WHERE telefono_propietario = $1
     ORDER BY id`,
    [telefono]
  );
  return rows;
}

async function replaceMascotasForTelefono(telefono, mascotas) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${schema}.mascotas WHERE telefono_propietario = $1`,
      [telefono]
    );
    if (Array.isArray(mascotas)) {
      for (const m of mascotas) {
        const nombre = m && m.nombre_mascota ? String(m.nombre_mascota).trim() : '';
        if (!nombre) continue; // ignorar mascotas sin nombre
        await client.query(
          `INSERT INTO ${schema}.mascotas (
             telefono_propietario,
             nombre_mascota,
             alimento_mascota,
             fecha_nacimiento,
             fecha_antipulgas,
             producto_antipulgas,
             fecha_antiparasitario,
             producto_antiparasitario,
             alergias,
             observaciones,
             raza,
             tamano,
             pelaje
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            telefono,
            nombre,
            m.alimento_mascota || null,
            m.fecha_nacimiento || null,
            m.fecha_antipulgas || null,
            m.producto_antipulgas || null,
            m.fecha_antiparasitario || null,
            m.producto_antiparasitario || null,
            typeof m.alergias === 'boolean' ? m.alergias : null,
            m.observaciones || null,
            m.raza || null,
            m.tamano || null,
            m.pelaje || null,
          ]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function findMascotaByTelefonoAndNombre(telefono, nombre) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT *
     FROM ${schema}.mascotas
     WHERE telefono_propietario = $1 AND nombre_mascota = $2
     ORDER BY id
     LIMIT 1`,
    [telefono, nombre]
  );
  return rows[0] || null;
}

async function upsertMascotaBasica({ telefono_propietario, mascota_id, nombre_mascota, raza, tamano, pelaje }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  if (!telefono_propietario || !nombre_mascota) return null;

  if (mascota_id) {
    const { rows } = await pool.query(
      `UPDATE ${schema}.mascotas
       SET raza = COALESCE($2, raza),
           tamano = COALESCE($3, tamano),
           pelaje = COALESCE($4, pelaje)
       WHERE id = $1
       RETURNING *`,
      [mascota_id, raza || null, tamano || null, pelaje || null]
    );
    return rows[0] || null;
  }

  const existing = await findMascotaByTelefonoAndNombre(telefono_propietario, nombre_mascota);
  if (existing) {
    const { rows } = await pool.query(
      `UPDATE ${schema}.mascotas
       SET raza = COALESCE($2, raza),
           tamano = COALESCE($3, tamano),
           pelaje = COALESCE($4, pelaje)
       WHERE id = $1
       RETURNING *`,
      [existing.id, raza || null, tamano || null, pelaje || null]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `INSERT INTO ${schema}.mascotas (
       telefono_propietario,
       nombre_mascota,
       raza,
       tamano,
       pelaje
     ) VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [telefono_propietario, nombre_mascota, raza || null, tamano || null, pelaje || null]
  );
  return rows[0];
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
  getMascotasByTelefono,
  replaceMascotasForTelefono,
  upsertMascotaBasica,
};


