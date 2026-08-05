---
title: 'Sheet Compartir QR (Pencil 9)'
type: 'feature'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
baseline_commit: 'a810664'
---

## Intent

**Problem:** El botón Compartir del QR programa no abría el sheet de Pencil `9 · Sheet · Compartir QR`.

**Approach:** Sheet bottom shadcn con preview QR, URL, acciones Copiar / WhatsApp / Más y Cerrar.

## Suggested Review Order

**Sheet UI**

- Bottom sheet + handle + CTAs Copiar/WhatsApp/Más
  [`share-program.tsx:115`](../../modules/loyalty/dashboard/share-program.tsx#L115)

- Compartir abre sheet (`setShareOpen(true)`)
  [`share-program.tsx:310`](../../modules/loyalty/dashboard/share-program.tsx#L310)

**Primitives**

- shadcn Sheet bottom
  [`sheet.tsx:39`](../../components/ui/sheet.tsx#L39)

- BrandedQr compacto para sheet (`showUrl`, `className`)
  [`branded-qr.tsx:20`](../../shell/ui/branded-qr.tsx#L20)

**Tests**

- Contrato Pencil 9
  [`branded-qr.test.tsx:43`](../../tests/ui/branded-qr.test.tsx#L43)
