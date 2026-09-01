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
      piso,
      raza,
      tamano,
      pelaje,
      servicio,
      precio,
      adicionales_descuentos,
      metodo_pago,
      metodo_pago_1,
      metodo_pago_2,
      monto_pago_1,
      monto_pago_2,
      groomer1,
      groomer2,
      mascota_id,
      nombre_mascota,
      origen_cliente,
      tipo_cliente
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
    ) RETURNING id;
  `;
  const values = [
    pedido.telefono_propietario,
    pedido.telefono_acudiente || null,
    pedido.fecha_hora,
    pedido.piso || null,
    pedido.raza || null,
    pedido.tamano || null,
    pedido.pelaje || null,
    pedido.servicio,
    pedido.precio || 0,
    pedido.adicionales_descuentos || 0,
    pedido.metodo_pago || null,
    pedido.metodo_pago_1 || null,
    pedido.metodo_pago_2 || null,
    pedido.monto_pago_1 || null,
    pedido.monto_pago_2 || null,
    pedido.groomer1 || null,
    pedido.groomer2 || null,
    pedido.mascota_id || null,
    pedido.nombre_mascota || null,
    pedido.origen_cliente || null,
    pedido.tipo_cliente || null,
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
      piso = $4,
      raza = $5,
      tamano = $6,
      pelaje = $7,
      servicio = $8,
      precio = $9,
      adicionales_descuentos = $10,
      metodo_pago = $11,
      metodo_pago_1 = $12,
      metodo_pago_2 = $13,
      monto_pago_1 = $14,
      monto_pago_2 = $15,
      groomer1 = $16,
      groomer2 = $17,
      mascota_id = $18,
      nombre_mascota = $19,
      origen_cliente = $20,
      tipo_cliente = $21
    WHERE id = $22
    RETURNING id;
  `;
  const values = [
    pedido.telefono_propietario,
    pedido.telefono_acudiente || null,
    pedido.fecha_hora,
    pedido.piso || null,
    pedido.raza || null,
    pedido.tamano || null,
    pedido.pelaje || null,
    pedido.servicio,
    pedido.precio || 0,
    pedido.adicionales_descuentos || 0,
    pedido.metodo_pago || null,
    pedido.metodo_pago_1 || null,
    pedido.metodo_pago_2 || null,
    pedido.monto_pago_1 || null,
    pedido.monto_pago_2 || null,
    pedido.groomer1 || null,
    pedido.groomer2 || null,
    pedido.mascota_id || null,
    pedido.nombre_mascota || null,
    pedido.origen_cliente || null,
    pedido.tipo_cliente || null,
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

/** Pedidos del día (Bogotá) para un teléfono: abiertos y cerrados (para revisar duplicados). */
async function findPedidosHoyTodosPorTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT * FROM ${schema}.pedidos
     WHERE (fecha_hora AT TIME ZONE 'America/Bogota')::date = (NOW() AT TIME ZONE 'America/Bogota')::date
       AND ($1 = telefono_propietario OR $1 = telefono_acudiente)
     ORDER BY fecha_hora DESC`,
    [telefono]
  );
  return rows;
}

/**
 * SELECT que copia un pedido a la tabla de auditoría. Se comparte entre el
 * borrado manual y la purga automática para que ambos guarden lo mismo.
 * `origen` y `motivo` se pasan como parámetros; el resto sale del propio pedido.
 */
function sqlArchivarPedidos(schema, whereClause) {
  return `
    INSERT INTO ${schema}.pedidos_eliminados (
      pedido_id, motivo, eliminado_por, origen_eliminacion,
      telefono_propietario, fecha_hora, piso, nombre_mascota, raza, servicio,
      groomer1, groomer2, precio, adicionales_descuentos, precio_final,
      metodo_pago, cerrado, datos
    )
    SELECT
      p.id, $1::text, $2::text, $3::text,
      p.telefono_propietario, p.fecha_hora, p.piso, p.nombre_mascota, p.raza, p.servicio,
      p.groomer1, p.groomer2, p.precio, p.adicionales_descuentos,
      COALESCE(p.precio, 0) + COALESCE(p.adicionales_descuentos, 0),
      p.metodo_pago, COALESCE(p.cerrado, false), to_jsonb(p)
    FROM ${schema}.pedidos p
    WHERE ${whereClause}
  `;
}

/**
 * Elimina un pedido dejando copia en la auditoría. Todo va en una transacción:
 * si el archivado falla, el pedido NO se borra (nunca se pierde el rastro).
 * @param {number} id
 * @param {{motivo?: string, usuario?: string, origen?: string}} contexto
 */
async function deletePedido(id, contexto = {}) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const motivo = contexto.motivo ? String(contexto.motivo).trim() : null;
  const usuario = contexto.usuario ? String(contexto.usuario).trim() : null;
  const origen = contexto.origen || 'manual';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sqlArchivarPedidos(schema, 'p.id = $4::bigint'), [motivo, usuario, origen, id]);
    const { rows } = await client.query(
      `DELETE FROM ${schema}.pedidos WHERE id = $1 RETURNING id`,
      [id]
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Últimos pedidos eliminados, para consulta rápida desde la app. */
async function getPedidosEliminados({ limite = 200, desde = null, hasta = null } = {}) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const params = [];
  let filtros = '';
  if (desde) {
    params.push(desde);
    filtros += ` AND (eliminado_at AT TIME ZONE 'America/Bogota')::date >= $${params.length}::date`;
  }
  if (hasta) {
    params.push(hasta);
    filtros += ` AND (eliminado_at AT TIME ZONE 'America/Bogota')::date <= $${params.length}::date`;
  }
  params.push(Math.min(Number(limite) || 200, 1000));
  const { rows } = await pool.query(
    `SELECT id, pedido_id, motivo, eliminado_por, origen_eliminacion, eliminado_at,
            telefono_propietario, fecha_hora, piso, nombre_mascota, raza, servicio,
            groomer1, groomer2, precio_final, metodo_pago, cerrado
     FROM ${schema}.pedidos_eliminados
     WHERE true ${filtros}
     ORDER BY eliminado_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

/**
 * Elimina pedidos que quedaron ABIERTOS (sin cerrar) y ya no pertenecen a la
 * jornada en curso. Los abiertos no cerrados no deben acumularse día a día.
 * @param {boolean} incluirHoy Si true, también borra los abiertos de HOY
 *   (usar solo en un job de fin de jornada). Por defecto solo borra jornadas
 *   pasadas, para no eliminar pedidos que aún se están atendiendo hoy.
 * @returns {Promise<number>} cantidad de pedidos eliminados.
 */
async function purgarPedidosAbiertos(incluirHoy = false) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const cmp = incluirHoy ? '<=' : '<';
  const condicion = `COALESCE(p.cerrado, false) = false
       AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date ${cmp} (NOW() AT TIME ZONE 'America/Bogota')::date`;
  const motivo = incluirHoy
    ? 'Purga de fin de jornada: pedido quedó abierto sin cerrar.'
    : 'Purga automática: pedido de una jornada anterior quedó abierto sin cerrar.';

  // Archivar y borrar en una sola transacción: si falla el archivado, no se borra.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sqlArchivarPedidos(schema, condicion), [motivo, 'sistema', 'purga_automatica']);
    const { rowCount } = await client.query(
      `DELETE FROM ${schema}.pedidos p
       WHERE ${condicion}`
    );
    await client.query('COMMIT');
    return rowCount;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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
       pelaje,
       foto_referencia
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

async function upsertMascotaBasica({ telefono_propietario, mascota_id, nombre_mascota, raza, tamano, pelaje, tipo_mascota }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  if (!telefono_propietario || !nombre_mascota) return null;

  if (mascota_id) {
    const { rows } = await pool.query(
      `UPDATE ${schema}.mascotas
       SET raza = COALESCE($2, raza),
           tamano = COALESCE($3, tamano),
           pelaje = COALESCE($4, pelaje),
           tipo_mascota = COALESCE($5, tipo_mascota)
       WHERE id = $1
       RETURNING *`,
      [mascota_id, raza || null, tamano || null, pelaje || null, tipo_mascota || null]
    );
    return rows[0] || null;
  }

  const existing = await findMascotaByTelefonoAndNombre(telefono_propietario, nombre_mascota);
  if (existing) {
    const { rows } = await pool.query(
      `UPDATE ${schema}.mascotas
       SET raza = COALESCE($2, raza),
           tamano = COALESCE($3, tamano),
           pelaje = COALESCE($4, pelaje),
           tipo_mascota = COALESCE($5, tipo_mascota)
       WHERE id = $1
       RETURNING *`,
      [existing.id, raza || null, tamano || null, pelaje || null, tipo_mascota || null]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query(
    `INSERT INTO ${schema}.mascotas (
       telefono_propietario,
       nombre_mascota,
       raza,
       tamano,
       pelaje,
       tipo_mascota
     ) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [telefono_propietario, nombre_mascota, raza || null, tamano || null, pelaje || null, tipo_mascota || null]
  );
  return rows[0];
}

async function getMascotaById(id) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, telefono_propietario, nombre_mascota, foto_referencia
     FROM ${schema}.mascotas WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function updateMascotaFotoReferencia(id, foto_referencia) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.mascotas SET foto_referencia = $2 WHERE id = $1 RETURNING *`,
    [id, foto_referencia]
  );
  return rows[0] || null;
}

// ----- Dashboard -----
async function getPedidosPorFecha(fechaDesde, fechaHasta, estado, piso) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  let filters = '';
  const params = [fechaDesde, fechaHasta];
  if (estado === 'cerrados') {
    filters += ' AND COALESCE(p.cerrado, false) = true';
  } else if (estado === 'abiertos') {
    filters += ' AND COALESCE(p.cerrado, false) = false';
  }
  if (piso) {
    params.push(piso);
    filters += ` AND p.piso = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT p.id, p.telefono_propietario, p.telefono_acudiente, p.fecha_hora, p.piso,
            p.nombre_mascota, p.raza, p.tamano, p.pelaje, p.servicio,
            p.precio, p.adicionales_descuentos,
            (COALESCE(p.precio,0) + COALESCE(p.adicionales_descuentos,0)) AS precio_final,
            p.metodo_pago, p.metodo_pago_1, p.metodo_pago_2, p.monto_pago_1, p.monto_pago_2,
            p.groomer1, p.groomer2, p.cerrado,
            c.nombre_propietario
     FROM ${schema}.pedidos p
     LEFT JOIN ${schema}.clientes c ON c.telefono_propietario = p.telefono_propietario
     WHERE (p.fecha_hora AT TIME ZONE 'America/Bogota')::date >= $1::date
       AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date <= $2::date
       ${filters}
     ORDER BY p.fecha_hora DESC`,
    params
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

// ----- Orígenes de cliente (catálogo del campo "Origen del cliente") -----
async function getAllOrigenes() {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, nombre, activo, created_at FROM ${schema}.origenes_cliente ORDER BY nombre`
  );
  return rows;
}

async function getActiveOrigenes() {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT id, nombre FROM ${schema}.origenes_cliente WHERE activo = true ORDER BY nombre`
  );
  return rows;
}

async function insertOrigen({ nombre }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.origenes_cliente (nombre) VALUES ($1) RETURNING *`,
    [nombre]
  );
  return rows[0];
}

async function updateOrigen(id, { nombre }) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.origenes_cliente SET nombre = $2 WHERE id = $1 RETURNING *`,
    [id, nombre]
  );
  return rows[0] || null;
}

async function toggleOrigenActivo(id, activo) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.origenes_cliente SET activo = $2 WHERE id = $1 RETURNING *`,
    [id, activo]
  );
  return rows[0] || null;
}

async function deleteOrigen(id) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `DELETE FROM ${schema}.origenes_cliente WHERE id = $1 RETURNING id`, [id]
  );
  return rows[0] || null;
}

// ----- Servicios: buscar mascotas por nombre (coincidencias) -----
async function searchMascotasByNombre(nombre) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const term = `%${String(nombre || '').trim()}%`;
  if (term === '%%') return [];
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre_mascota, m.telefono_propietario, c.nombre_propietario
     FROM ${schema}.mascotas m
     LEFT JOIN ${schema}.clientes c ON c.telefono_propietario = m.telefono_propietario
     WHERE m.nombre_mascota ILIKE $1
     ORDER BY m.nombre_mascota`,
    [term]
  );
  return rows;
}

// ----- Servicios: pedidos por mascota (más reciente a más antiguo) -----
async function getPedidosPorMascota(mascotaId) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows: mascotaRows } = await pool.query(
    `SELECT id, nombre_mascota, telefono_propietario FROM ${schema}.mascotas WHERE id = $1 LIMIT 1`,
    [mascotaId]
  );
  const mascota = mascotaRows[0];
  if (!mascota) return [];
  const { rows } = await pool.query(
    `SELECT id, fecha_hora, servicio, groomer1, nombre_mascota,
            raza, metodo_pago, metodo_pago_1, metodo_pago_2,
            precio, adicionales_descuentos,
            (COALESCE(precio,0) + COALESCE(adicionales_descuentos,0)) AS precio_final
     FROM ${schema}.pedidos
     WHERE mascota_id = $1
        OR (telefono_propietario = $2 AND nombre_mascota = $3)
     ORDER BY fecha_hora DESC`,
    [mascotaId, mascota.telefono_propietario, mascota.nombre_mascota]
  );
  return rows;
}

// ----- Hoja de vida de la mascota -----
/**
 * Ficha completa de una mascota: sus datos clínicos//de cuidado, el cliente
 * dueño y TODO su historial de servicios (más reciente primero).
 * Los pedidos se cruzan por mascota_id y, como respaldo, por teléfono+nombre,
 * porque los pedidos antiguos se guardaron sin mascota_id.
 */
async function getHojaVidaMascota(mascotaId) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');

  const { rows: mRows } = await pool.query(
    `SELECT id, telefono_propietario, nombre_mascota, tipo_mascota, raza, tamano, pelaje,
            alimento_mascota, fecha_nacimiento, fecha_antipulgas, producto_antipulgas,
            fecha_antiparasitario, producto_antiparasitario, alergias, observaciones,
            foto_referencia
     FROM ${schema}.mascotas WHERE id = $1 LIMIT 1`,
    [mascotaId]
  );
  const mascota = mRows[0];
  if (!mascota) return null;

  const { rows: cRows } = await pool.query(
    `SELECT telefono_propietario, telefono_acudiente, nombre_propietario, nombre_acudiente,
            email, perfil_instagram, direccion
     FROM ${schema}.clientes WHERE telefono_propietario = $1 LIMIT 1`,
    [mascota.telefono_propietario]
  );

  const { rows: servicios } = await pool.query(
    `SELECT id, fecha_hora, servicio, piso, raza, tamano, pelaje,
            groomer1, groomer2, metodo_pago, origen_cliente, tipo_cliente, cerrado,
            precio, adicionales_descuentos,
            (COALESCE(precio,0) + COALESCE(adicionales_descuentos,0)) AS precio_final
     FROM ${schema}.pedidos
     WHERE mascota_id = $1
        OR (telefono_propietario = $2 AND nombre_mascota = $3)
     ORDER BY fecha_hora DESC`,
    [mascotaId, mascota.telefono_propietario, mascota.nombre_mascota]
  );

  return { mascota, cliente: cRows[0] || null, servicios };
}

/**
 * Mascotas de un teléfono con un resumen para gestión (última visita y total
 * de servicios), para poder elegir a cuál abrirle la hoja de vida.
 */
async function getResumenMascotasPorTelefono(telefono) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre_mascota, m.tipo_mascota, m.raza, m.telefono_propietario,
            c.nombre_propietario,
            s.ultima_visita, COALESCE(s.total_servicios, 0) AS total_servicios
     FROM ${schema}.mascotas m
     LEFT JOIN ${schema}.clientes c ON c.telefono_propietario = m.telefono_propietario
     LEFT JOIN LATERAL (
       SELECT MAX(p.fecha_hora) AS ultima_visita, COUNT(*) AS total_servicios
       FROM ${schema}.pedidos p
       WHERE p.mascota_id = m.id
          OR (p.telefono_propietario = m.telefono_propietario AND p.nombre_mascota = m.nombre_mascota)
     ) s ON true
     WHERE m.telefono_propietario = $1
     ORDER BY s.ultima_visita DESC NULLS LAST, m.nombre_mascota`,
    [telefono]
  );
  return rows;
}

/** Igual que el anterior, pero buscando por nombre de mascota (coincidencias). */
async function getResumenMascotasPorNombre(nombre) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const term = `%${String(nombre || '').trim()}%`;
  if (term === '%%') return [];
  const { rows } = await pool.query(
    `SELECT m.id, m.nombre_mascota, m.tipo_mascota, m.raza, m.telefono_propietario,
            c.nombre_propietario,
            s.ultima_visita, COALESCE(s.total_servicios, 0) AS total_servicios
     FROM ${schema}.mascotas m
     LEFT JOIN ${schema}.clientes c ON c.telefono_propietario = m.telefono_propietario
     LEFT JOIN LATERAL (
       SELECT MAX(p.fecha_hora) AS ultima_visita, COUNT(*) AS total_servicios
       FROM ${schema}.pedidos p
       WHERE p.mascota_id = m.id
          OR (p.telefono_propietario = m.telefono_propietario AND p.nombre_mascota = m.nombre_mascota)
     ) s ON true
     WHERE m.nombre_mascota ILIKE $1
     ORDER BY s.ultima_visita DESC NULLS LAST, m.nombre_mascota
     LIMIT 50`,
    [term]
  );
  return rows;
}

// ----- Gastos -----
async function insertGasto(gasto) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.gastos (fecha, tercero, descripcion, monto, categoria, categoria_otro, metodo_pago, piso)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [gasto.fecha, gasto.tercero, gasto.descripcion, gasto.monto,
     gasto.categoria, gasto.categoria_otro || null, gasto.metodo_pago, gasto.piso || null]
  );
  return rows[0];
}

async function getGastosPorFecha(fechaDesde, fechaHasta, piso) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const params = [fechaDesde, fechaHasta];
  let pisoFilter = '';
  if (piso) {
    params.push(piso);
    pisoFilter = ` AND piso = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM ${schema}.gastos
     WHERE fecha >= $1::date AND fecha <= $2::date${pisoFilter}
     ORDER BY fecha DESC, created_at DESC`,
    params
  );
  return rows;
}

async function updateGasto(id, gasto) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `UPDATE ${schema}.gastos SET
       fecha = $2, tercero = $3, descripcion = $4, monto = $5,
       categoria = $6, categoria_otro = $7, metodo_pago = $8, piso = $9
     WHERE id = $1
     RETURNING *`,
    [id, gasto.fecha, gasto.tercero, gasto.descripcion, gasto.monto,
     gasto.categoria, gasto.categoria_otro || null, gasto.metodo_pago, gasto.piso || null]
  );
  return rows[0] || null;
}

async function deleteGasto(id) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `DELETE FROM ${schema}.gastos WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

// ----- Inicio de Caja (por método de pago) -----
const INICIO_CAJA_DESDE = '2026-03-02';

/** Primer día con inicio de efectivo “rebasado” (saldo fijo + arrastre desde aquí). Opcional por env. */
const INICIO_EFECTIVO_SEED_FECHA = process.env.INICIO_EFECTIVO_SEED_FECHA || '2026-04-20';

function montoInicioEfectivoSeed(piso) {
  if (piso === 'Piso 1') return 12500;
  if (piso === 'Piso 2') return 20000;
  return 32500;
}

function netoEfectivoEnResultado(result) {
  const e = result['Efectivo'];
  if (!e) return 0;
  return (Number(e.spa) || 0) + (Number(e.boutique) || 0) - (Number(e.gastos) || 0);
}

async function getInicioCajaPorMetodo(antesDeFecha, piso, aplicarSemillaEfectivo = true) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');

  const pN = [INICIO_CAJA_DESDE, antesDeFecha];
  let fN = '';
  if (piso) { pN.push(piso); fN = ` AND p.piso = $${pN.length}`; }

  const pM = [INICIO_CAJA_DESDE, antesDeFecha];
  let fM = '';
  if (piso) { pM.push(piso); fM = ` AND p.piso = $${pM.length}`; }

  const pB = [INICIO_CAJA_DESDE, antesDeFecha];
  let fB = '';
  if (piso) { pB.push(piso); fB = ` AND piso = $${pB.length}`; }

  const pG = [INICIO_CAJA_DESDE, antesDeFecha];
  let fG = '';
  if (piso) { pG.push(piso); fG = ` AND piso = $${pG.length}`; }

  const [resSpaN, resSpaM, resBout, resGas] = await Promise.all([
    pool.query(
      `SELECT p.metodo_pago, SUM(COALESCE(p.precio,0) + COALESCE(p.adicionales_descuentos,0)) AS total
       FROM ${schema}.pedidos p
       WHERE COALESCE(p.cerrado, false) = true
         AND (p.metodo_pago IS NULL OR p.metodo_pago != 'Mixto')
         AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date >= $1::date
         AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date < $2::date${fN}
       GROUP BY p.metodo_pago`,
      pN
    ),
    pool.query(
      `SELECT p.metodo_pago_1, p.metodo_pago_2, p.monto_pago_1, p.monto_pago_2
       FROM ${schema}.pedidos p
       WHERE COALESCE(p.cerrado, false) = true
         AND p.metodo_pago = 'Mixto'
         AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date >= $1::date
         AND (p.fecha_hora AT TIME ZONE 'America/Bogota')::date < $2::date${fM}`,
      pM
    ),
    pool.query(
      `SELECT metodo_pago, SUM(monto) AS total
       FROM ${schema}.venta_boutique
       WHERE fecha >= $1::date AND fecha < $2::date${fB}
       GROUP BY metodo_pago`,
      pB
    ),
    pool.query(
      `SELECT metodo_pago, SUM(monto) AS total
       FROM ${schema}.gastos
       WHERE fecha >= $1::date AND fecha < $2::date${fG}
       GROUP BY metodo_pago`,
      pG
    ),
  ]);

  const result = {};
  function ensure(m) { if (!result[m]) result[m] = { spa: 0, boutique: 0, gastos: 0 }; }

  for (const row of resSpaN.rows) {
    const m = row.metodo_pago || 'Sin especificar';
    ensure(m);
    result[m].spa += Number(row.total);
  }
  for (const row of resSpaM.rows) {
    if (row.metodo_pago_1) { ensure(row.metodo_pago_1); result[row.metodo_pago_1].spa += Number(row.monto_pago_1 || 0); }
    if (row.metodo_pago_2) { ensure(row.metodo_pago_2); result[row.metodo_pago_2].spa += Number(row.monto_pago_2 || 0); }
  }
  for (const row of resBout.rows) {
    const m = row.metodo_pago || 'Sin especificar';
    ensure(m);
    result[m].boutique += Number(row.total);
  }
  for (const row of resGas.rows) {
    const m = row.metodo_pago || 'Sin especificar';
    ensure(m);
    result[m].gastos += Number(row.total);
  }

  if (!aplicarSemillaEfectivo) return result;

  const semilla = INICIO_EFECTIVO_SEED_FECHA;
  if (String(antesDeFecha) < semilla) return result;

  const basePreSemilla = await getInicioCajaPorMetodo(semilla, piso, false);
  const netoPre = netoEfectivoEnResultado(basePreSemilla);
  const netoFull = netoEfectivoEnResultado(result);
  const netoEfectivo = montoInicioEfectivoSeed(piso) + (netoFull - netoPre);
  result['Efectivo'] = { spa: netoEfectivo, boutique: 0, gastos: 0 };

  return result;
}

// ----- Boutique -----
async function insertBoutique(data) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `INSERT INTO ${schema}.venta_boutique (fecha, metodo_pago, monto, piso)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.fecha, data.metodo_pago, data.monto, data.piso || null]
  );
  return rows[0];
}

async function getBoutiquePorFecha(fechaDesde, fechaHasta, piso) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const params = [fechaDesde, fechaHasta];
  let pisoFilter = '';
  if (piso) {
    params.push(piso);
    pisoFilter = ` AND piso = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM ${schema}.venta_boutique
     WHERE fecha >= $1::date AND fecha <= $2::date${pisoFilter}
     ORDER BY fecha DESC, created_at DESC`,
    params
  );
  return rows;
}

async function deleteBoutique(id) {
  const schema = safeSchemaName(process.env.PGSCHEMA || 'prod');
  const { rows } = await pool.query(
    `DELETE FROM ${schema}.venta_boutique WHERE id = $1 RETURNING id`, [id]
  );
  return rows[0] || null;
}

module.exports = {
  pool, ping,
  insertCliente, findClienteByTelefono, updateCliente,
  insertPedido, updatePedido, findPedidosHoyPorTelefono, findPedidosHoyTodosPorTelefono, deletePedido,
  getRazasTamano, getMascotasByTelefono, replaceMascotasForTelefono,
  upsertMascotaBasica, cerrarPedido, purgarPedidosAbiertos, getMascotaById, updateMascotaFotoReferencia,
  getPedidosPorFecha,
  searchMascotasByNombre, getPedidosPorMascota,
  insertGasto, getGastosPorFecha, updateGasto, deleteGasto,
  getInicioCajaPorMetodo,
  insertBoutique, getBoutiquePorFecha, deleteBoutique,
  getAllGroomers, getActiveGroomers, insertGroomer, updateGroomer, toggleGroomerActivo,
  getAllOrigenes, getActiveOrigenes, insertOrigen, updateOrigen, toggleOrigenActivo, deleteOrigen,
  getHojaVidaMascota, getResumenMascotasPorTelefono, getResumenMascotasPorNombre,
  getPedidosEliminados,
};


