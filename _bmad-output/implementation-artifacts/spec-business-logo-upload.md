---
title: 'Subir logo del negocio (Supabase Storage)'
type: 'feature'
created: '2026-08-05'
status: 'done'
baseline_commit: 'b2d9d5d'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent">

## Intent

**Problem:** El dueño no puede subir logo; solo ve inicial/colores.

**Approach:** Upload a Supabase Storage (bucket `business-logos`), guardar URL pública en `businesses.logo`, reemplazar y borrar el objeto anterior. UI en Ajustes (card Marca).

## Boundaries

**Always:** Solo owner; JPEG/PNG/WebP ≤2MB; DI testeable; borrar logo viejo del bucket si era nuestro; env `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

**Never:** Historial de logos; cliente con service role; base64 en DB.

## I/O

| Scenario | Expected |
|----------|----------|
| Owner sube PNG válido | 200 + logo URL; DB actualizada |
| No owner | 403 |
| Tipo inválido / >2MB | 400 |
| Reemplazo | nuevo objeto; viejo deleted del storage |
| Storage no configurado | 503 mensaje claro |

</frozen-after-approval>

## Code Map

- `shell/storage/supabase.ts` — client + upload/remove + public URL
- `shell/business/logo.ts` — DI uploadBusinessLogo
- `shell/db/business.ts` — updateBusinessLogo
- `app/api/business/logo/route.ts` — POST multipart
- `shell/ui/settings-form.tsx` — picker + preview
- `tests/business-logo.test.ts` — DI
- `tests/ui/settings-program-forms.test.tsx` — UI guards
- `.env.example` — vars documentadas

## Tasks

- [x] RED/GREEN logo DI + route validation
- [x] Storage adapter + ensure bucket
- [x] DB update logo
- [x] Settings UI
- [x] bun test + build

## Verification

- `bun test` / `bun run build`
