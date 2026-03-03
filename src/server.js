const express = require('express');
const path = require('path');
const session = require('express-session');
require('./env');

const {
  insertCliente, ping, findClienteByTelefono, updateCliente,
  getRazasTamano, findPedidosHoyPorTelefono, insertPedido, updatePedido,
  getMascotasByTelefono, replaceMascotasForTelefono, upsertMascotaBasica, cerrarPedido,
  getPedidosPorFecha,
  searchMascotasByNombre, getPedidosPorMascota,
  insertGasto, getGastosPorFecha, updateGasto, deleteGasto,
  getInicioCajaPorMetodo,
  insertBoutique, getBoutiquePorFecha, deleteBoutique,
  getAllGroomers, getActiveGroomers, insertGroomer, updateGroomer, toggleGroomerActivo,
} = require('./db');
const { sanitizeClienteInput, validateCliente, sanitizePedidoInput, validatePedido, sanitizeGastoInput, validateGasto } = require('./types');
const { findUserByUsername, verifyPassword, requireAuth, loginRateLimiter, recordFailedAttempt, clearAttempts } = require('./auth');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'sanroque-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// --- Rutas públicas (login, assets) ---
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/login.css', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.js')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'styles.css')));

app.post('/api/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, errors: ['Usuario y contraseña requeridos'] });
    const user = await findUserByUsername(String(username).trim());
    if (!user) {
      recordFailedAttempt(req);
      return res.status(401).json({ ok: false, errors: ['Credenciales inválidas'] });
    }
    if (user.activo === false) {
      return res.status(403).json({ ok: false, errors: ['Tu cuenta ha sido desactivada. Contacta al administrador.'] });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      recordFailedAttempt(req);
      return res.status(401).json({ ok: false, errors: ['Credenciales inválidas'] });
    }
    clearAttempts(req);
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nombre = user.nombre;
    res.json({ ok: true, nombre: user.nombre });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ ok: true, nombre: req.session.nombre, username: req.session.username });
  }
  res.status(401).json({ ok: false });
});

// --- Todo lo demás requiere autenticación ---
app.use(requireAuth);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/db-health', async (req, res) => {
  try {
    const r = await ping();
    res.json({ ok: true, db: r });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/catalogos/raza-tamano', async (req, res) => {
  try {
    const data = await getRazasTamano();
    res.json({ ok: true, data });
  } catch (e) {
    console.error('Catálogo raza-tamano error:', e);
    res.status(500).json({ ok: false, errors: ['No se pudo cargar catálogo'] });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const tel = String(req.query.telefono || '').trim();
    if (!tel) return res.status(400).json({ ok: false, errors: ['telefono es requerido'] });
    const cliente = await findClienteByTelefono(tel);
    if (!cliente) return res.status(404).json({ ok: false, data: null });
    const mascotas = await getMascotasByTelefono(tel);
    res.json({ ok: true, data: { ...cliente, mascotas } });
  } catch (e) {
    console.error('Lookup cliente error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const sanitized = sanitizeClienteInput(req.body);
    const errors = validateCliente(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    const created = await insertCliente(sanitized);
    const mascotas = Array.isArray(req.body.mascotas) ? req.body.mascotas : [];
    if (sanitized.telefono_propietario && mascotas.length) {
      await replaceMascotasForTelefono(sanitized.telefono_propietario, mascotas);
    }
    res.status(201).json({ ok: true, id: created.id });
  } catch (err) {
    console.error('Insert cliente error:', { message: err?.message, code: err?.code, detail: err?.detail, constraint: err?.constraint });
    if (err?.code === '23505') return res.status(409).json({ ok: false, errors: ['telefono_propietario ya existe'] });
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const sanitized = sanitizeClienteInput(req.body);
    const errors = validateCliente(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    const updated = await updateCliente(id, sanitized);
    const mascotas = Array.isArray(req.body.mascotas) ? req.body.mascotas : [];
    if (sanitized.telefono_propietario) await replaceMascotasForTelefono(sanitized.telefono_propietario, mascotas);
    res.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error('Update cliente error:', { message: err?.message, code: err?.code, detail: err?.detail, constraint: err?.constraint });
    if (err?.code === '23505') return res.status(409).json({ ok: false, errors: ['telefono_propietario ya existe'] });
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const tel = String(req.query.telefono || '').trim();
    if (!tel) return res.status(400).json({ ok: false, errors: ['telefono es requerido'] });
    const rows = await findPedidosHoyPorTelefono(tel);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Get pedidos error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.post('/api/pedidos', async (req, res) => {
  try {
    const sanitized = sanitizePedidoInput(req.body);
    const errors = validatePedido(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    if (sanitized.telefono_propietario && sanitized.nombre_mascota) {
      const m = await upsertMascotaBasica({
        telefono_propietario: sanitized.telefono_propietario,
        mascota_id: sanitized.mascota_id, nombre_mascota: sanitized.nombre_mascota,
        raza: sanitized.raza, tamano: sanitized.tamano, pelaje: sanitized.pelaje,
      });
      if (m) {
        sanitized.mascota_id = m.id; sanitized.nombre_mascota = m.nombre_mascota;
        sanitized.raza = sanitized.raza || m.raza; sanitized.tamano = sanitized.tamano || m.tamano; sanitized.pelaje = sanitized.pelaje || m.pelaje;
      }
    }
    const created = await insertPedido(sanitized);
    res.status(201).json({ ok: true, id: created.id });
  } catch (e) {
    console.error('Insert pedido error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.put('/api/pedidos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const sanitized = sanitizePedidoInput(req.body);
    const errors = validatePedido(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    if (sanitized.telefono_propietario && sanitized.nombre_mascota) {
      const m = await upsertMascotaBasica({
        telefono_propietario: sanitized.telefono_propietario,
        mascota_id: sanitized.mascota_id, nombre_mascota: sanitized.nombre_mascota,
        raza: sanitized.raza, tamano: sanitized.tamano, pelaje: sanitized.pelaje,
      });
      if (m) {
        sanitized.mascota_id = m.id; sanitized.nombre_mascota = m.nombre_mascota;
        sanitized.raza = sanitized.raza || m.raza; sanitized.tamano = sanitized.tamano || m.tamano; sanitized.pelaje = sanitized.pelaje || m.pelaje;
      }
    }
    const updated = await updatePedido(id, sanitized);
    res.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error('Update pedido error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.get('/api/mascotas', async (req, res) => {
  try {
    const tel = String(req.query.telefono || '').trim();
    if (!tel) return res.status(400).json({ ok: false, errors: ['telefono es requerido'] });
    const mascotas = await getMascotasByTelefono(tel);
    res.json({ ok: true, data: mascotas });
  } catch (e) {
    console.error('Get mascotas error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.post('/api/pedidos/:id/cerrar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const updated = await cerrarPedido(id);
    if (!updated) return res.status(404).json({ ok: false, errors: ['pedido no encontrado'] });
    res.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error('Cerrar pedido error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

// -------- Dashboard --------
app.get('/api/dashboard/pedidos', async (req, res) => {
  try {
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const estado = req.query.estado || 'cerrados';
    const piso = req.query.piso || '';
    if (!desde || !hasta) return res.status(400).json({ ok: false, errors: ['desde y hasta son requeridos'] });
    const rows = await getPedidosPorFecha(desde, hasta, estado, piso);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

// -------- Histórico CSV (datos Excel) --------
const fs = require('fs');
let csvHistorico = [];
(function loadCSV() {
  try {
    const csvPath = path.join(__dirname, '..', 'recursos', 'datos_historicos.csv');
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';');
      if (cols.length < 5) continue;
      const [fechaRaw, nombre_mascota, nombre_propietario, servicio, telefono] = cols;
      const parts = fechaRaw.split('/');
      let fechaISO = fechaRaw;
      if (parts.length === 3) {
        fechaISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      csvHistorico.push({ fecha: fechaISO, nombre_mascota: nombre_mascota.trim(), nombre_propietario: nombre_propietario.trim(), servicio: servicio.trim(), telefono: telefono.trim() });
    }
    csvHistorico.sort((a, b) => b.fecha.localeCompare(a.fecha));
    console.log(`CSV histórico cargado: ${csvHistorico.length} registros`);
  } catch (e) {
    console.warn('No se pudo cargar CSV histórico:', e.message);
  }
})();

app.get('/api/historico/buscar-mascotas', (req, res) => {
  const nombre = (req.query.nombre || '').trim().toLowerCase();
  if (!nombre) return res.status(400).json({ ok: false, errors: ['nombre es requerido'] });
  const seen = new Map();
  for (const r of csvHistorico) {
    if (r.nombre_mascota.toLowerCase().includes(nombre)) {
      const key = `${r.nombre_mascota}|${r.telefono}`;
      if (!seen.has(key)) {
        seen.set(key, { nombre_mascota: r.nombre_mascota, nombre_propietario: r.nombre_propietario, telefono: r.telefono });
      }
    }
  }
  res.json({ ok: true, data: Array.from(seen.values()) });
});

app.get('/api/historico/servicios', (req, res) => {
  const mascota = (req.query.mascota || '').trim();
  const tel = (req.query.telefono || '').trim();
  if (!mascota || !tel) return res.status(400).json({ ok: false, errors: ['mascota y telefono son requeridos'] });
  const rows = csvHistorico.filter(r => r.nombre_mascota === mascota && r.telefono === tel);
  res.json({ ok: true, data: rows });
});

// -------- Servicios (historial por mascota) --------
app.get('/api/servicios/buscar-mascotas', async (req, res) => {
  try {
    const nombre = req.query.nombre;
    if (!nombre || !String(nombre).trim()) return res.status(400).json({ ok: false, errors: ['nombre es requerido'] });
    const rows = await searchMascotasByNombre(nombre);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Buscar mascotas error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.get('/api/servicios/pedidos/:mascotaId', async (req, res) => {
  try {
    const mascotaId = Number(req.params.mascotaId);
    if (!mascotaId) return res.status(400).json({ ok: false, errors: ['mascota_id inválido'] });
    const rows = await getPedidosPorMascota(mascotaId);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Pedidos por mascota error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

// -------- Gastos --------
app.get('/api/gastos', async (req, res) => {
  try {
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const piso = req.query.piso || '';
    if (!desde || !hasta) return res.status(400).json({ ok: false, errors: ['desde y hasta son requeridos'] });
    const rows = await getGastosPorFecha(desde, hasta, piso);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Get gastos error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.post('/api/gastos', async (req, res) => {
  try {
    const sanitized = sanitizeGastoInput(req.body);
    const errors = validateGasto(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    const created = await insertGasto(sanitized);
    res.status(201).json({ ok: true, data: created });
  } catch (e) {
    console.error('Insert gasto error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.put('/api/gastos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const sanitized = sanitizeGastoInput(req.body);
    const errors = validateGasto(sanitized);
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    const updated = await updateGasto(id, sanitized);
    if (!updated) return res.status(404).json({ ok: false, errors: ['Gasto no encontrado'] });
    res.json({ ok: true, data: updated });
  } catch (e) {
    console.error('Update gasto error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const deleted = await deleteGasto(id);
    if (!deleted) return res.status(404).json({ ok: false, errors: ['Gasto no encontrado'] });
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete gasto error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

// -------- Inicio de Caja --------
app.get('/api/cierre/inicio-caja', async (req, res) => {
  try {
    const antes = req.query.antes;
    const piso = req.query.piso || '';
    if (!antes) return res.status(400).json({ ok: false, errors: ['antes es requerido'] });
    const detalle = await getInicioCajaPorMetodo(antes, piso);
    res.json({ ok: true, data: detalle });
  } catch (e) {
    console.error('Inicio caja error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

// -------- Boutique --------
app.get('/api/boutique', async (req, res) => {
  try {
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const piso = req.query.piso || '';
    if (!desde || !hasta) return res.status(400).json({ ok: false, errors: ['desde y hasta son requeridos'] });
    const rows = await getBoutiquePorFecha(desde, hasta, piso);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Get boutique error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.post('/api/boutique', async (req, res) => {
  try {
    const { fecha, metodo_pago, monto, piso } = req.body;
    const errors = [];
    if (!fecha) errors.push('Fecha es requerida');
    if (!metodo_pago) errors.push('Método de pago es requerido');
    if (!monto || Number(monto) <= 0) errors.push('Monto debe ser mayor a 0');
    if (errors.length > 0) return res.status(400).json({ ok: false, errors });
    const created = await insertBoutique({ fecha, metodo_pago, monto: Number(monto), piso: piso || null });
    res.status(201).json({ ok: true, data: created });
  } catch (e) {
    console.error('Insert boutique error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.delete('/api/boutique/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const deleted = await deleteBoutique(id);
    if (!deleted) return res.status(404).json({ ok: false, errors: ['Registro no encontrado'] });
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete boutique error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

// -------- Groomers --------
app.get('/api/groomers', async (req, res) => {
  try {
    const rows = await getAllGroomers();
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Get groomers error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.get('/api/groomers/activos', async (req, res) => {
  try {
    const rows = await getActiveGroomers();
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('Get active groomers error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.post('/api/groomers', async (req, res) => {
  try {
    const { documento, nombre, apellido } = req.body;
    if (!documento || !nombre || !apellido) {
      return res.status(400).json({ ok: false, errors: ['Documento, nombre y apellido son requeridos'] });
    }
    const created = await insertGroomer({ documento: String(documento).trim(), nombre: String(nombre).trim(), apellido: String(apellido).trim() });
    res.status(201).json({ ok: true, data: created });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ ok: false, errors: ['Ya existe un groomer con ese documento'] });
    console.error('Insert groomer error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.put('/api/groomers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const { documento, nombre, apellido } = req.body;
    if (!documento || !nombre || !apellido) {
      return res.status(400).json({ ok: false, errors: ['Documento, nombre y apellido son requeridos'] });
    }
    const updated = await updateGroomer(id, { documento: String(documento).trim(), nombre: String(nombre).trim(), apellido: String(apellido).trim() });
    if (!updated) return res.status(404).json({ ok: false, errors: ['Groomer no encontrado'] });
    res.json({ ok: true, data: updated });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ ok: false, errors: ['Ya existe un groomer con ese documento'] });
    console.error('Update groomer error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.patch('/api/groomers/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const { activo } = req.body;
    if (typeof activo !== 'boolean') return res.status(400).json({ ok: false, errors: ['activo debe ser true o false'] });
    const updated = await toggleGroomerActivo(id, activo);
    if (!updated) return res.status(404).json({ ok: false, errors: ['Groomer no encontrado'] });
    res.json({ ok: true, data: updated });
  } catch (e) {
    console.error('Toggle groomer error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno'] });
  }
});

app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
