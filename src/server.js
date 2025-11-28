const express = require('express');
const path = require('path');
require('./env');
const {
  insertCliente,
  ping,
  findClienteByTelefono,
  updateCliente,
  getRazasTamano,
  findPedidosHoyPorTelefono,
  insertPedido,
  updatePedido,
  getMascotasByTelefono,
  replaceMascotasForTelefono,
} = require('./db');
const { sanitizeClienteInput, validateCliente, sanitizePedidoInput, validatePedido } = require('./types');


const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/db-health', async (req, res) => {
  try {
    const r = await ping();
    res.json({ ok: true, db: r });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Catálogos
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
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, errors });
    }

    const created = await insertCliente(sanitized);
    const mascotas = Array.isArray(req.body.mascotas) ? req.body.mascotas : [];
    if (sanitized.telefono_propietario && mascotas.length) {
      await replaceMascotasForTelefono(sanitized.telefono_propietario, mascotas);
    }
    res.status(201).json({ ok: true, id: created.id });
  } catch (err) {
    // Log detallado en servidor para debug
    console.error('Insert cliente error:', {
      message: err && err.message,
      code: err && err.code,
      detail: err && err.detail,
      constraint: err && err.constraint,
    });
    if (err && err.code === '23505') {
      return res.status(409).json({ ok: false, errors: ['telefono_propietario ya existe'] });
    }
    console.error('Error creando cliente:', err);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, errors: ['id inválido'] });
    const sanitized = sanitizeClienteInput(req.body);
    const errors = validateCliente(sanitized);
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, errors });
    }
    const updated = await updateCliente(id, sanitized);
    const mascotas = Array.isArray(req.body.mascotas) ? req.body.mascotas : [];
    if (sanitized.telefono_propietario) {
      await replaceMascotasForTelefono(sanitized.telefono_propietario, mascotas);
    }
    res.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error('Update cliente error:', {
      message: err && err.message,
      code: err && err.code,
      detail: err && err.detail,
      constraint: err && err.constraint,
    });
    if (err && err.code === '23505') {
      return res.status(409).json({ ok: false, errors: ['telefono_propietario ya existe'] });
    }
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

// -------- Pedidos --------
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
    const updated = await updatePedido(id, sanitized);
    res.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error('Update pedido error:', e);
    res.status(500).json({ ok: false, errors: ['Error interno del servidor'] });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});


