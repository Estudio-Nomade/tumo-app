# Turnos: avisar reserva por WhatsApp (confirmación)

## Goal
Tras reservar un turno, el cliente ve en la confirmación un CTA **“Avisar por WhatsApp”** que abre un chat al **negocio** con los datos del turno. Si pagó por transferencia, el texto pide adjuntar el comprobante (wa.me no puede adjuntar archivos).

## Decisions
- Destino: WhatsApp del negocio (settings turnos), no del cliente.
- Momento: botón en `confirmation.tsx` (no auto-redirect).
- Comprobante: texto recordatorio; sin media API.
- Enfoque: columna `whatsapp_phone` + helper `wa.me` + CTA.

## Data
- Migration `013_turnos_whatsapp_phone.sql`: `ALTER TABLE turnos_settings ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;`
- Domain settings: map/get/upsert `whatsappPhone`.
- Dashboard form: input “WhatsApp del negocio”.

## Client confirmation
1. Fetch booking + settings (público settings ya expone transfer; agregar whatsappPhone).
2. Si `whatsappPhone` con dígitos válidos → CTA primario `wa.me/{digits}?text=...`
3. Si no → sin CTA (o copy discreto).
4. Mensaje: business, servicio, fecha/hora es-AR, duración, precio, método de pago, ref corta; si transfer: “Adjuntá el comprobante…”.

## Out of scope
- WhatsApp Business API / envío server-side con media.
- Auto-open WA al confirmar.
- Cambiar create booking / receipt upload.

## Tests
- Helper: digits + href + body mensaje (transfer vs at_location).
- Settings roundtrip whatsappPhone.
- Source contract confirmation: Avisar por WhatsApp + wa.me.
- Migration 013 contains whatsapp_phone.
