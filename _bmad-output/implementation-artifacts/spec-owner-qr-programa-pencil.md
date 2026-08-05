---
title: 'QR programa dueño alineado a Pencil 7'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
baseline_commit: 'a810664'
---

## Intent

**Problem:** En localhost, Mostrar QR no coincidía con Pencil `7 · Dueño · QR programa`: faltaba Compartir y el CTA primario «Copiar link».

**Approach:** Vista dueño con CTAs Pencil; vista empleado (counter) separada por `role` para no pisar `8 · Empleado · Mostrar QR`.

## Suggested Review Order

**Entry / role split**

- Server page pasa `session.role` a la vista cliente
  [`page.tsx:11`](../../app/(dashboard)/[slug]/dashboard/loyalty/qr/page.tsx#L11)

- Dueño → chrome Ajustes + NEGOCIO; empleado → Escaneá para sumar
  [`loyalty-qr-view.tsx:18`](../../modules/loyalty/dashboard/loyalty-qr-view.tsx#L18)

**ShareProgram variants**

- Owner: link row + Copiar link primary + Compartir + tip + poster
  [`share-program.tsx:118`](../../modules/loyalty/dashboard/share-program.tsx#L118)

- Counter: QR grande + Copiar {url} gris + brillo
  [`share-program.tsx:82`](../../modules/loyalty/dashboard/share-program.tsx#L82)

**Tests**

- Contratos owner vs counter y ruta por role
  [`branded-qr.test.tsx:32`](../../tests/ui/branded-qr.test.tsx#L32)
