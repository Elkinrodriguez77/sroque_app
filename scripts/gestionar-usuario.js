/**
 * Script para gestionar usuarios del sistema.
 *
 * Comandos disponibles:
 *
 *   node scripts/gestionar-usuario.js crear <username> <password> [nombre]
 *   node scripts/gestionar-usuario.js desactivar <username>
 *   node scripts/gestionar-usuario.js activar <username>
 *   node scripts/gestionar-usuario.js cambiar-clave <username> <nueva_password>
 *   node scripts/gestionar-usuario.js listar
 *
 * Ejemplos:
 *   node scripts/gestionar-usuario.js crear recepcion1 Clave_Segura123 "María"
 *   node scripts/gestionar-usuario.js desactivar recepcion1
 *   node scripts/gestionar-usuario.js activar recepcion1
 *   node scripts/gestionar-usuario.js cambiar-clave recepcion1 NuevaClave456
 *   node scripts/gestionar-usuario.js listar
 */

require('../src/env');
const { createUser, deactivateUser, activateUser, changePassword, listUsers } = require('../src/auth');

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'crear': {
      const [username, password, nombre] = args;
      if (!username || !password) { console.log('Uso: crear <username> <password> [nombre]'); process.exit(1); }
      try {
        const u = await createUser(username, password, nombre || username);
        console.log(`Usuario creado: ${u.username} (${u.nombre}) - ID: ${u.id}`);
      } catch (e) {
        if (e.code === '23505') console.error(`El usuario "${username}" ya existe.`);
        else console.error('Error:', e.message);
        process.exit(1);
      }
      break;
    }
    case 'desactivar': {
      const [username] = args;
      if (!username) { console.log('Uso: desactivar <username>'); process.exit(1); }
      const u = await deactivateUser(username);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`Usuario "${u.username}" DESACTIVADO. Ya no podrá iniciar sesión.`);
      break;
    }
    case 'activar': {
      const [username] = args;
      if (!username) { console.log('Uso: activar <username>'); process.exit(1); }
      const u = await activateUser(username);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`Usuario "${u.username}" ACTIVADO. Puede iniciar sesión nuevamente.`);
      break;
    }
    case 'cambiar-clave': {
      const [username, newPw] = args;
      if (!username || !newPw) { console.log('Uso: cambiar-clave <username> <nueva_password>'); process.exit(1); }
      const u = await changePassword(username, newPw);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`Contraseña de "${u.username}" actualizada exitosamente.`);
      break;
    }
    case 'listar': {
      const users = await listUsers();
      if (users.length === 0) { console.log('No hay usuarios registrados.'); break; }
      console.log('\n  ID | Username         | Nombre               | Activo | Creado');
      console.log('  ---+-----------------+----------------------+--------+-------------------');
      for (const u of users) {
        const date = u.created_at ? new Date(u.created_at).toISOString().slice(0, 16).replace('T', ' ') : '-';
        console.log(`  ${String(u.id).padStart(2)} | ${u.username.padEnd(15)} | ${(u.nombre || '').padEnd(20)} | ${u.activo ? ' SI ' : ' NO '} | ${date}`);
      }
      console.log('');
      break;
    }
    default:
      console.log('Comandos: crear, desactivar, activar, cambiar-clave, listar');
      console.log('Ejecuta sin argumentos o con --help para ver ejemplos.');
      process.exit(1);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
