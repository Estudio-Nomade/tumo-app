-- 008: campo is_active en employees
-- Permite desactivar un empleado sin borrarlo (acceso al panel). Por defecto activo.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
