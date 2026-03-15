-- Migracion: mejoras para citas (defaults, timestamps, indices)
-- Fecha: 2026-03-15
-- Base: hospital_db
--
-- Nota:
-- - Si tu tabla `citas` ya tiene datos con NULLs, revisa antes de convertir a NOT NULL.
-- - Ejecuta en MySQL Workbench: File > Open SQL Script..., luego el boton del rayo.

USE hospital_db;

-- Defaults recomendados
ALTER TABLE citas
  MODIFY COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'Programada';

-- Timestamps (solo si no existen)
SET @has_created_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'created_at'
);
SET @has_updated_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'updated_at'
);

SET @sql_created_at := IF(@has_created_at = 0,
  'ALTER TABLE citas ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql_created_at; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_updated_at := IF(@has_updated_at = 0,
  'ALTER TABLE citas ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql_updated_at; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Evitar doble cita del mismo medico en la misma fecha/hora (solo si no existe)
SET @has_ux := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND INDEX_NAME = 'ux_citas_medico_fecha_hora'
);
SET @sql_ux := IF(@has_ux = 0,
  'CREATE UNIQUE INDEX ux_citas_medico_fecha_hora ON citas (id_usuario, fecha, hora)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_ux; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index util para consultas por paciente (solo si no existe)
SET @has_ix := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND INDEX_NAME = 'ix_citas_paciente_fecha'
);
SET @sql_ix := IF(@has_ix = 0,
  'CREATE INDEX ix_citas_paciente_fecha ON citas (id_paciente, fecha)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_ix; EXECUTE stmt; DEALLOCATE PREPARE stmt;
