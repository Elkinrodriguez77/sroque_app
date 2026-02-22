require('../src/env');
const { insertGroomer } = require('../src/db');

async function main() {
  const groomers = [
    { documento: '1098765432', nombre: 'Katherine', apellido: 'Moreno' },
    { documento: '1012345678', nombre: 'Felipe', apellido: 'Bautista' },
  ];
  for (const g of groomers) {
    try {
      const created = await insertGroomer(g);
      console.log(`Creado: ${created.nombre} ${created.apellido} (Doc: ${created.documento})`);
    } catch (e) {
      if (e.code === '23505') console.log(`Ya existe: ${g.nombre} ${g.apellido}`);
      else console.error(`Error con ${g.nombre}:`, e.message);
    }
  }
  process.exit(0);
}

main();
