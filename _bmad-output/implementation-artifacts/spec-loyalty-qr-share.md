---
title: 'QR brand + link del programa (prod)'
type: 'feature'
created: '2026-08-04'
status: 'done'
baseline_commit: 'fb9087f'
---

## Intent

Dueño y empleado ven QR personalizado del negocio + copiar/compartir link público `/{slug}/loyalty`.

## Scope

- Helper URL + componente BrandedQr + ShareProgram
- Ajustes dueño: bloque programa
- Empleado: botón Panel → `/dashboard/loyalty/qr` fullscreen
- Sin mocks; origin real

## Verify

- bun test + bun run build
