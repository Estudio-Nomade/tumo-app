---
title: 'Owner Actividad alineada a Pencil'
type: 'feature'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Owner Actividad alineada a Pencil

## Intent

**Problem:** El feed de Actividad del dueño mostraba emojis y títulos genéricos ("Visita sumada" / "Premio canjeado") en lugar del layout de Pencil (pantalla 6): hora, icono Lucide, nombre del cliente y detalle con ordinal de compras.

**Approach:** Mapear eventos con nombre como título, subtítulo `N° compra` / `N° compra · ¡Premio canjeado!` (ordinal por ciclo), iconos Lucide sandwich/gift, hora `HH:mm`.

## Suggested Review Order

**Datos del feed**

- Ordinal de compras por ciclo vía subquery (no balance actual del cliente)
  [`metrics.ts:54`](../../modules/loyalty/api/metrics.ts#L54)

- Título = nombre; descripción = ordinal + tipo; icon keys purchase/redemption
  [`metrics.ts:100`](../../modules/loyalty/api/metrics.ts#L100)

**UI**

- Iconos Lucide Gift/Sandwich y layout nombre + detalle
  [`widgets.tsx:318`](../../modules/loyalty/dashboard/widgets.tsx#L318)

**Tests**

- Contrato de getRecentActivity y render sin emojis
  [`loyalty-metrics.test.ts:37`](../../tests/loyalty-metrics.test.ts#L37)
  [`dashboard-home.test.tsx:190`](../../tests/ui/dashboard-home.test.tsx#L190)
