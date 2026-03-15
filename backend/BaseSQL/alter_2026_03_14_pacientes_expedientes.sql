-- Migracion: relacionar pacientes/expedientes con usuarios (medico)
-- Fecha: 2026-03-14
-- Base: hospital_db
--
-- Objetivo:
-- 1) Alinear campos usados por el frontend (dni, telefono) con la tabla pacientes.
-- 2) Guardar el medico que edito por ultima vez un expediente (expedientes.id_medico)
-- 3) Timestamps basicos para poder mostrar "ultima actualizacion" del expediente.

USE hospital_db;

-- ===== PACIENTES =====
-- Agregar campos si no existen:
-- - dni: para busqueda y unicidad
-- - telefono: para contacto rapido
ALTER TABLE pacientes
  ADD COLUMN dni VARCHAR(20) NULL AFTER apellido,
  ADD COLUMN telefono VARCHAR(30) NULL AFTER dni;

-- Indice unico (permite multiples NULL)
CREATE UNIQUE INDEX ux_pacientes_dni ON pacientes (dni);

-- Opcional: si usabas contacto como telefono, puedes copiarlo:
-- UPDATE pacientes SET telefono = contacto WHERE telefono IS NULL AND contacto IS NOT NULL;

-- ===== EXPEDIENTES =====
-- Agregar medico (usuario) que actualizo por ultima vez y timestamps.
ALTER TABLE expedientes
  ADD COLUMN id_medico INT NULL AFTER id_paciente,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- FK hacia usuarios (ultimo medico editor).
ALTER TABLE expedientes
  ADD CONSTRAINT fk_expedientes_medico FOREIGN KEY (id_medico) REFERENCES usuarios (id_usuario);

CREATE INDEX ix_expedientes_medico ON expedientes (id_medico);

-- Nota:
-- El historial completo se guarda en expedientes.historial_medico como JSON (array de entradas),
-- y cada entrada incluye medico_id y medico_usuario para trazabilidad.

