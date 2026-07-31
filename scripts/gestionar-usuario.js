/**
 * Script para gestionar usuarios del sistema.
 *
 * Comandos disponibles:
 *
 *   node scripts/gestionar-usuario.js crear <username> [password] [nombre]
 *   node scripts/gestionar-usuario.js crear-owner <username> [password] [nombre]
 *   node scripts/gestionar-usuario.js desactivar <username>
 *   node scripts/gestionar-usuario.js activar <username>
 *   node scripts/gestionar-usuario.js cambiar-clave <username> [nueva_password]
 *   node scripts/gestionar-usuario.js forzar-cambio <username>
 *   node scripts/gestionar-usuario.js rol <username> <owner|user>
 *   node scripts/gestionar-usuario.js listar
 *
 * IMPORTANTE — la contraseña:
 *   Si OMITES el password, el script te lo pide por teclado sin mostrarlo en
 *   pantalla y te lo hace confirmar. Esa es la forma recomendada: así la clave
 *   no queda en el historial de la terminal ni a la vista de nadie.
 *   La contraseña NUNCA se guarda en un archivo: viaja cifrada (bcrypt) a la
 *   base de datos, por lo que no hay nada que pueda quedar expuesto en Git.
 *
 * Notas de seguridad:
 *   - "crear"       -> cuenta operativa: la contraseña caduca cada 90 días
 *                      (configurable con la variable PASSWORD_MAX_DIAS).
 *   - "crear-owner" -> cuenta de dueño: ve todo y su contraseña NO caduca nunca.
 *   - "forzar-cambio" obliga a definir clave nueva en el próximo ingreso.
 *
 * Ejemplos (recomendados, sin escribir la clave en el comando):
 *   node scripts/gestionar-usuario.js crear-owner elkin_owner "" "Elkin Rodríguez"
 *   node scripts/gestionar-usuario.js crear recepcion1
 *   node scripts/gestionar-usuario.js cambiar-clave recepcion1
 *   node scripts/gestionar-usuario.js forzar-cambio recepcion1
 *   node scripts/gestionar-usuario.js listar
 */

require('../src/env');
const readline = require('readline');
const {
  createUser, deactivateUser, activateUser, changePassword, listUsers,
  forcePasswordChange, setUserRol, validarPassword, ROL_OWNER, PASSWORD_MAX_DIAS,
} = require('../src/auth');

const [,, command, ...args] = process.argv;

/**
 * Pide la contraseña por teclado SIN mostrarla en pantalla. Es la forma segura:
 * al no pasarla como argumento, no queda registrada en el historial de la
 * terminal ni visible para quien mire la pantalla.
 */
function pedirPasswordOculta(mensaje) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      // Reescribe la línea ocultando lo tecleado mientras se escribe.
      if (['\n', '\r', ''].includes(String(char))) return;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(mensaje);
    };
    process.stdin.on('data', onData);
    rl.question(mensaje, (valor) => {
      process.stdin.removeListener('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(valor);
    });
  });
}

/**
 * Obtiene la contraseña: si no vino como argumento la pide oculta por teclado
 * y exige confirmarla. Devuelve null si no coinciden.
 */
async function obtenerPassword(passwordArg) {
  if (passwordArg) return passwordArg;
  const pw1 = await pedirPasswordOculta('Contraseña nueva: ');
  const pw2 = await pedirPasswordOculta('Confirmar contraseña: ');
  if (pw1 !== pw2) {
    console.error('Las contraseñas no coinciden. No se hizo ningún cambio.');
    return null;
  }
  return pw1;
}

/** Corta el proceso si la contraseña no cumple las reglas mínimas. */
function exigirPasswordValida(password, username) {
  const errores = validarPassword(password, username);
  if (errores.length) {
    console.error('La contraseña no cumple los requisitos:');
    for (const e of errores) console.error(`  - ${e}`);
    process.exit(1);
  }
}

function fmtFecha(v) {
  if (!v) return 'nunca';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'nunca' : d.toISOString().slice(0, 10);
}

async function main() {
  switch (command) {
    case 'crear': {
      const [username, passwordArg, nombre] = args;
      if (!username) { console.log('Uso: crear <username> [password] [nombre]'); process.exit(1); }
      const password = await obtenerPassword(passwordArg);
      if (!password) process.exit(1);
      exigirPasswordValida(password, username);
      try {
        const u = await createUser(username, password, nombre || username, 'user');
        console.log(`Usuario creado: ${u.username} (${u.nombre}) - ID: ${u.id}`);
        console.log(`Rol: user. La contraseña caduca el ${fmtFecha(u.password_expires_at)} (${PASSWORD_MAX_DIAS} días).`);
      } catch (e) {
        if (e.code === '23505') console.error(`El usuario "${username}" ya existe.`);
        else console.error('Error:', e.message);
        process.exit(1);
      }
      break;
    }
    case 'crear-owner': {
      const [username, passwordArg, nombre] = args;
      if (!username) { console.log('Uso: crear-owner <username> [password] [nombre]'); process.exit(1); }
      const password = await obtenerPassword(passwordArg);
      if (!password) process.exit(1);
      exigirPasswordValida(password, username);
      try {
        const u = await createUser(username, password, nombre || username, ROL_OWNER);
        console.log(`Usuario DUEÑO creado: ${u.username} (${u.nombre}) - ID: ${u.id}`);
        console.log('Rol: owner. Ve todos los módulos y su contraseña NO caduca nunca.');
      } catch (e) {
        if (e.code === '23505') console.error(`El usuario "${username}" ya existe. Usa: rol ${username} owner`);
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
      const [username, newPwArg] = args;
      if (!username) { console.log('Uso: cambiar-clave <username> [nueva_password]'); process.exit(1); }
      const newPw = await obtenerPassword(newPwArg);
      if (!newPw) process.exit(1);
      exigirPasswordValida(newPw, username);
      const u = await changePassword(username, newPw);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`Contraseña de "${u.username}" actualizada exitosamente.`);
      console.log(`Caduca el ${fmtFecha(u.password_expires_at)}.`);
      break;
    }
    case 'forzar-cambio': {
      const [username] = args;
      if (!username) { console.log('Uso: forzar-cambio <username>'); process.exit(1); }
      const u = await forcePasswordChange(username);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`"${u.username}" deberá definir una contraseña nueva en su próximo ingreso.`);
      break;
    }
    case 'rol': {
      const [username, rol] = args;
      if (!username || !['owner', 'user'].includes(rol)) {
        console.log('Uso: rol <username> <owner|user>');
        process.exit(1);
      }
      const u = await setUserRol(username, rol);
      if (!u) { console.error(`Usuario "${username}" no encontrado.`); process.exit(1); }
      console.log(`Rol de "${u.username}" ahora es: ${u.rol}.`);
      if (u.rol === ROL_OWNER) console.log('Su contraseña ya no caduca y ve todos los módulos.');
      break;
    }
    case 'listar': {
      const users = await listUsers();
      if (users.length === 0) { console.log('No hay usuarios registrados.'); break; }
      console.log('\n  ID | Username         | Nombre               | Rol   | Activo | Clave caduca | Cambio obligado');
      console.log('  ---+------------------+----------------------+-------+--------+--------------+----------------');
      for (const u of users) {
        console.log(
          `  ${String(u.id).padStart(2)} | ${u.username.padEnd(16)} | ${(u.nombre || '').padEnd(20)} | ` +
          `${String(u.rol || 'user').padEnd(5)} | ${u.activo ? ' SI   ' : ' NO   '} | ` +
          `${fmtFecha(u.password_expires_at).padEnd(12)} | ${u.must_change_password ? 'SI' : 'no'}`
        );
      }
      console.log('');
      break;
    }
    default:
      console.log('Comandos: crear, crear-owner, desactivar, activar, cambiar-clave, forzar-cambio, rol, listar');
      console.log('Abre el archivo para ver ejemplos de uso.');
      process.exit(1);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
