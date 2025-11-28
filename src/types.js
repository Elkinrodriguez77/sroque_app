function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(v)) return true;
    if (['false', '0', 'no'].includes(v)) return false;
  }
  return undefined;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function sanitizeClienteInput(input) {
  const es_propietario = toBoolean(input.es_propietario);
  const autorizacion_tratamiento_datos = toBoolean(input.autorizacion_tratamiento_datos);

  return {
    es_propietario,
    telefono_propietario: input.telefono_propietario ? String(input.telefono_propietario).trim() : '',
    telefono_acudiente: input.telefono_acudiente ? String(input.telefono_acudiente).trim() : undefined,
    nombre_propietario: input.nombre_propietario ? String(input.nombre_propietario).trim() : '',
    nombre_acudiente: input.nombre_acudiente ? String(input.nombre_acudiente).trim() : undefined,
    email: input.email ? String(input.email).trim() : undefined,
    perfil_instagram: input.perfil_instagram ? String(input.perfil_instagram).trim() : undefined,
    direccion: input.direccion ? String(input.direccion).trim() : undefined,
    autorizacion_tratamiento_datos,
  };
}

function validateCliente(cliente) {
  const errors = [];
  if (cliente.es_propietario !== true && cliente.es_propietario !== false) {
    errors.push('es_propietario es requerido');
  }
  if (!cliente.telefono_propietario) {
    errors.push('telefono_propietario es requerido');
  }
   if (!cliente.nombre_propietario) {
     errors.push('nombre_propietario es requerido');
   }
  if (cliente.es_propietario === false && !cliente.telefono_acudiente) {
    errors.push('telefono_acudiente es requerido si no es propietario');
  }
  if (cliente.autorizacion_tratamiento_datos !== true && cliente.autorizacion_tratamiento_datos !== false) {
    errors.push('autorizacion_tratamiento_datos es requerido');
  }
  return errors;
}

module.exports = {
  sanitizeClienteInput,
  validateCliente,
};

// -------- Pedidos --------
function toNumberOrZero(value) {
  if (value === '' || value === undefined || value === null) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function sanitizePedidoInput(input) {
  const { DateTime } = require('luxon');
  const nowBogota = DateTime.now().setZone('America/Bogota');
  return {
    telefono_propietario: input.telefono_propietario ? String(input.telefono_propietario).trim() : '',
    telefono_acudiente: input.telefono_acudiente ? String(input.telefono_acudiente).trim() : undefined,
    fecha_hora: input.fecha_hora ? new Date(input.fecha_hora).toISOString() : nowBogota.toISO(),
    raza: input.raza ? String(input.raza).trim() : undefined,
    tamano: input.tamano ? String(input.tamano).trim() : undefined,
    pelaje: input.pelaje ? String(input.pelaje).trim() : undefined,
    servicio: input.servicio ? String(input.servicio).trim() : '',
    precio: toNumberOrZero(input.precio),
    adicionales_descuentos: toNumberOrZero(input.adicionales_descuentos),
    metodo_pago: input.metodo_pago ? String(input.metodo_pago).trim() : undefined,
    groomer1: input.groomer1 ? String(input.groomer1).trim() : undefined,
    groomer2: input.groomer2 ? String(input.groomer2).trim() : undefined,
  };
}

function validatePedido(pedido) {
  const errors = [];
  if (!pedido.telefono_propietario) errors.push('telefono_propietario es requerido');
  if (!pedido.servicio) errors.push('servicio es requerido');
  return errors;
}

module.exports.sanitizePedidoInput = sanitizePedidoInput;
module.exports.validatePedido = validatePedido;


