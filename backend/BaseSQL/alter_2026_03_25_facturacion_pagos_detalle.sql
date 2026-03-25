-- Agrega campos opcionales para relacionar facturas con citas/medico y guardar notas.
-- Ejecuta en MySQL Workbench sobre la base `hospital_db` si deseas almacenar mas detalle.
-- Es seguro si ya existen: ajusta manualmente en ese caso.
USE hospital_db;

ALTER TABLE facturacion
  ADD COLUMN id_cita INT NULL AFTER fecha_emision,
  ADD COLUMN id_usuario INT NULL AFTER id_cita,
  ADD COLUMN notas VARCHAR(255) NULL AFTER id_usuario;

-- Opcional: indices (si tus reportes crecen)
CREATE INDEX idx_facturacion_id_cita ON facturacion (id_cita);
CREATE INDEX idx_facturacion_id_usuario ON facturacion (id_usuario);

