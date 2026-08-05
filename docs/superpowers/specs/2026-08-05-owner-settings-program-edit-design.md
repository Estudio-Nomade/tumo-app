# Owner: editar comercio, marca y programa de fidelización

**Date:** 2026-08-05  
**Status:** approved (design) — pending implementation plan  
**Surfaces:** Dueño · Ajustes + Dueño · Programa (Fidelización)

## Problem

En el dashboard del dueño, **Ajustes** es solo lectura: muestra nombre y colores con el mensaje de contactar a soporte. No hay forma de editar:

1. Nombre del comercio  
2. Colores de marca (primario / secundario)  
3. Cantidad de compras para canjear el premio  
4. Nombre del premio  

Esos datos ya viven en `businesses` (`name`, `primary_color`, `secondary_color`, `purchases_needed`, `reward_name`) pero solo se cargan por seed/DB.

## Goals

- El dueño configura su marca y su regla de premios sin soporte.  
- UX “alta gama” mobile-first: clara, predecible, con preview.  
- Separar **shell (comercio/marca)** de **módulo loyalty (regla del programa)**.  
- Mínimo viable: sin logo, slug, ubicación ni multi-premio en v1.

## Non-goals (v1)

- Editar logo, slug, location, active_modules  
- Auto-save por campo  
- Múltiples premios / tiers / calendarios  
- Empleado editando cualquier setting de negocio o programa  
- Rediseñar nav del dueño (sigue Panel / Actividad / Ajustes)

## Structure (Approach A)

| Pantalla | Ruta | Campos |
|----------|------|--------|
| **Ajustes** | `/{slug}/dashboard/settings` | `name`, `primary_color`, `secondary_color` |
| **Programa** | `/{slug}/dashboard/loyalty/programa` | `purchases_needed`, `reward_name` |

- Link suave en Ajustes: “Programa de fidelización →” hacia Programa.  
- Entrada a Programa también desde el área de Fidelización (panel/QR).  
- Solo rol **owner**; employee no ve estas pantallas de edición (redirect/403).

## Interaction pattern

Patrón unificado en ambas pantallas (inspirado en Stripe/Linear, adaptado a mobile):

1. Campos **siempre editables** (no hay modo “solo lectura → Editar”).  
2. Botón **Guardar cambios** deshabilitado hasta que el form esté *dirty* y válido.  
3. Al guardar: loading en botón → éxito con toast (“Listo, se guardó”) → form limpio (no dirty).  
4. Error de red/API: mensaje inline o toast de error; no se pierde lo tipeado.  
5. Validación en cliente + servidor.

## Screen: Ajustes

**Header**

- Título: “Ajustes”  
- Subtítulo: “Tu comercio y tu cuenta”

**Card Negocio**

- Label: “Nombre del comercio”  
- Input texto (valor actual de `business.name`)  
- Helper: “Así te ven clientes y empleados”

**Card Marca**

- **Preview en vivo** (arriba de los controles):  
  - Avatar con inicial del nombre (o logo si existiera; v1 = inicial)  
  - Nombre actual del input  
  - Dos chips/swatches mostrando primario y secundario elegidos  
- “Color principal”: fila de **8 swatches curados** + **Personalizado** (input color nativo **y** campo hex `#RRGGBB`)  
- “Color secundario”: misma UX  
- Swatch activo: ring/borde ink  
- Preview se actualiza al tocar swatch o al confirmar custom

**Card Cuenta** (sin cambios de producto en v1)

- Avatar inicial del dueño, nombre de sesión, “Dueño del comercio”

**Navegación secundaria**

- Link texto: “Programa de fidelización →” → ruta Programa

**Cerrar sesión**

- Botón outline full width (ya existe `LogoutButton`)

**Guardar**

- CTA primario “Guardar cambios” al **final del form** (dentro del scroll, por encima del espacio del tab bar; sin overlay sticky en v1)  
- Disabled si no dirty o inválido

## Screen: Programa (Fidelización)

**Header**

- Título: “Programa”  
- Subtítulo: “Cuántas compras y qué premio”  
- Back hacia panel de fidelización (no al home Panel)

**Card Regla**

- “Compras para canjear”: **stepper** (− / valor / +); el valor central es editable (teclado numérico)  
  - Rango **2–50** (clamp en UI; reject en API si viene fuera de rango)  
  - Helper: “El cliente completa el círculo al llegar a este número”  
- “Nombre del premio”: input texto  
  - Helper: “Aparece en la tarjeta del cliente y al canjear”  
- **Preview de regla** (texto vivo):  
  `En {N} compras → {premio}`

**Guardar**

- Mismo patrón dirty / disabled / toast

**Efecto de cambio de umbral**

- Aplica a canjes y conteos **futuros** (comparación en runtime con `purchases_needed` del business).  
- **No** resetea `purchases` de clientes existentes.  
- Si un cliente ya tiene compras ≥ nuevo umbral, puede canjear en el próximo intento (comportamiento natural; no requiere migración).

## Data & API

### Existing columns (`businesses`)

- Ajustes escribe: `name`, `primary_color`, `secondary_color`  
- Programa escribe: `purchases_needed`, `reward_name`

### Endpoints (owner-only)

**`PATCH /api/business`** (shell)

```json
{ "name": "string", "primary_color": "#RRGGBB", "secondary_color": "#RRGGBB" }
```

Body parcial permitido; al menos un campo.

**`PATCH /api/loyalty/program`** (módulo loyalty)

```json
{ "purchases_needed": 10, "reward_name": "hamburguesa gratis" }
```

Body parcial permitido; al menos un campo.

### AuthZ

- Cookie session válida  
- `session.businessId === business.id`  
- `session.role === "owner"`  
- Else: 401/403

### Validation

| Field | Rule |
|-------|------|
| `name` | trim, required, length 2–60 |
| `primary_color` / `secondary_color` | `#` + 6 hex digits |
| `purchases_needed` | integer 2–50 |
| `reward_name` | trim, required, length 2–40 |

### Post-save UI

- Revalidate / refresh datos del layout para que header y CSS vars (`--color-primary`, `--color-secondary`, nombre) reflejen el cambio sin confusión de cache.

## Curated palette (marca)

Swatches sugeridos (ajustables en implementación/Pencil):

- Naranja marca `#F97316`  
- Rojo `#EF4444`  
- Ámbar `#F59E0B`  
- Verde `#10B981`  
- Azul `#3B82F6`  
- Violeta `#8B5CF6`  
- Rosa `#EC4899`  
- Ink `#1C1917`  

Custom siempre disponible además de la paleta.

## Pencil artifacts

Nuevos frames en `design-artifacts/ui-example.pen`, alineados al sistema visual existente (`$surface`, `$border`, `$ink`, `$primary`, tab bar dueño):

1. `8 · Dueño · Ajustes` — form editable + preview marca + Guardar + link programa + logout  
2. `9 · Dueño · Programa` — stepper N + premio + preview regla + Guardar  

Reutilizar patrones de cards de `5 · Dueño · Dashboard` y `7 · Dueño · QR programa`.

## Error & edge cases

| Scenario | Behavior |
|----------|----------|
| Nombre vacío o menor a 2 chars | Error inline; Guardar disabled |
| Hex inválido | No aplica al preview; error en custom |
| N fuera de 2–50 | Clamp en stepper; reject en API |
| Premio vacío | Error inline |
| Sin cambios | Guardar disabled |
| Red falla | Toast/mensaje error; form conserva valores |
| Employee abre URL | Redirect a loyalty panel o 403 API |
| Double tap Guardar | Guard anti double-submit (disabled while pending) |

## Testing (implementation phase)

- Validación unit de schemas  
- API: owner OK; employee 403; unauth 401; body inválido 400  
- UI: dirty state, preview updates, save success path (TDD del repo)  
- Regression: settings ya no dice “solo lectura / contactá soporte” para estos campos  
- Regression: canje sigue usando `purchases_needed` actualizado

## Open decisions (resolved in brainstorm)

| Topic | Decision |
|-------|----------|
| Scope campos v1 | name, colors, purchases_needed, reward_name |
| Dónde vive la regla | Fidelización (no Ajustes) |
| Patrón UX | Always-editable + Guardar si dirty + toast |
| Colores | Paleta curada + custom + preview |
| Estructura | Approach A (dos pantallas + link suave) |

## Out of scope follow-ups

- Editar logo / ubicación  
- Poster imprimible (ya “próximamente” en QR)  
- Historial de cambios de programa  
- Confirmación especial si bajar umbral deja muchos clientes “listos para canjear”
