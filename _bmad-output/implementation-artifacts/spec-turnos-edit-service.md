---
title: 'feat(turnos): editar servicio existente (precio/nombre/duración)'
type: 'feature'
created: '2026-09-07'
status: 'done'
route: 'one-shot'
---

# feat(turnos): editar servicio existente (precio/nombre/duración)

## Intent

**Problem:** El admin solo podía crear servicios; no había forma de cambiar precio (u otros campos) de uno ya cargado. `updateService` existía en dominio pero sin HTTP ni UI.

**Approach:** PATCH `/api/turnos/services` cableado a `updateService` + botón Editar en la lista (nombre, precio pesos AR, duración, activo). Parse de precio alineado a `formatCents` (enteros pesos, no ×100).

## Suggested Review Order

**API PATCH**

- sesión + body serviceId → updateService
  [`route.ts:65`](../../app/api/turnos/services/route.ts#L65)

**UI edición**

- Editar / Guardar cambios / Activo
  [`services-manager.tsx:114`](../../modules/turnos/dashboard/services-manager.tsx#L114)

- parse pesos sin ×100 (fix clobber)
  [`types.ts:31`](../../modules/turnos/lib/types.ts#L31)

**Tests**

- updateService + contracts PATCH/Editar + parsePesosInput
  [`turnos-services.test.ts:1`](../../tests/turnos-services.test.ts#L1)
