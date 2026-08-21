# Pedidos - User Flows & States (Versión clara y completa)
**Fecha:** 19 de agosto de 2026  
**Cliente de referencia:** El Auténtico Carri (food truck)  
**Objetivo:** Documentar **todos** los flujos posibles del módulo de Pedidos de forma clara, sin ambigüedades y sin dejar huecos importantes. Este documento es la base para el diseño visual y la implementación.

---

## 1. Principios del Módulo (muy importante leer)

- Solo existen **dos formas de pago**: 
  - Transferencia (el cliente debe subir foto del comprobante)
  - Efectivo al retirar (paga cuando llega al food truck)
- Los puntos de **Fidelización** se suman **automáticamente** solo cuando el empleado marca el pedido como **"Entregado"**. 
- Si el pedido se cancela antes de marcarlo como entregado, **no se suman puntos**.
- El sistema **siempre crea** un cliente en la tabla `customers` usando el número de teléfono (aunque el comercio no tenga activado el módulo de Fidelización). Esto acumula información valiosa para el futuro.
- El cliente **no tiene que mostrar ningún código**. Todo es automático.
- En el dashboard del food truck, los **comprobantes pendientes** deben verse de forma muy visible (color naranja fuerte) porque es lo más crítico para Carri.
- El empleado **debe confirmar** el pedido antes de empezar a prepararlo (para evitar que dos cocineros hagan el mismo pedido al mismo tiempo).
- El cliente puede volver en cualquier momento al link del pedido para ver su estado actual.

---

## 2. Tabla de Estados del Pedido (la más importante)

| Estado Interno           | Qué ve el Cliente              | Qué ve el Empleado               | Significado práctico                                      | ¿Suma puntos? | ¿Se puede cancelar? |
|--------------------------|--------------------------------|----------------------------------|-----------------------------------------------------------|---------------|---------------------|
| `pending`                | Pendiente                      | Pendiente de confirmación        | Pedido recién creado, aún no confirmado                   | No            | Sí                  |
| `pending_receipt`        | Pendiente de comprobante       | Comprobante pendiente            | Cliente debe subir foto del comprobante                   | No            | Sí                  |
| `pending_verification`   | Comprobante enviado            | Revisar comprobante              | Empleado debe ver la foto y aprobar o rechazar           | No            | Sí                  |
| `confirmed`              | Confirmado                     | Confirmado                       | Empleado confirmó que el pedido va a cocina               | No            | Sí                  |
| `preparing`              | En preparación                 | En preparación                   | Se está cocinando/preparando                              | No            | Sí                  |
| `ready`                  | Listo para retirar             | Listo                            | El pedido ya está preparado y esperando al cliente       | No            | Sí                  |
| `delivered`              | Entregado                      | Entregado                        | El cliente ya retiró el pedido                            | **Sí**        | No                  |
| `cancelled`              | Cancelado                      | Cancelado                        | El pedido fue cancelado (por cliente o empleado)         | No            | —                   |
| `rejected`               | Comprobante rechazado          | Comprobante rechazado            | El empleado rechazó el comprobante de transferencia      | No            | Sí                  |

**Regla clave:** Solo cuando se llega al estado **`delivered`** se suman los puntos automáticamente.

---

## 3. Flujo Principal del Cliente (éxito)

1. El cliente entra por link, QR o WhatsApp (`/[slug]/orders`)
2. Ve el catálogo, elige productos, variantes y puede dejar notas ("sin cebolla", "la hamburguesa bien jugosa", etc.)
3. Ve la barra inferior con "Ver mi pedido" y el total
4. Entra al checkout de 3 pasos claros:
   - Paso 1: Revisar lo que pidió
   - Paso 2: Elige si retira en el food truck o quiere envío
   - Paso 3: Pone nombre, WhatsApp y elige forma de pago
5. Confirma el pedido → se genera el **Pedido #17**
6. Ve un mensaje claro:  
   **"¡Perfecto! Cuando retires tu pedido #17 vamos a sumarte X puntos automáticamente en tu tarjeta de fidelización."**
7. Puede cerrar la página. Si quiere, puede volver después usando el mismo link para ver el estado de su pedido.

---

## 4. Flujo del Food Truck (Dashboard)

1. El pedido nuevo aparece en la lista (los más nuevos arriba).
2. Si es por transferencia, aparece primero en una sección destacada llamada **"Comprobantes Pendientes"** (con color naranja fuerte).
3. El empleado toca el pedido:
   - Ve los productos, notas del cliente y foto del comprobante (si corresponde).
   - Tiene un botón grande **"APROBAR PAGO"**.
4. Una vez aprobado el pago (o si es pago al retirar), el empleado **debe confirmar** el pedido antes de que pase a "En preparación".
5. Flujo normal de cocina: Confirmado → En preparación → Listo → **Entregado**.
6. Cuando el empleado marca el pedido como **"Entregado"**, el sistema suma los puntos automáticamente (si el comercio tiene Fidelización activo).

---

## 5. Flujos de Error y Casos Especiales

- **Producto se agota mientras el cliente está pagando**: El servidor revisa todo al confirmar. Si ya no hay stock, avisa al cliente y saca el producto del carrito.
- **Comprobante rechazado**: El pedido vuelve a estado "Comprobante rechazado". El cliente ve un mensaje claro y puede subir otra foto.
- **Cliente nunca sube el comprobante**: El pedido queda como "Pendiente de comprobante". Después de cierto tiempo el empleado puede cancelarlo manualmente.
- **Cliente cancela su pedido**: Puede hacerlo mientras el pedido no esté confirmado o en preparación.
- **Empleado cancela un pedido**: Puede hacerlo en casi cualquier estado (excepto entregado). Si el cliente ya pagó con transferencia, debe devolverle la plata manualmente.
- **Cliente vuelve después de días**: El link del pedido sigue funcionando y muestra el estado final (Entregado, Cancelado, etc.).

---

## 6. Integración con Fidelización

- Cada vez que alguien pide, el sistema busca el teléfono en la tabla `customers`.
- Si no existe → crea el cliente automáticamente y le genera un código de 4 dígitos.
- Solo cuando el pedido llega a estado **"Entregado"** se suman los puntos (siguiendo las reglas y rangos de precio que ya existen hoy).
- Si el comercio no tiene el módulo de Fidelización activado → igual se crea el cliente (para tener los datos), pero no se suman puntos.
- En la confirmación se le avisa al cliente que va a sumar puntos (aunque la suma real ocurra después, cuando retire el pedido).

---

## 7. Flujo 4 – Owner: Dashboard y Gestión de Catálogo

**Quién lo usa:** el **dueño del comercio** (owner).  
**Por qué existe:** el verdadero cliente de Tumo es el comercio. El owner necesita un lugar claro para ver cómo va el día **y** armar/mantener su menú solo (productos, precios, categorías, variantes, orden). No depende de Nómade para cargar la carta.

**Quién no lo usa en el apuro de cocina:** el empleado de turno. El empleado trabaja el **panel de pedidos (08)** y **Productos de hoy (10)**. No edita precios ni variantes desde cocina.

**Mapa de pantallas de este flujo:**

| # | Pantalla | Rol |
|---|----------|-----|
| **14** | Pedidos (dashboard de entrada) | Primera pantalla del módulo para el owner |
| **11** | Mis Productos | Lista del menú por categoría |
| **12** | Editar / Nuevo Producto | Alta y edición de un producto |
| **13** | Variantes del Producto | Lista de grupos de un producto |
| **13b** | Editar grupo de variantes | Configurar un grupo y sus opciones |
| **13c** | Editar opción | Nombre, delta de precio, disponible de la opción |
| **10** | Productos de hoy *(Flow 3)* | **Única** pantalla de “Disponible / Agotado hoy” |

---

### 7.1 Descripción del flujo completo (de punta a punta)

1. El owner entra al módulo **Pedidos** y aterriza en la pantalla de entrada **(14)**.
2. Ahí ve métricas del día, accesos grandes y la actividad reciente.
3. Desde la 14 puede ir a:
   - **Ver todos los pedidos** → panel de cocina (08)
   - **Gestionar mis productos** → Mis Productos (11)
   - **Productos de hoy** → pantalla 10 (agotados del turno)
   - **+ Nuevo producto** → Editar/Nuevo producto (12) vacío
4. En **Mis Productos (11)** ve el menú agrupado por categoría, reordena, edita o crea.
5. En **Editar producto (12)** completa foto, nombre, descripción, precio, categoría y **Destacado**.  
   **No** hay toggle “Disponible hoy”.
6. Toca **Gestionar variantes** → **Variantes del producto (13)** (lista de grupos).
7. Toca un grupo o “Agregar grupo” → **Editar grupo (13b)**.
8. Toca una opción o “Agregar opción” → **Editar opción (13c)**.
9. Guarda en cada nivel. El catálogo público del cliente se actualiza.
10. La disponibilidad del día se sigue marcando **solo** en **Productos de hoy (10)**.

---

### 7.2 Reglas de negocio

| Regla | Detalle |
|-------|---------|
| **Entrada del owner** | La primera pantalla del módulo Pedidos para el owner es la **14 (Dashboard)**. |
| **Quién edita el catálogo** | Solo owner (o rol con permiso de gestión). |
| **Disponible hoy ≠ catálogo** | Solo en pantalla **10**. Ni en 12, ni en 13, ni en 13b/13c como “agotado del día”. |
| **Disponible de una opción** | En **13c** puede haber “opción disponible” (ej. se quedó sin bacon de forma semi-permanente). Es distinto de “agotado hoy” del producto entero. |
| **Destacado** | Toggle en **12**. Destacados primero en el catálogo del cliente. |
| **Orden público** | 1) Destacados (su orden) → 2) Resto por categoría y orden dentro de la categoría. |
| **Reordenar productos** | Solo **dentro de la misma categoría** en pantalla **11**. |
| **Variantes** | Cero o más **grupos** por producto. Cada grupo: nombre, única/múltiple, obligatorio. Cada opción: nombre, delta de precio, disponible. |
| **Precio al cliente** | Base + deltas elegidos. |
| **Snapshots** | Cambiar precio/variantes no reescribe pedidos ya creados. |
| **Producto sin foto** | Se puede guardar; el catálogo muestra placeholder. |

---

### 7.3 Pantalla 14 – Pedidos (dashboard de entrada)

**Para qué sirve:** home del módulo para el owner. Entender el día en 2 segundos y saltar a lo importante.

**Qué se ve:**
- Header: **“Pedidos”** + fecha del día.
- **4 métricas rápidas** (tarjetas grandes, números legibles):
  1. **Pedidos hoy**
  2. **Ingresos hoy** (solo pedidos con pago confirmado / cobrados, según la regla de métricas del negocio)
  3. **Comprobantes pendientes** (si > 0, resaltado naranja)
  4. **Ticket promedio** (ingresos ÷ pedidos del día, o “—” si no hay pedidos)
- **Accesos directos** (botones grandes, una acción clara cada uno):
  1. **Ver todos los pedidos** → panel 08 (cocina / lista del día)
  2. **Gestionar mis productos** → pantalla 11
  3. **Productos de hoy** → pantalla 10
- Sección **Actividad reciente**: últimos pedidos con número, cliente/monto y **estado actual** (lenguaje simple: En preparación, Listo, Entregado, Revisar pago, etc.).
- Botón flotante **“+ Nuevo producto”** → pantalla 12 en modo alta.

**Qué se puede hacer:**
- Leer el pulso del día
- Ir al panel operativo, al catálogo o a agotados del día
- Crear un producto sin pasar por Mis Productos

**Qué no se hace acá:**
- No se editan variantes ni se aprueban comprobantes en detalle (eso es 08 / 08b)
- No se marca agotado (eso es 10)

---

### 7.4 Pantalla 11 – Mis Productos

**Para qué sirve:** ver y administrar todo el menú.

**Qué se ve:**
- Título **Mis Productos**
- Lista vertical **agrupada por categoría**
- Cada card: foto, nombre, precio base, etiqueta si es **Destacado**, botón **Editar**
- Controles de orden **↑ ↓** y/o manija drag **dentro de la categoría**
- Botón grande **“+” / Nuevo producto**
- Link claro a **Productos de hoy**: “Para marcar agotados del día →”

**Qué se puede hacer:** crear, editar, reordenar dentro de categoría.  
**Qué no:** marcar agotado hoy; cocinar; aprobar pagos.

---

### 7.5 Pantalla 12 – Editar / Nuevo Producto

**Para qué sirve:** alta o edición de un producto.

**Campos:**
- Foto (subir / cambiar)
- Nombre
- Descripción
- Precio base
- Categoría
- Toggle **Destacado · Más vendidos** + ayuda: “Se muestra primero en el menú del cliente.”
- Botón grande **Gestionar variantes** → pantalla 13  
  Resumen si ya hay: “2 grupos · 5 opciones”
- **Guardar** / Volver

**Prohibido en esta pantalla:** toggle “Disponible hoy”.  
Texto de ayuda: “La disponibilidad del día se marca en Productos de hoy.”

---

### 7.6 Pantalla 13 – Variantes del Producto

**Para qué sirve:** ver todos los **grupos** de un producto y entrar a editarlos.

**Conceptos:**
- **Grupo** = pregunta al cliente (Tamaño, Extras, Sin…)
- **Opción** = respuesta (Grande +$800, Extra queso +$400)

**Qué se ve:**
- Contexto: nombre del producto
- Lista de grupos (nombre + chips: Una sola / Varias, Obligatoria / Opcional + cantidad de opciones)
- Botón **+ Agregar grupo** → 13b en modo alta
- Tocar un grupo → 13b en modo edición
- **Listo · Volver al producto** → 12

**No se editan acá** los campos finos del grupo ni de cada opción (eso es 13b y 13c).

---

### 7.7 Pantalla 13b – Editar grupo de variantes

**Para qué sirve:** configurar **un** grupo completo.

**Qué se ve y se edita:**
- Nombre del grupo (ej. “Tamaño”)
- Tipo de selección:
  - **Una sola opción** (el cliente elige una)
  - **Varias opciones** (puede marcar varias)
- Toggle / control **Obligatorio** (sobre todo útil en “una sola”)
- Lista de **opciones** del grupo (nombre + delta visibles)
- Cada fila de opción es tappeable → **13c**
- Botón **+ Agregar opción** → 13c en alta
- Controles de orden de opciones (↑ ↓)
- **Guardar grupo** / Eliminar grupo (con confirmación) / Volver

---

### 7.8 Pantalla 13c – Editar opción

**Para qué sirve:** editar una opción dentro de un grupo. Puede ser **pantalla completa simple** o **modal grande** (misma info).

**Campos:**
- Nombre de la opción (ej. “Grande”, “Extra queso”)
- **Delta de precio** (ej. +$ 800, $ 0)
- Toggle **Disponible** (si está off, el cliente no la ve o la ve deshabilitada; **no** es el agotado del producto del día)
- **Guardar** / Eliminar opción (con confirmación) / Cancelar

---

### 7.9 Cómo se relaciona con el resto del sistema

| Pantalla | Relación |
|----------|----------|
| **14 Dashboard** | Entrada owner del módulo Pedidos |
| **08 / 08b / 09** | Operación del día (cocina y pagos). Se llega desde 14 → “Ver todos los pedidos” |
| **10 Productos de hoy** | Única UI de agotado del turno. Se llega desde 14 o desde 11 |
| **01 / 02 (cliente)** | Consumen catálogo, Destacados, variantes y precios definidos en 11–13c |
| **11–13c** | ABM del menú |

**Regla de oro:**

> - **14** = “¿Cómo va el día y a dónde voy?”  
> - **11–13c** = “¿Qué vendo y a qué precio?”  
> - **10** = “¿Qué me queda para vender **ahora**?”  
> - **08** = “¿Qué tengo que cocinar / cobrar?”

---

### 7.10 Reordenamiento y Destacado (resumen)

**Reorden (11):** solo dentro de la categoría; ↑ ↓ obligatorios; drag opcional; producto nuevo al final de su categoría.

**Destacado (12):** si está on, el producto va primero en el catálogo del cliente; entre destacados manda el orden definido; puede estar destacado y a la vez agotado hoy (10).

---

### 7.11 Mini-flujos del owner

**Alta con variantes:**  
14 → + Nuevo producto → 12 → Gestionar variantes → 13 → + Grupo → 13b → + Opción → 13c → guardar en cadena → 11 (reordenar si hace falta).

**Solo precio:** 14 → Mis productos → Editar → cambiar precio → Guardar.

**Agotado a las 23:00:** 14 → Productos de hoy → toggle Agotado. Sin tocar 11–13.

**Destacar lomito:** 11 → Editar → Destacado on → Guardar.

---

### 7.12 Fuera de este flujo

- Panel de cocina y aprobación de comprobantes (Flow 3).
- Carga masiva Excel / múltiples sucursales.
- “Disponible hoy” dentro de Editar Producto.

---

## 8. Preguntas abiertas (para definir antes de diseñar / implementar)

1. ¿Cuánto tiempo debe pasar antes de que un comprobante pendiente pueda ser cancelado automáticamente por el sistema o por el empleado?
2. ¿En la confirmación al cliente querés mostrar un estimado real de puntos ("Vas a sumar 180 puntos") o solo un mensaje genérico?
3. ¿El cliente debe poder cancelar su propio pedido desde su vista (`/[slug]/orders/[id]`) incluso después de haber subido el comprobante?
4. ¿Querés que cuando el pedido esté "Listo", el cliente reciba algún tipo de mensaje o solo lo vea cuando entre al link?
5. En Gestión de Catálogo: ¿el owner puede **borrar** una categoría con productos adentro, o primero debe mover/borrar los productos?
6. ¿Los deltas de precio de variantes pueden ser **negativos** (descuentos por opción) en el MVP, o solo $0 / positivos?

---

**Archivo guardado en:**  
`/home/imn0p/tumo/tumo-app/docs/pedidos/pedidos-user-flows-and-states.md`

Este documento está escrito de forma muy clara y explícita para que cualquier persona (o IA) pueda entender exactamente cómo debe comportarse el sistema.