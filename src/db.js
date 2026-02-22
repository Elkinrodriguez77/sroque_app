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
     WHERE (fecha_hora AT TIME ZONE 'America/Bogota')::date = (NOW() AT TIME ZONE 'America/Bogota')::date
       AND COALESCE(cerrado, false) = false
       AND ($1 = telefono_propietario OR $1 = telefono_acudiente)
     ORDER BY fecha_hora DESC`,
    [telefono]
  );
  return rows;
}

async function cerrarPedido(id) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.pedidos
     SET cerrado = true
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  return rows[0] || null;
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
       tipo_mascota,
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

    const incoming = Array.isArray(mascotas) ? mascotas : [];
    const incomingNames = new Set();

    for (const m of incoming) {
      const nombre = m && m.nombre_mascota ? String(m.nombre_mascota).trim() : '';
      if (!nombre) continue;
      incomingNames.add(nombre);

      const vals = [
        m.tipo_mascota || null,
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
      ];

      const { rows } = await client.query(
        `SELECT id FROM ${schema}.mascotas WHERE telefono_propietario = $1 AND nombre_mascota = $2 LIMIT 1`,
        [telefono, nombre]
      );

      if (rows.length > 0) {
        await client.query(
          `UPDATE ${schema}.mascotas SET
             tipo_mascota = $3, alimento_mascota = $4,
             fecha_nacimiento = $5, fecha_antipulgas = $6, producto_antipulgas = $7,
             fecha_antiparasitario = $8, producto_antiparasitario = $9,
             alergias = $10, observaciones = $11, raza = $12, tamano = $13, pelaje = $14
           WHERE telefono_propietario = $1 AND nombre_mascota = $2`,
          [telefono, nombre, ...vals]
        );
      } else {
        await client.query(
          `INSERT INTO ${schema}.mascotas (
             telefono_propietario, nombre_mascota,
             tipo_mascota, alimento_mascota,
             fecha_nacimiento, fecha_antipulgas, producto_antipulgas,
             fecha_antiparasitario, producto_antiparasitario,
             alergias, observaciones, raza, tamano, pelaje
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [telefono, nombre, ...vals]
        );
      }
    }

    // Solo borrar mascotas que ya no están en la lista Y no tienen pedidos vinculados
    if (incomingNames.size > 0) {
      await client.query(
        `DELETE FROM ${schema}.mascotas
         WHERE telefono_propietario = $1
           AND nombre_mascota != ALL($2::text[])
           AND id NOT IN (SELECT mascota_id FROM ${schema}.pedidos WHERE mascota_id IS NOT NULL)`,
        [telefono, Array.from(incomingNames)]
      );
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

// ----- Dashboard -----
async function getPedidosCerradosPorFecha(fechaDesde, fechaHasta) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, telefono_propietario, telefono_acudiente, fecha_hora,
            nombre_mascota, raza, tamano, pelaje, servicio,
            precio, adicionales_descuentos,
            (COALESCE(precio,0) + COALESCE(adicionales_descuentos,0)) AS precio_final,
            metodo_pago, groomer1, groomer2
     FROM ${schema}.pedidos
     WHERE cerrado = true
       AND (fecha_hora AT TIME ZONE 'America/Bogota')::date >= $1::date
       AND (fecha_hora AT TIME ZONE 'America/Bogota')::date <= $2::date
     ORDER BY fecha_hora DESC`,
    [fechaDesde, fechaHasta]
  );
  return rows;
}

// ----- Groomers -----
async function getAllGroomers() {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, documento, nombre, apellido, activo, created_at FROM ${schema}.groomers ORDER BY nombre, apellido`
  );
  return rows;
}

async function getActiveGroomers() {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, documento, nombre, apellido FROM ${schema}.groomers WHERE activo = true ORDER BY nombre, apellido`
  );
  return rows;
}

async function insertGroomer({ documento, nombre, apellido }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.groomers (documento, nombre, apellido) VALUES ($1, $2, $3) RETURNING *`,
    [documento, nombre, apellido]
  );
  return rows[0];
}

async function updateGroomer(id, { documento, nombre, apellido }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.groomers SET documento = $2, nombre = $3, apellido = $4 WHERE id = $1 RETURNING *`,
    [id, documento, nombre, apellido]
  );
  return rows[0] || null;
}

async function toggleGroomerActivo(id, activo) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.groomers SET activo = $2 WHERE id = $1 RETURNING *`,
    [id, activo]
  );
  return rows[0] || null;
}

module.exports = {
  pool, ping,
  insertCliente, findClienteByTelefono, updateCliente,
  insertPedido, updatePedido, findPedidosHoyPorTelefono,
  getRazasTamano, getMascotasByTelefono, replaceMascotasForTelefono,
  upsertMascotaBasica, cerrarPedido,
  getPedidosCerradosPorFecha,
  getAllGroomers, getActiveGroomers, insertGroomer, updateGroomer, toggleGroomerActivo,
};


