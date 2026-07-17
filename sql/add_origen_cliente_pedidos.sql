-- Origen del cliente en el pedido (¿cómo nos conoció?): WhatsApp, Instagram,
-- Facebook, TikTok, Google, referido, cliente frecuente, etc., o un texto libre ("Otros").
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

ALTER TABLE prod.pedidos
  ADD COLUMN IF NOT EXISTS origen_cliente TEXT;

COMMENT ON COLUMN prod.pedidos.origen_cliente IS 'Canal por el que llegó el cliente (WhatsApp, Instagram, referido, etc.) o texto libre si eligió "Otros". NULL si no se indicó.';
