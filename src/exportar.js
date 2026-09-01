/**
 * Generación de archivos descargables (CSV y Excel) a partir de filas de la base.
 *
 * Decisiones tomadas a propósito:
 *  - CSV con separador ';' y BOM UTF-8: es lo que Excel en español espera. Con
 *    coma y sin BOM, Excel mete todo en una columna y parte los acentos.
 *  - Las fechas ya vienen formateadas como texto en hora de Bogotá desde SQL,
 *    para que Excel no las reinterprete en la zona del equipo.
 */
const ExcelJS = require('exceljs');

/** Etiquetas legibles para el encabezado de cada archivo. */
const TITULOS = {
  id: 'ID',
  pedido_id: 'ID del pedido',
  fecha: 'Fecha',
  fecha_hora: 'Fecha y hora',
  fecha_hora_servicio: 'Fecha y hora del servicio',
  eliminado_el: 'Eliminado el',
  eliminado_por: 'Eliminado por',
  origen_eliminacion: 'Origen de la eliminación',
  motivo: 'Motivo',
  estado_al_borrar: 'Estado al borrar',
  piso: 'Piso',
  telefono_propietario: 'Teléfono propietario',
  telefono_acudiente: 'Teléfono acudiente',
  nombre_propietario: 'Propietario',
  nombre_mascota: 'Mascota',
  mascota_id: 'ID mascota',
  raza: 'Raza',
  tamano: 'Tamaño',
  pelaje: 'Pelaje',
  servicio: 'Servicio',
  precio: 'Precio',
  adicionales_descuentos: 'Adicionales / Descuentos',
  precio_final: 'Precio final',
  metodo_pago: 'Método de pago',
  metodo_pago_1: 'Método de pago 1',
  metodo_pago_2: 'Método de pago 2',
  monto_pago_1: 'Monto pago 1',
  monto_pago_2: 'Monto pago 2',
  groomer1: 'Groomer 1',
  groomer2: 'Groomer 2',
  origen_cliente: 'Origen del cliente',
  tipo_cliente: 'Tipo de cliente',
  estado: 'Estado',
};

/** Columnas que Excel debe tratar como número (para poder sumarlas). */
const COLUMNAS_NUMERICAS = new Set([
  'precio', 'adicionales_descuentos', 'precio_final',
  'monto_pago_1', 'monto_pago_2',
]);

function titulo(clave) {
  return TITULOS[clave] || clave;
}

/** Escapa un valor para CSV: comillas dobles y separadores dentro del texto. */
function celdaCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[";\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/**
 * Arma un CSV listo para abrir en Excel.
 * @returns {Buffer}
 */
function generarCsv(filas) {
  if (!filas.length) return Buffer.from('﻿', 'utf8');
  const claves = Object.keys(filas[0]);
  const lineas = [claves.map((k) => celdaCsv(titulo(k))).join(';')];
  for (const fila of filas) {
    lineas.push(claves.map((k) => celdaCsv(fila[k])).join(';'));
  }
  // El BOM le dice a Excel que el archivo es UTF-8 y respete las tildes.
  return Buffer.from('﻿' + lineas.join('\r\n'), 'utf8');
}

/**
 * Arma un .xlsx real: números como números, encabezado fijo y filtros.
 * @returns {Promise<Buffer>}
 */
async function generarExcel(filas, nombreHoja) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'San Roque';
  libro.created = new Date();
  const hoja = libro.addWorksheet(nombreHoja.slice(0, 31));

  if (!filas.length) {
    hoja.addRow(['Sin datos para el rango seleccionado']);
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  const claves = Object.keys(filas[0]);
  hoja.columns = claves.map((k) => ({
    header: titulo(k),
    key: k,
    width: Math.min(38, Math.max(12, titulo(k).length + 4)),
  }));

  for (const fila of filas) {
    const salida = {};
    for (const k of claves) {
      const v = fila[k];
      salida[k] = COLUMNAS_NUMERICAS.has(k) && v !== null && v !== undefined && v !== ''
        ? Number(v)
        : v;
    }
    hoja.addRow(salida);
  }

  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  cabecera.alignment = { vertical: 'middle' };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: claves.length } };

  for (const k of COLUMNAS_NUMERICAS) {
    const i = claves.indexOf(k);
    if (i >= 0) hoja.getColumn(i + 1).numFmt = '#,##0';
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Nombre de archivo sin caracteres problemáticos. */
function nombreArchivo(base, desde, hasta, extension) {
  const limpio = String(base).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${limpio}_${desde}_a_${hasta}.${extension}`;
}

module.exports = { generarCsv, generarExcel, nombreArchivo };
