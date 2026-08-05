# Design: ranking de canjes + home multi-módulo + Ajustes shell

Date: 2026-08-05  
Status: draft — pending user review  

## Problem

1. El dueño no puede ver **cuántos clientes distintos canjearon** ni un **ranking por premios ganados**; el “Top clientes” actual es progreso de compras o no existe ranking de canjes.
2. El **Panel home** y **Actividad** están acoplados a Fidelización (imports y widgets fijos), lo que impide sumar módulos (p.ej. Catálogo/Pedidos) sin reescribir el shell.
3. **Ajustes** mezcla shell (negocio/cuenta) con operación de loyalty (QR, regla de canjes).
4. Los **CTA operativos** (“Atender clientes”, “Mostrar QR”) en el home compiten con un tablero multi-módulo: no aplican si el comercio no usa Fidelización.

## Goals

- Panel dueño = **insights de lectura** por módulo activo.
- Conteo de clientes con ≥1 canje (histórico) + ranking por premios ganados (histórico).
- Segunda lista: más cerca del premio (progreso de compras).
- Fidelización = **caja operativa** (código, +1, canje, QR mostrador).
- Ajustes = **shell** (negocio + cuenta + logout); sin QR ni regla de canjes.
- Nav dueño: **Panel · Actividad · Módulos · Ajustes**; hub de módulos para entrar a cada uno.
- Sin migración de schema en v1 (`redemptions` es el ledger).
- Sin selector Semana/Mes/Total en v1 (histórico total para ranking de premios).

## Non-goals

- Extraer `Customer` a entidad core compartida (solo trato de copy/UI; extracción física cuando el 2º módulo toque la misma persona).
- Selector de ventana temporal en el home.
- Edición de negocio/colores/reglas en Ajustes.
- Endpoints HTTP nuevos si el server component puede usar handlers DI.
- Cambiar el panel operativo del empleado más allá de lo necesario para highlight por URL.

---

## Architecture

```
Panel home (server)
  → getActiveModules(business)
  → por cada mod con HomeSection: <HomeSection slug business />
       loyalty: metrics + weekly goal + top progreso + top premios + conteo canjeadores

Actividad (server)
  → collectRecentActivity(modules, businessId, limit)
  → ActivityPage (timeline genérico)

Módulos hub (server)
  → lista getActiveModules → links a getModuleDashboardHref

Ajustes (server)
  → negocio + cuenta + logout + link a hub módulos
  → SIN ShareProgram, SIN regla de canjes

Fidelización /loyalty (client panel)
  → caja: código API, +1, canje, QR mostrador
```

**Cliente:** tabla `customers` se mantiene; en copy/UI es “cliente del comercio”. Extracción a core cuando Catálogo/Pedidos compartan identidad.

---

## UI

### Panel dueño

1. Saludo: “Panel” + “Hola, {nombre}. Así va tu comercio hoy.”
2. Por cada módulo con `HomeSection`, una sección con título del módulo + link “Abrir {nombre} →”.
3. **Fidelización (contenido de su sección):**
   - 3 KPI cards (sin trends inventados): Clientes, Compras del mes, Premios canjeados (eventos del mes).
   - GoalCard: canjes esta semana / target = canjes semana pasada si > 0; sin ETA inventada (“el sábado”).
   - Lista A — **Más cerca del premio**: top 3–5 por ratio purchases/needed; click → `/loyalty?highlight={id}`; header + “Ver todos”.
   - Lista B — **Más premios ganados**: top 3–5 con ≥1 canje histórico; header **“N clientes canjearon”** (COUNT DISTINCT all-time); fila muestra “N premios”; click → highlight; vacío: “Todavía nadie canjeó un premio.”
4. Sin selector Semana/Mes/Total en v1.
5. Sin CTAs operativos grandes (Atender / Mostrar QR) en el home.

### Fidelización operativa — `/dashboard/loyalty`

Caja: header, **Ingresar código** (API), search, lista +1/canje (confirm dialog), **Mostrar QR**. Sin leaderboards de premios.

### QR — `/dashboard/loyalty/qr`

Brand frame + QR + copiar. Volver = `router.back()` con fallback a `/loyalty`.

### Ajustes — `/dashboard/settings`

- Negocio: nombre, logo, colores (lectura) + nota soporte.
- Cuenta: nombre, rol, logout.
- Bloque corto Módulos → link al hub.
- Sin ShareProgram, sin regla de canjes, sin rankings.

### Nav dueño

**Panel · Actividad · Módulos · Ajustes**  
Hub cards → cada módulo activo. Empleado: sin pill; acceso directo a su módulo; logout footer mobile.

---

## Datos / API

**Ledger:** tabla `redemptions` (sin columna nueva en v1).

- `countCustomersWithRedemptions(businessId)` → `COUNT(DISTINCT customer_id)` all-time.
- `getTopCustomersByPrizes(businessId, limit)` → ranking all-time por `COUNT(*)`, tie-break `MAX(created_at)`, nombre.
- Progreso: `getTopCustomers` actual (purchases / purchases_needed).
- Meta: `getWeeklyRedemptions` (thisWeek / lastWeek).
- Preferir handlers DI en server components; sin endpoints nuevos salvo necesidad client.

**Ranking premios (queries):**

```sql
-- conteo segmento
SELECT COUNT(DISTINCT customer_id)::int FROM redemptions WHERE business_id = $1;

-- ranking
SELECT c.id, c.name, COUNT(r.*)::int AS prizes, MAX(r.created_at) AS last_redeemed_at
FROM redemptions r
JOIN customers c ON c.id = r.customer_id
WHERE r.business_id = $1
GROUP BY c.id, c.name
ORDER BY prizes DESC, last_redeemed_at DESC, c.name ASC
LIMIT $2;
```

**Ventana de tiempo ranking premios:** histórico total en v1. Selector Semana/Mes/Total → vista completa del módulo después.

**Cliente como entidad:** tabla `customers` se mantiene; copy/UI = “cliente del comercio”. Extracción core cuando el 2º módulo comparta identidad.

---

## Errores y vacíos

- Sin HomeSection en ningún módulo → mensaje neutro en Panel.
- Sin canjes → lista premios vacía + “0 clientes canjearon”.
- Sin actividad → empty state actual del timeline.
- Ajustes logout: fallo no tira la sesión (como ahora).

## Tests

- `collectRecentActivity`: merge, orden, limit, módulo sin activity.
- `countCustomersWithRedemptions` + `getTopCustomersByPrizes` (DI).
- Home page: no import directo de metrics loyalty; usa HomeSection.
- Nav owner: Panel / Actividad / Módulos / Ajustes.
- Settings: sin ShareProgram ni regla canjes; con logout + link módulos.
- Panel: código API, QR, +1, confirm canje intactos.

## Non-goals

- Selector Semana/Mes/Total
- Extraer Customer a core
- Editar negocio en Ajustes
- Endpoints HTTP nuevos si DI en server alcanza
