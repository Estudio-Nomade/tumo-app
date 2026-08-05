---
title: 'Dashboard multi-módulo (desacoplar loyalty)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
baseline_commit: 'f8e687f'
---

## Intent

**Problem:** Home y Actividad están hardcodeados a Fidelización; no escalan a Pedidos u otros módulos.

**Approach:** Extender `Module` con hooks de home; loyalty implementa; page/activity iteran módulos; nav tab "Módulos" + hub.

## Boundaries

**Always:** TDD; employee panel intacto; sin tocar DB/API handlers de negocio.
**Never:** Romper loyalty flows; mocks de datos.

## Tasks

- [x] Extender Module + MetricCardData
- [x] Loyalty home hooks
- [x] Dashboard page multi-módulo
- [x] Activity merge
- [x] Nav Módulos + hub page
- [x] Tests + build

## Verify

bun test · bun run build
