-- Tag "Tipo Cliente" en el pedido: Antiguo, Nuevo o VIP. Campo OPCIONAL.
-- Sirve para clasificar al cliente en el momento del servicio y explotarlo en BI.
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

ALTER TABLE prod.pedidos
  ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20);

COMMENT ON COLUMN prod.pedidos.tipo_cliente IS 'Clasificación del cliente en el pedido: Antiguo, Nuevo o VIP. NULL si no se indicó (campo opcional).';
