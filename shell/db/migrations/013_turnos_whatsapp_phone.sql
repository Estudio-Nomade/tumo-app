-- Turnos: WhatsApp del negocio para avisar reservas desde confirmación pública
ALTER TABLE turnos_settings
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
