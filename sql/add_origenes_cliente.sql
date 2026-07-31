-- Catálogo editable de "Origen del cliente" (¿cómo nos conoció?).
-- Antes la lista estaba fija en public/pedido.js; ahora se administra desde
-- la sección "Orígenes" de la app (/origenes.html), igual que los groomers.
-- La opción "Otros" NO va en la tabla: la app siempre la agrega al final para
-- permitir texto libre.
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

CREATE TABLE IF NOT EXISTS prod.origenes_cliente (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unicidad sin distinguir mayúsculas/acentos de escritura ("whatsapp" = "WhatsApp").
CREATE UNIQUE INDEX IF NOT EXISTS origenes_cliente_nombre_uniq
  ON prod.origenes_cliente (lower(nombre));

COMMENT ON TABLE prod.origenes_cliente IS 'Opciones seleccionables en el campo "Origen del cliente" del pedido. Editables desde /origenes.html.';

-- Semilla con la lista que estaba fija en el código.
-- ON CONFLICT se apoya en el índice único de arriba: no duplica al re-ejecutar.
INSERT INTO prod.origenes_cliente (nombre)
VALUES
  ('WhatsApp'),
  ('Instagram'),
  ('Facebook'),
  ('TikTok'),
  ('Google / Búsqueda web'),
  ('Referido / Recomendación'),
  ('Cliente frecuente'),
  ('Paso por el local (fachada)'),
  ('Publicidad / Volante')
ON CONFLICT DO NOTHING;
