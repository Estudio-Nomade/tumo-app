---
title: 'Panel empleado: orden código → QR → lista clientes → búsqueda abajo'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Panel empleado: orden código → QR → lista clientes → búsqueda abajo

## Intent

**Problem:** Al entrar a Fidelización como empleado, la lista de clientes quedaba empujada por el buscador y las acciones, y el orden de los elementos no respetaba la prioridad del empleado.

**Approach:** Reordenar `panel.tsx` para que, tras el header, aparezcan primero las CTA primarias («Ingresar código» y «Mostrar QR del programa»), luego la lista de clientes con su botón `+1 compra`, y el buscador pasa a ubicarse al final.

## Suggested Review Order

1. [panel.tsx — reorden del bloque empleado](../../modules/loyalty/dashboard/panel.tsx) — header → código → QR → lista → búsqueda
2. [loyalty-panel.test.tsx — assert de orden](../../tests/ui/loyalty-panel.test.tsx) — `código → QR → lista → búsqueda`