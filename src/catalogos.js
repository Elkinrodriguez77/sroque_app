const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function readRazaTamanoFromExcel() {
  const excelPath = path.resolve(process.cwd(), 'recursos/raza_tamaño.xlsx');
  if (!fs.existsSync(excelPath)) {
    return { razas: [], mapping: {} };
  }
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // Espera columnas: [raza, tamano]
  const mapping = {};
  const razas = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const raza = String(row[0] || '').trim();
    const tam = String(row[1] || '').trim();
    if (!raza) continue;
    razas.push(raza);
    if (tam) mapping[raza] = tam;
  }
  return { razas, mapping };
}

module.exports = {
  readRazaTamanoFromExcel,
};


