-- Migracion: pacientes.id_medico_creador (propietario del paciente)
-- Fecha: 2026-03-15
-- Base: hospital_db
--
-- Objetivo:
-- - Un Medico solo puede ver/editar pacientes que el mismo creo.
-- - Secretaria: solo lectura (ve todos).
-- - Admin: ve/gestiona desde su apartado.
--
-- Ejecutar en MySQL Workbench: File > Open SQL Script..., luego el boton del rayo.

USE hospital_db;

-- Agregar columna solo si no existe
SET @has_owner := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'id_medico_creador'
);

SET @sql_owner := IF(@has_owner = 0,
  'ALTER TABLE pacientes ADD COLUMN id_medico_creador INT NULL AFTER id_paciente',
  'SELECT 1'
);
PREPARE stmt FROM @sql_owner; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index solo si no existe
SET @has_ix := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND INDEX_NAME = 'ix_pacientes_medico_creador'
);
SET @sql_ix := IF(@has_ix = 0,
  'CREATE INDEX ix_pacientes_medico_creador ON pacientes (id_medico_creador)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_ix; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK solo si no existe
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pacientes'
    AND CONSTRAINT_NAME = 'fk_pacientes_medico_creador'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql_fk := IF(@has_fk = 0,
  'ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_medico_creador FOREIGN KEY (id_medico_creador) REFERENCES usuarios (id_usuario)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill opcional:
-- Si ya tienes expedientes.id_medico, puedes usarlo como "creador" cuando el campo este NULL.
-- Nota: esto asigna el medico que edito por ultima vez el expediente, no necesariamente el creador historico.
UPDATE pacientes p
LEFT JOIN expedientes e ON e.id_paciente = p.id_paciente
SET p.id_medico_creador = e.id_medico
WHERE p.id_medico_creador IS NULL AND e.id_medico IS NOT NULL;

