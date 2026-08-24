-- Credenciales de MercadoPago por negocio (multi-cuenta, §8.2 del spec).
-- Reemplazan las env vars globales MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET.
ALTER TABLE orders_settings
  ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_webhook_secret TEXT;
