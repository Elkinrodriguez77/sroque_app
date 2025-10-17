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
  const alergias = toBoolean(input.alergias);

  return {
    es_propietario,
    telefono_propietario: input.telefono_propietario ? String(input.telefono_propietario).trim() : '',
    telefono_acudiente: input.telefono_acudiente ? String(input.telefono_acudiente).trim() : undefined,
    email: input.email ? String(input.email).trim() : undefined,
    perfil_instagram: input.perfil_instagram ? String(input.perfil_instagram).trim() : undefined,
    direccion: input.direccion ? String(input.direccion).trim() : undefined,
    alimento_mascota: input.alimento_mascota ? String(input.alimento_mascota).trim() : undefined,
    nombre_mascota: input.nombre_mascota ? String(input.nombre_mascota).trim() : undefined,
    fecha_nacimiento: toDateOrNull(input.fecha_nacimiento),
    fecha_antipulgas: toDateOrNull(input.fecha_antipulgas),
    producto_antipulgas: input.producto_antipulgas ? String(input.producto_antipulgas).trim() : undefined,
    fecha_antiparasitario: toDateOrNull(input.fecha_antiparasitario),
    producto_antiparasitario: input.producto_antiparasitario ? String(input.producto_antiparasitario).trim() : undefined,
    alergias: alergias === undefined ? null : alergias,
    observaciones: input.observaciones ? String(input.observaciones).trim() : undefined,
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


