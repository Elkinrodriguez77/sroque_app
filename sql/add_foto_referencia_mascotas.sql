-- Foto de referencia post-servicio (archivo en disco; aquí solo el nombre del archivo).
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

ALTER TABLE prod.mascotas
  ADD COLUMN IF NOT EXISTS foto_referencia TEXT;

COMMENT ON COLUMN prod.mascotas.foto_referencia IS 'Nombre de archivo en data/uploads/mascotas (ej. uuid.webp). NULL si no hay foto.';
