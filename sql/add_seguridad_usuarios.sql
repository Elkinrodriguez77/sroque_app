-- Endurecimiento de cuentas: caducidad de contraseñas y rol de propietario.
--
-- Contexto: el spa rota de administradores con frecuencia y quedaban cuentas
-- con contraseñas por defecto vigentes de forma indefinida.
--
-- Reglas que implementa la app:
--   * rol = 'owner'  -> la contraseña NUNCA caduca (cuenta del dueño).
--   * rol = 'user'   -> caduca cada PASSWORD_MAX_DIAS (90 por defecto).
--   * password_expires_at NULL = no caduca.
--   * must_change_password = true obliga a cambiarla en el próximo ingreso,
--     sin importar la fecha de caducidad.
--
-- Ejecutar una vez contra la base (esquema prod o el que uses en PGSCHEMA).

ALTER TABLE prod.usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE prod.usuarios
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE prod.usuarios
  ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;

ALTER TABLE prod.usuarios
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN prod.usuarios.rol IS 'owner = dueño (ve todo, contraseña sin caducidad) | user = operativo (contraseña caduca).';
COMMENT ON COLUMN prod.usuarios.password_expires_at IS 'Fecha en que caduca la contraseña. NULL = no caduca (cuentas owner).';
COMMENT ON COLUMN prod.usuarios.must_change_password IS 'true = el usuario debe definir una contraseña nueva antes de usar la app.';

-- Periodo de gracia: las cuentas que ya existen (posibles claves por defecto)
-- siguen funcionando 7 días; pasado ese plazo el sistema exige cambiarla.
UPDATE prod.usuarios
SET password_expires_at = NOW() + INTERVAL '7 days'
WHERE password_expires_at IS NULL
  AND rol <> 'owner';
