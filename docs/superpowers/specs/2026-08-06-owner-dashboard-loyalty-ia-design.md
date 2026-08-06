# Spec de pantallas: Panel dueño + IA Loyalty (operar ≠ observar)

Date: 2026-08-06  
Status: draft — pending user review  
Supersedes (parcial): `2026-08-05-redemptions-ranking-and-module-home-design.md` en lo que respecta a **home del dueño** y **composición de `/dashboard/loyalty`**.  
No invalida: ranking de canjes, APIs de métricas, Ajustes shell, QR, programa.

---

## 1. Problema

1. El **Panel** del dueño se presenta como “Fidelización”, no como salud del comercio. Confunde a dueños 50–70 años.
2. Dentro de **loyalty**, operar (buscar, +compra, canjear) y observar (KPIs, meta, rankings) compiten en la misma pantalla. Hay que scrollear para trabajar.
3. El público objetivo necesita: texto grande, una acción clara, lenguaje de mostrador, targets ≥48px.

## 2. Decisiones bloqueadas

| # | Decisión |
|---|---|
| D1 | Home del comercio = **Solución B** (hub con tarjetas por módulo). |
| D2 | Home de loyalty = **solo operar**. Cero métricas / GoalCard / tops en esa ruta. |
| D3 | Métricas = ruta propia `/[slug]/dashboard/loyalty/numeros` (“Cómo va”). |
| D4 | Acceso a métricas = botón secundario **“Cómo va”** en el header de loyalty (**opción A**). No tab extra en bottom nav global. |
| D5 | Nunca mostrar la palabra **“Fidelización”** en UI del dueño/empleado. Copy: “Programa de premios” / “Clientes” / “Cómo va el programa”. |
| D6 | Principios adultos mayores (tipografía, contraste, touch) aplican a **todas** estas pantallas. |

## 3. Mapa de rutas

```
/[slug]/dashboard                    → Hub comercio (tarjetas módulo)     [dueño]
/[slug]/dashboard/loyalty            → Operar (buscar / +compra / canje) [dueño + empleado]
/[slug]/dashboard/loyalty/numeros    → Observar (KPIs, meta, tops)       [dueño; empleado opcional lectura]
/[slug]/dashboard/loyalty/qr         → QR a pantalla completa
/[slug]/dashboard/loyalty/programa   → Config regla del programa         [solo dueño]
/[slug]/dashboard/activity           → Timeline (sin cambio de IA en este spec)
/[slug]/dashboard/settings           → Ajustes shell
```

**Empleado:** al login sigue yendo a `/dashboard/loyalty` (operar). No aterriza en el hub.

---

## 4. Principios de UI (todas las pantallas de este spec)

| Principio | Mínimo |
|---|---|
| Body | ≥16px |
| Títulos de pantalla | ≥20px (preferido 22px) |
| Números hero / KPI | ≥28px |
| Labels de KPI | ≥16px |
| Texto secundario esencial | ≥16px; color con contraste ≥4.5:1 (evitar stone-400/500 para info crítica) |
| Touch target | ≥48×48px (primarios ≥52px alto) |
| Links de texto chicos | Prohibidos como única forma de navegar; preferir botón con verbo |
| Gestos ocultos | No swipe / long-press / icon-only sin label |
| Trends “+12%” | Solo si van con frase completa ≥14px (“12% más que el mes pasado”); si no, omitir en v1 |

---

## 5. Pantalla A — Hub del comercio

**Ruta:** `/[slug]/dashboard`  
**Rol:** dueño  
**Trabajo en 3 s:** “¿Qué herramienta abro?” + pulso mínimo del día.

### Wireframe

```
┌────────────────────────────────────────┐
│ [Logo/nombre negocio]        [Avatar]  │  ← opcional v1 si el shell ya no lo trae
│                                        │
│ Panel                                  │
│ Hola, {nombre}. Así va tu comercio hoy.│  ← saludo ≥16px, alto contraste
│                                        │
│ Hoy de un vistazo                      │  ← opcional; una sola línea ≥16px
│ {N} clientes · {M} compras este mes    │     datos del módulo loyalty si es el único
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Programa de premios                │ │  ← NO “Fidelización”
│ │                                    │ │
│ │ {R} premios este mes               │ │  ← 2–3 señales max
│ │ Meta semanal {x}/{y}               │ │
│ │ {K} listos para canjear            │ │     solo si K>0; si 0, omitir línea
│ │                                    │ │
│ │ [ Atender clientes ]               │ │  ← primario full-width ≥52px
│ │   Cómo va el programa              │ │  ← secundario, texto ≥16px, target ≥48px
│ └────────────────────────────────────┘ │
│                                        │
│ (futuro: más tarjetas de módulo)       │
│                                        │
│ ══════════════════════════════════════ │
│  Panel  |  Actividad  |  Ajustes       │  ← labels existentes del shell
└────────────────────────────────────────┘
```

### Contenido de la tarjeta “Programa de premios”

| Elemento | Fuente de datos | Notas |
|---|---|---|
| Título | copy fijo | “Programa de premios” |
| Premios este mes | `redemptionsThisMonth` | |
| Meta semanal | `getWeeklyRedemptions` | “Meta semanal 18/25”; si target=0: “Todavía no hay meta esta semana” o solo “14 premios esta semana” |
| Listos para canjear | count `canRedeem` (topCustomers o query liviana) | Omitir si 0 |
| CTA primario | link | → `/dashboard/loyalty` — label **“Atender clientes”** |
| CTA secundario | link | → `/dashboard/loyalty/numeros` — label **“Cómo va el programa”** |

### Estados

| Estado | UI |
|---|---|
| Módulo loyalty activo, con datos | Tarjeta completa como arriba |
| 0 clientes | Tarjeta: “Todavía no hay clientes en el programa.” + primario **“Mostrar el QR”** → `/loyalty/qr` + secundario “Atender clientes” |
| Sin módulos con HomeSection | Empty ya existente del shell (“No hay módulos…”) |
| Varios módulos (futuro) | Una tarjeta por módulo; mismo patrón de vistazo + CTA operar + opcional “Cómo va” |

### Fuera de alcance en el hub

- Listas de clientes clickeables.
- Botones +1 compra / Canjear.
- Palabra “Fidelización”.
- Grilla de 3 MetricCards sueltas sin marco de módulo (eso vive en “Cómo va”).

### Cambio respecto al código actual

- `LoyaltyHomeSection` deja de ser “Fidelización + 2 metrics + destacados”.
- Pasa a ser la **tarjeta de módulo** del hub (vistazo + 2 CTAs).
- No reutiliza el layout de insights completo.

---

## 6. Pantalla B — Loyalty operar (home del módulo)

**Ruta:** `/[slug]/dashboard/loyalty`  
**Rol:** dueño y empleado  
**Trabajo en 3 s:** estar tipeando un nombre o un código para sumar compra o canjear.

### Wireframe

```
┌────────────────────────────────────────┐
│ Clientes              [Cómo va]  [QR]  │  ← título ≥22px
│ {nombre negocio} · Hoy                 │     “Cómo va” solo si rol dueño
│                                        │     (o ambos en lectura — ver §9)
│ ┌────────────────────────────────────┐ │
│ │ 🔍 Buscar por nombre, teléfono…    │ │  ← sticky al scroll; alto ≥52px
│ └────────────────────────────────────┘ │  texto input ≥16px
│                                        │
│ [ Buscar por nombre ] [ Por código ]   │  ← dos modos, targets grandes
│                                        │
│ ── Si hay canRedeem ─────────────────  │
│ Listos para canjear                    │
│ ┌────────────────────────────────────┐ │
│ │ JR  Juan Rodríguez                 │ │
│ │     ¡Puede llevarse {premio}!      │ │
│ │              [ Canjear premio ]    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ── Lista / resultados ───────────────  │
│ ┌────────────────────────────────────┐ │
│ │ MG  María González                 │ │
│ │     8 de 10 compras                │ │
│ │              [ +1 compra ]         │ │
│ └────────────────────────────────────┘ │
│ …                                      │
└────────────────────────────────────────┘
```

### Jerarquía (fija)

1. Header (título + Cómo va + QR)
2. Buscador (siempre visible / sticky)
3. Toggle modo nombre ↔ código
4. Bloque “Listos para canjear” (solo si hay ≥1)
5. Resto de lista filtrada

### Comportamiento

| Acción | Comportamiento |
|---|---|
| Buscar por nombre/tel | Filtro local sobre lista (ya existe `filterCustomers`) |
| Por código | Input 4 dígitos + confirmar → API lookup (ya existe) → highlight arriba |
| +1 compra | POST purchases → toast claro: “Listo: se sumó 1 compra a {nombre}.” |
| Canjear | Dialog de confirmación con nombre del premio → POST → toast “¡{premio} canjeado para {nombre}!” |
| QR | → `/loyalty/qr` |
| Cómo va | → `/loyalty/numeros` |
| `?highlight={id}` | Mantener: sube al tope / scroll into view (deep link desde números o hub) |

### Estados

| Estado | UI |
|---|---|
| Cargando | Skeleton o “Cargando clientes…” ≥16px |
| 0 clientes | Above the fold: mensaje “Todavía no hay clientes.” + botón grande **“Mostrar el QR del programa”** + texto “Cuando se registren, van a aparecer acá.” Sin métricas. |
| Búsqueda sin resultados | “No encontramos a nadie con “{q}”. Probá con el teléfono o el código de 4 dígitos.” |
| Código no encontrado | Error inline bajo el input, lenguaje humano (ya hay copy base) |
| Error de red al +1/canje | Mensaje persistente hasta dismiss o nuevo intento; no solo toast 2s |
| Listos para canjear = 0 | No mostrar la sección (no empty state de esa sección) |

### Fuera de esta pantalla (mover o eliminar)

- `LoyaltyModuleInsights` **no se renderiza** aquí.
- `GoalCard`, `LoyaltyMetrics`, `TopCustomers`, `TopByPrizesList` → solo en Pantalla C.
- Separador `<hr>` bajo el panel → eliminar.

### Ajustes de accesibilidad sobre el panel actual

| Hoy | Spec |
|---|---|
| Subtítulo header 12px stone-500 | ≥16px, contraste alto |
| Placeholder / labels chicos | ≥16px |
| Hint código 11px | ≥14–16px |
| Toast 2.5s único feedback | Mantener toast + que el row refleje el nuevo contador (ya lo hace) |
| Icono sandwich decorativo sin acción | OK decorativo; no reemplaza CTAs con label |

---

## 7. Pantalla C — Cómo va el programa (observar)

**Ruta:** `/[slug]/dashboard/loyalty/numeros`  
**Rol:** dueño (v1); empleado según §9  
**Trabajo en 3 s:** “¿Cómo viene el programa esta semana / este mes?”

### Wireframe

```
┌────────────────────────────────────────┐
│ ← Volver a clientes                    │  ← link/botón ≥48px, verbo claro
│                                        │
│ Cómo va el programa                    │
│ Números de {nombre negocio}            │
│                                        │
│ ┌──────┐ ┌──────┐ ┌──────────────────┐ │
│ │ 234  │ │ 156  │ │ 32               │ │
│ │Client│ │Compras│ │Premios canjeados │ │
│ │es    │ │del mes│ │este mes          │ │
│ └──────┘ └──────┘ └──────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Meta de la semana                  │ │
│ │ 18 / 25 canjes                     │ │
│ │ ████████████░░░░                   │ │
│ │ Te faltan 7 para igualar           │ │
│ │ la semana pasada.                  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Más cerca del premio          Ver todos│  ← “Ver todos” → /loyalty
│ (lista TopCustomers, tap → highlight)  │
│                                        │
│ Más premios ganados                    │
│ (lista TopByPrizes + conteo canjeadores)│
│                                        │
│ [ Atender clientes ]                   │  ← CTA inferior opcional full-width
└────────────────────────────────────────┘
```

### Contenido (reusa widgets existentes)

Orden fijo:

1. `LoyaltyMetrics` (3 KPIs) — labels ≥16px (implica ajuste de `MetricCard`)
2. `GoalCard` — mensaje ya existente; tipografía ≥16px en body del card
3. `TopCustomers` — tap → `/loyalty?highlight={id}`
4. `TopByPrizesList`
5. CTA **“Atender clientes”** → `/loyalty`

### Estados

| Estado | UI |
|---|---|
| Todo en cero | KPIs en 0 + GoalCard vacío + empties de listas con copy actual (“Compartí el QR…”) + CTA **“Mostrar el QR”** |
| Solo progreso, 0 canjes | Top premios empty; resto normal |
| Meta target 0 | GoalCard sin barra engañosa (comportamiento actual) |

### Trends (+%)

**v1: no inventar trends** si no hay serie histórica confiable mes-a-mes en API. El Pencil los muestra; este spec los marca **non-goal** hasta existir dato real. No hardcodear “+12%”.

---

## 8. Navegación y flujos clave

### Dueño — día típico en el salón

```
Hub → [Atender clientes] → Loyalty operar → buscar → +1 / canjear
```

### Dueño — “quiero ver números”

```
Hub → [Cómo va el programa] → /loyalty/numeros
  o
Loyalty operar → header [Cómo va] → /loyalty/numeros → [← Volver a clientes]
```

### Empleado — turno

```
Login → /loyalty (operar) → buscar / código → +1 / canjear
QR desde header o atajo existente
```

### Deep link desde rankings

```
/numeros → tap cliente → /loyalty?highlight={id}
```

---

## 9. Permisos

| Pantalla | Dueño | Empleado |
|---|---|---|
| Hub `/dashboard` | Sí | No (redirect actual a loyalty) |
| Operar `/loyalty` | Sí | Sí |
| Cómo va `/loyalty/numeros` | Sí | **Sí en lectura (recomendado v1)** — mismos datos, sin config |
| QR | Sí | Sí |
| Programa `/programa` | Sí | No (redirect actual) |

Rationale empleado + números: no hace daño; evita “la app del dueño vs la mía”. Si producto prefiere ocultar, un solo guard de rol en la página basta.

Header “Cómo va” en operar: visible para quien pueda abrir `/numeros`.

---

## 10. Copy canónico (ES)

| Lugar | Usar | No usar |
|---|---|---|
| Tarjeta hub | Programa de premios | Fidelización, Loyalty, Módulo |
| CTA hub primario | Atender clientes | Abrir, Administrar, Entrar → |
| CTA hub secundario | Cómo va el programa | Ver insights, Dashboard |
| Título operar | Clientes | Panel de fidelización |
| Header secundario | Cómo va | Métricas, Analytics |
| Título números | Cómo va el programa | Fidelización · Insights |
| Volver | Volver a clientes | Back, ← solo |
| +1 | +1 compra (o “Sumar 1 compra”) | Add visit (interno ok) |
| Canje | Canjear premio | Redeem |
| Empty 0 clientes | Mostrar el QR del programa | Compartí el QR… (ok variante) |
| Listos | Listos para canjear | canRedeem, Top redeemers |

---

## 11. Criterios de aceptación (testeables)

### Hub

- [ ] No aparece la cadena “Fidelización” en el DOM del home dueño.
- [ ] Existe CTA “Atender clientes” → `/[slug]/dashboard/loyalty`.
- [ ] Existe control “Cómo va el programa” → `/[slug]/dashboard/loyalty/numeros`.
- [ ] Con 0 clientes, el CTA primario preferido es hacia QR (o coexiste de forma explícita en spec de empty).

### Operar

- [ ] `/loyalty` **no** renderiza GoalCard, LoyaltyMetrics, TopCustomers ni TopByPrizesList.
- [ ] El buscador está por encima de cualquier lista y es usable sin scroll inicial en viewport móvil 375×667.
- [ ] Con ≥1 `canRedeem`, la sección “Listos para canjear” aparece **antes** del resto de la lista.
- [ ] `?highlight=` sigue funcionando.

### Cómo va

- [ ] Ruta `/loyalty/numeros` muestra los 3 KPIs + GoalCard + ambas listas (con datos mock/API).
- [ ] “Volver a clientes” vuelve a `/loyalty`.
- [ ] Tap en cliente de lista navega a `/loyalty?highlight={id}`.

### Accesibilidad baseline

- [ ] Ningún label de KPI de estas pantallas usa clase de texto &lt; 14px (objetivo 16px).
- [ ] CTAs primarios tienen min-height ≥ 48px.

---

## 12. Non-goals (este spec)

- Implementar bottom nav de 4 ítems ni tab “Cómo va” global.
- Trends porcentuales sin backend.
- Rediseño visual completo del shell (logo/avatar header) más allá de copy y CTAs del hub.
- Cambiar modelo de datos / nuevas tablas.
- Extraer Customer a core.
- Solución 3 “libreta” como home del comercio (queda descartada a favor de B; la *actitud* operativa sí se aplica **dentro** de loyalty).

---

## 13. Impacto en código (guía, no implementación)

| Archivo / área | Cambio esperado |
|---|---|
| `modules/loyalty/dashboard/home-section.tsx` | Reescribir como tarjeta hub (vistazo + CTAs) |
| `app/.../loyalty/page.tsx` | Quitar `LoyaltyModuleInsights` |
| `app/.../loyalty/numeros/page.tsx` | **Nueva** página server con insights |
| `modules/loyalty/dashboard/module-insights.tsx` | Reusar tal cual (o casi) en `/numeros` |
| `modules/loyalty/dashboard/panel.tsx` | Header: botón “Cómo va” + QR; sticky search; bloque listos arriba; a11y type scale |
| `shell/ui/MetricCard.tsx` | Subir label de 11px → ≥16px; trend si existe ≥14px |
| `modules/loyalty/dashboard/widgets.tsx` | Ajustes de type scale en headers/links; GoalCard body |
| Tests UI | Actualizar home dueño; loyalty sin insights; smoke `/numeros` |

---

## 14. Relación con Pencil

Pantallas `ljwya` / `Bwj4R` (Dueño · Dashboard) representan un **tablero plano** (Solución 1). Este spec adopta **Solución B en el hub** y mueve el contenido tipo Pencil de métricas a **`/loyalty/numeros`**.

Acción de diseño (no bloqueante de eng): actualizar Pencil o anotar que el dashboard dueño es hub de tarjetas; el frame de métricas pasa a “Cómo va”.

Corrección a11y del Pencil (11px labels, 10px trends) aplica al implementar MetricCard / números.

---

## 15. Preguntas abiertas (defaults si no hay respuesta)

| # | Pregunta | Default de este spec |
|---|---|---|
| Q1 | ¿Empleado ve “Cómo va”? | Sí, lectura |
| Q2 | ¿Empty hub 0 clientes: primario QR o Atender? | Primario **Mostrar el QR**; secundario Atender |
| Q3 | ¿“Hoy de un vistazo” en hub es obligatorio? | Opcional v1; la tarjeta del módulo basta |
| Q4 | ¿Slug de ruta `numeros` vs `como-va`? | `numeros` (corto, estable); UI dice “Cómo va” |

---

## 16. Revisión del spec (self-check)

- [x] Sin TBD críticos; defaults en §15  
- [x] Operar y observar no se contradicen  
- [x] Alcance acotado a IA de home + loyalty  
- [x] Aceptación testeable en §11  
- [x] Copy sin jerga de módulo  

---

**Siguiente paso tras aprobación:** plan de implementación (TDD) vía skill de dev / writing-plans — no implementar hasta OK explícito de este documento.
