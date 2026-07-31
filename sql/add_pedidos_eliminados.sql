-- Auditoría de pedidos eliminados.
--
-- Antes, borrar un pedido (manualmente o por la purga automática de abiertos)
-- no dejaba rastro. Esta tabla guarda una COPIA COMPLETA del pedido antes de
-- borrarlo, junto con el motivo, quién lo hizo y cómo se originó el borrado.
--
-- Se consulta directo desde pgAdmin:
--   SELECT * FROM prod.pedidos_eliminados ORDER BY eliminado_at DESC;
--
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

CREATE TABLE IF NOT EXISTS prod.pedidos_eliminados (
  id BIGSERIAL PRIMARY KEY,

  -- Trazabilidad del borrado
  pedido_id BIGINT,
  motivo TEXT,
  eliminado_por VARCHAR(100),
  origen_eliminacion VARCHAR(30) NOT NULL DEFAULT 'manual',
  eliminado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Copia de los campos clave del pedido (legibles sin abrir el JSON)
  telefono_propietario VARCHAR(20),
  fecha_hora TIMESTAMPTZ,
  piso VARCHAR(20),
  nombre_mascota VARCHAR(200),
  raza VARCHAR(100),
  servicio VARCHAR(200),
  groomer1 VARCHAR(200),
  groomer2 VARCHAR(200),
  precio NUMERIC(12,2),
  adicionales_descuentos NUMERIC(12,2),
  precio_final NUMERIC(12,2),
  metodo_pago VARCHAR(50),
  cerrado BOOLEAN,

  -- Copia íntegra del registro original, por si algún día se agregan columnas
  datos JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS pedidos_eliminados_fecha_idx
  ON prod.pedidos_eliminados (eliminado_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_eliminados_pedido_idx
  ON prod.pedidos_eliminados (pedido_id);
CREATE INDEX IF NOT EXISTS pedidos_eliminados_origen_idx
  ON prod.pedidos_eliminados (origen_eliminacion);

COMMENT ON TABLE prod.pedidos_eliminados IS 'Auditoría: copia de cada pedido antes de ser eliminado, con motivo y responsable.';
COMMENT ON COLUMN prod.pedidos_eliminados.origen_eliminacion IS 'manual = lo borró un usuario desde la app | purga_automatica = limpieza de pedidos abiertos de jornadas pasadas.';
COMMENT ON COLUMN prod.pedidos_eliminados.motivo IS 'Razón indicada por el usuario al borrar. En la purga automática lo escribe el sistema.';
COMMENT ON COLUMN prod.pedidos_eliminados.datos IS 'Fila completa del pedido original en JSON, incluidas columnas futuras.';
