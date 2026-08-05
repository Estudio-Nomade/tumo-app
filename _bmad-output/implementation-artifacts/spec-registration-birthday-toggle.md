---
title: 'Registro: toggle fecha de cumpleaños (Pencil)'
type: 'feature'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Registro: toggle fecha de cumpleaños (Pencil)

## Intent

**Problem:** En `/[slug]/loyalty` el campo de cumpleaños decía "Cumpleaños (opcional)" y el `input type=date` nativo quedaba visualmente suelto (fecha “volando”), lejos del layout Pencil (`bd` / `dti`).

**Approach:** Alinear al frame Pencil: label "¿Fecha de cumpleaños?", switch a la derecha que habilita el picker, y el date dentro de un contenedor con borde h-52 + icono calendario; solo se envía `birthday` si el switch está ON.

## Suggested Review Order

1. [modules/loyalty/public/registration.tsx](../../modules/loyalty/public/registration.tsx) — UI switch + date container + payload condicional
2. [tests/ui/registration-birthday.test.tsx](../../tests/ui/registration-birthday.test.tsx) — contrato fuente vs Pencil
