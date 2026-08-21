# Tumo — Módulo de Pedidos: PRD final (Carri)

**Fecha:** 2026-08-18  
**Estado:** PRD consolidado — pendiente OK Nobel en 3 puntos  
**Cliente piloto:** El Auténtico Carri (food truck, Villa Dolores, Córdoba)  
**Marca:** primary `#F97316` · secondary `#FACC15`  
**Constraint UX:** público 50–70 años · test "¿lo entiende mi abuelo?" · mobile-first 375px  
**Fuente primaria:** `docs/superpowers/specs/2026-08-12-orders-module-design.md` (historial; no se pisa)  
**Vista previa cliente:** `/home/imn0p/tumo/docs/carri-preview-pedidos/` (README + 6 screens)

Este documento es la **fuente de verdad** del MVP de Pedidos. Consolida el diseño del 12/ago, cierra las 16 decisiones abiertas (salvo 3 que requieren OK de Nobel) y corrige errores de alcance de resúmenes de terceros.

---

## 0. Decisiones de Nobel (aprobadas)

Las tres decisiones pendientes quedaron **aprobadas** el 19/08/2026.

### OK-1 · Numeración de pedidos (`order_number`) — Aprobado

| | |
|--|--|
| **Decisión final** | **Global creciente** por negocio (`UNIQUE(business_id, order_number)`). No resetea por día. |

### OK-2 · Control de horarios / recepción — Aprobado

| | |
|--|--|
| **Decisión final** | Carri controla la recepción en el MVP con el switch **“Recibiendo pedidos”** (`is_paused`). Editor completo de horarios (días y franjas) = **post-MVP**. Horarios base siguen en `orders_settings.hours` vía seed/SQL. |

### OK-3 · Costo de envío — Aprobado

| | |
|--|--|
| **Decisión final** | **Costo de envío único** (fee fijo configurable por negocio) en `orders_settings.delivery_fee_cents`. Valor a definir después; por ahora default **$0 = gratis**. Dirección de envío = texto libre. |

---

## 1. Resumen de decisiones

### 1.1 Producto (cerradas desde el 12/ago)

| Tema | Decisión |
|------|----------|
| Enfoque | Pedido nace al **confirmar checkout**; carrito 100% client-side (`localStorage`); loyalty **manual** |
| Métodos de pago | Transferencia · MercadoPago · **Pagás al retirar** |
| Envío | Costo fijo configurable por negocio (`$0` = gratis); dirección texto libre |
| Horarios | Bloquear pedidos fuera de horario (JSON semanal; soporta cruce de medianoche) |
| Producto agotado | Toggle “Disponible hoy” en el panel (**sin** ABM de productos) |
| Comprobantes | `BYTEA` en Postgres; compresión client-side |
| Loyalty | Sin import cruzado entre módulos; reusa `customers` + link al panel con `?highlight=` |
| Identidad cliente | Teléfono = ID primario; match `(phone, business_id)`; cookie `client_id` del shell |
| Totales | Siempre **server-side**; UI del cliente es informativa |
| Auth panel | Sesión empleado/owner (mismo patrón loyalty) |
| Catálogo inicial | Seed cargado por Estudio Nómade (~20 productos con variantes) |

### 1.2 Cierre de las 16 decisiones abiertas (§8 del spec 12/ago)

| # | Tema | Estado | Decisión aplicada |
|---|------|--------|-------------------|
| 1 | `order_number` global vs por día | Cerrada | **Global creciente** (Nobel 19/08/2026). |
| 2 | Credenciales MercadoPago | Cerrada | Env vars de plataforma: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`. Un negocio hoy. |
| 3 | Editor de horarios en UI | Cerrada | MVP: control con switch **“Recibiendo pedidos”** (`is_paused`). Editor completo de días/franjas = post-MVP. Horarios base seed/SQL. (Nobel 19/08/2026). |
| 4 | Horarios compartidos entre módulos | Cerrada | Quedan en `orders_settings.hours`. **No** subir a shell en MVP. |
| 5 | Dirección para “retiro” | Cerrada | Texto en `orders_settings.pickup_address` (columna a sumar en implementación; no reusar solo `businesses.location` sin campo dedicado). |
| 6 | Acreditación automática de loyalty | Cerrada | **No.** Empleado suma a mano (+ link “Sumar compra en Fidelización”). |
| 7 | Notificaciones WhatsApp automáticas | Cerrada | **No / fuera de MVP.** Empleado usa `wa.me` manual. |
| 8 | Cron limpieza MP abandonados | Cerrada | **No.** Empleado cancela a mano. |
| 9 | Reembolsos MP integrados | Cerrada | **No.** Manual fuera de la app. |
| 10 | ABM completo de productos | Cerrada | **No.** Seed + toggle disponibilidad. |
| 11 | Historial + tracking live del cliente | Cerrada | **No.** La ruta `/orders/[id]` existe y crece después. |
| 12 | Zonas / fee de envío | Cerrada | **Fee fijo único** configurable (`orders_settings.delivery_fee_cents`); valor a definir; default $0 = gratis. (Nobel 19/08/2026). |
| 13 | Propina | Cerrada | **No.** |
| 14 | Múltiples sucursales | Cerrada | **No.** |
| 15 | Sonido / badge pedido nuevo | Cerrada | **No.** Poll 20s + on focus (patrón loyalty). |
| 16 | TZ de horarios | Cerrada | **`America/Argentina/Cordoba`**. |

### 1.3 Corrección de alcance (resúmenes de terceros)

Una explicación oral/PDF de la vista previa **erró** dos puntos. Mandan el spec del 12/ago y el README de la preview oficial:

| Feature | ¿En MVP? | Qué hay en su lugar |
|---------|----------|---------------------|
| Avisos automáticos por WhatsApp al cambiar estado | **FUERA** | Botón “Escribirle por WhatsApp” (`wa.me`) en detalle del pedido |
| Que el cliente vea el pedido “en vivo” paso a paso | **FUERA** | `/[slug]/orders/[id]` = confirmación + acciones de pago pendiente; lista para tracking futuro |

---

## 2. Modelo de datos

Migración nueva al implementar (el spec histórico dice `003_orders.sql`; en el repo actual `003` ya es loyalty points-native → el archivo de migración será el **siguiente correlativo disponible**, p. ej. `004_orders.sql`). El SQL de dominio **no cambia**.

Precios en **centavos INT**. Todo lo que entra en un pedido se guarda como **snapshot** (nombre/precio al momento de la compra). Tabla `customers` **no se altera** (solo upsert de filas).

```sql
-- Catálogo
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  category_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL,
  photo TEXT,                          -- URL (seed: assets en /public)
  is_available BOOLEAN DEFAULT true,   -- toggle "Disponible hoy"
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Variantes: grupos ("Tamaño") + opciones ("Grande +$800")
CREATE TABLE product_variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single',  -- 'single' | 'multiple'
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

CREATE TABLE product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta_cents INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number INT NOT NULL,                -- correlativo por negocio: "Pedido #17"
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,             -- 'transfer' | 'mercadopago' | 'at_pickup'
  payment_status TEXT NOT NULL,             -- set at insert by method: at_pickup→unpaid | transfer→pending_receipt | mercadopago→pending
  fulfillment TEXT NOT NULL,                -- 'pickup' | 'delivery'
  delivery_address TEXT,
  delivery_fee_cents INT DEFAULT 0,         -- snapshot
  subtotal_cents INT NOT NULL,              -- calculado server-side
  total_cents INT NOT NULL,
  notes TEXT,
  idempotency_key TEXT UNIQUE,              -- anti doble-tap
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, order_number)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),  -- nullable si el producto se borra después
  product_name TEXT NOT NULL,               -- snapshot
  quantity INT NOT NULL,                    -- tope 20
  unit_price_cents INT NOT NULL,            -- snapshot: base + deltas
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,                 -- snapshot
  option_name TEXT NOT NULL,                -- snapshot
  price_delta_cents INT NOT NULL DEFAULT 0  -- snapshot
);

-- Pagos: una fila por INTENTO (re-subida / reintento MP).
-- orders.payment_status = estado actual denormalizado (lo que lee el panel).
-- order_payments = historial de intentos; la fila más reciente manda.
CREATE TABLE order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL,                      -- mismos valores que orders.payment_status
  receipt_image BYTEA,                      -- imagen comprimida en browser (tope ~3MB)
  receipt_mime TEXT,
  mp_preference_id TEXT,
  mp_payment_id TEXT UNIQUE,                -- dedupe webhooks
  mp_status TEXT,
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Config del módulo por negocio (seed/manual en MVP)
CREATE TABLE orders_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  delivery_fee_cents INT DEFAULT 0,         -- 0 = envío gratis
  transfer_alias TEXT,
  transfer_cbu TEXT,
  transfer_holder TEXT,
  mp_enabled BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,          -- kill switch "Pausar pedidos"
  hours JSONB NOT NULL
  -- forma: {"0":{"closed":true},"1":{"open":"19:00","close":"01:00","closed":false},...}
  -- días 0–6 (0=domingo, JS getDay); close < open = cruza medianoche
);
```

### Notas del modelo

- **`customers` sin ALTER.** Orders hace upsert por `(phone, business_id)` y genera `code` de 4 dígitos si el cliente es nuevo.
- **Dos ejes:** `status` (comida) y `payment_status` (dinero).
- **Comprobantes en Postgres (`BYTEA`).** Compresión client-side (max 1600px → JPEG ~400KB) antes de subir; tope ~3MB post-compresión.
- **`order_number`:** default MVP = correlativo **global** por negocio (sujeto a OK-1).
- **Totales siempre server-side.**
- **Delta de cierre OK-5 (implementación):** agregar `pickup_address TEXT` a `orders_settings` para el texto del card “Lo retiro en el food truck”. No está en el bloque SQL histórico de arriba; se suma al migrar sin alterar el resto del modelo.
- **TZ:** evaluación de `hours` con `America/Argentina/Cordoba`.

### Estructura del módulo (sin código aún)

```
modules/orders/
├── index.ts                 # manifiesto Module
├── lib/
│   └── types.ts
├── public/
│   ├── catalog.tsx
│   ├── product-detail.tsx
│   ├── cart.tsx             # wizard 3 pasos
│   └── order-confirmation.tsx
├── dashboard/
│   ├── panel.tsx
│   ├── order-detail.tsx
│   ├── products-availability.tsx
│   ├── widgets.tsx
│   └── home-section.tsx
└── api/
    ├── catalog.ts
    ├── orders.ts
    ├── products.ts          # toggle disponibilidad
    ├── mercadopago.ts       # preference + webhook
    └── metrics.ts
```

Registro en `lib/modules.ts` (`registry.orders`) y wiring en `app/` (thin adapters). `active_modules` del negocio Carri suma `"orders"`.

### API (alto nivel)

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| GET | `/api/orders/catalog?slug=` | pública | catálogo + settings (open/closed, fee) |
| POST | `/api/orders` | pública | crear pedido (revalida todo) |
| GET | `/api/orders/[id]` | pública* | confirmación (*match cookie o UUID opaco) |
| POST | `/api/orders/[id]/receipt` | pública* | subir comprobante |
| POST | `/api/orders/[id]/mp-preference` | pública* | crear/regenerar preference |
| PATCH | `/api/orders/[id]/payment-method` | pública* | cambiar método si `status=pending` |
| POST | `/api/orders/mercadopago/webhook` | firma MP | webhook |
| GET | `/api/orders?status=` | employee | lista panel |
| PATCH | `/api/orders/[id]` | employee | transiciones de estado / verificar pago |
| PATCH | `/api/orders/products/[id]/availability` | employee | toggle |
| GET | `/api/orders/metrics` | owner | widgets |

---

## 3. Flujo del cliente

```
1. Entra a /[slug]/orders (link IG / WhatsApp / QR)
2. ¿Cerrado (horarios) o pausado (is_paused)?
   → Sí: banner "Cerrado ahora · Abrimos hoy a las 19:00"
      catálogo visible, Agregar deshabilitado. Fin.
   → No: sigue
3. Explora catálogo (chips de categoría + buscador opcional)
4. Toca producto
   → Sin variantes: +1 al carrito localStorage + toast "Agregado ✓"
   → Con variantes: /orders/producto/[id] → elige → Agregar
5. Barra inferior fija: "Ver mi pedido · N ítems · $X" (si hay carrito)
6. Carrito = wizard 3 pasos:
   Paso 1 "Tu pedido"          → ítems, cantidades, quitar
   Paso 2 "¿Cómo lo recibís?"  → Retiro | Envío (+ dirección + fee)
   Paso 3 "Pago y tus datos"   → nombre, WhatsApp, método, notas, confirmar
7. Al confirmar, el server:
   - revalida horarios, is_paused, disponibilidad, precios
   - upsert customer por (phone, business_id)
   - crea order + items + variants (snapshots) con idempotency_key
   - setea payment_status según método
8. Según método:
   a) at_pickup    → confirmación (#pedido + qué sigue)
   b) transfer     → confirmación con alias/CBU + subir comprobante
   c) mercadopago  → "Te llevamos a MercadoPago" → redirect → vuelve
9. Confirmación bookmarkable: /[slug]/orders/[id]
   - Si abandonó el comprobante: banner en catálogo
     "Tenés un pedido esperando la foto del comprobante"
   - Si MP falló: reintentar o cambiar método
```

### Decisiones de UX del flujo

| Decisión | Justificación |
|----------|---------------|
| Wizard 3 pasos (no una página larga) | "Una cosa por pantalla"; el abuelo siempre sabe qué hacer |
| Carrito 100% `localStorage` (`tumo_cart_<slug>`) | Cero auth, cero tablas extra; suficiente a este volumen |
| Identidad en el paso 3, no al entrar | Explorar el menú sin fricción |
| Cookie `client_id` (misma de loyalty) | Prefill si ya es cliente; cero re-registro |
| Teléfono = ID primario | Sin email. Match `(phone, business_id)` |
| Totales del cliente = informativos | Server es la fuente de verdad al crear |
| Confirmación = `/orders/[id]` | Nace lista para tracking post-MVP; en MVP = confirmación + pago pendiente |

---

## 4. Flujo de estados

Dos ejes ortogonales. El panel traduce a castellano llano.

### 4.1 `status` (la comida)

| Estado | Significa | Quién lo mueve |
|--------|-----------|----------------|
| `pending` | Recién llegado, aún no se cocina | Sistema (al crear) |
| `confirmed` | Aceptado, va a cocina | Empleado · o auto si MP aprueba |
| `preparing` | Se está cocinando | Empleado |
| `ready` | Listo para retirar / salir a envío | Empleado |
| `completed` | Entregado (limpia el panel activo) | Empleado |
| `cancelled` | Cancelado (terminal) | Empleado |

```
pending → confirmed → preparing → ready → completed
   ↘         ↘           ↘         ↘
             cancelled  (desde cualquiera excepto completed)
```

**Un solo botón grande** = próximo paso:

| status actual | Label del botón |
|---------------|-----------------|
| pending (pago OK o at_pickup) | Confirmar pedido |
| confirmed | Empezar a preparar |
| preparing | Marcar listo |
| ready | Marcar entregado |
| completed / cancelled | (sin CTA) |

Cancelar = link secundario + Dialog de confirmación. Si ya pagó: texto extra “Si ya pagó, devolvé la plata a mano.”

### 4.2 `payment_status` (el dinero)

| Estado | Cuándo nace | Quién lo mueve |
|--------|-------------|----------------|
| `unpaid` | at_pickup al crear | Sistema → Empleado marca cobrado |
| `pending` | MP al crear | Sistema → webhook |
| `pending_receipt` | transfer al crear | Sistema → Cliente sube foto |
| `pending_verification` | transfer, foto subida | Cliente → Empleado verifica |
| `paid` | MP approved · transfer aprobada · at_pickup cobrado | Sistema / Empleado |
| `rejected` | MP rechazado · transfer rechazada | Sistema / Empleado |

### 4.3 Cruces clave

- **Transfer + `pending_verification`:** un solo botón **“Aprobar pago y confirmar”** (`paid` + `confirmed` en un tap). Rechazar → `rejected`, el pedido queda `pending` y el cliente puede re-subir.
- **at_pickup:** se puede cocinar sin cobrar. “Marcar como cobrado” disponible en ready/completed.
- **MP approved (webhook):** auto `payment_status=paid` **y** `status=confirmed`. El empleado arranca en “Empezar a preparar”.

### 4.4 Labels del panel (lo que ve Carri)

| Combo | Label |
|-------|-------|
| transfer + pending_receipt | Falta comprobante |
| transfer + pending_verification | Revisar comprobante ⚠ |
| mercadopago + pending | Pago en proceso |
| at_pickup + unpaid | Paga al retirar |
| * + paid | Pagado ✓ |
| * + rejected | Pago rechazado |

### 4.5 Chips filtro del panel

| Chip UI | Mapeo a `status` |
|---------|------------------|
| Nuevos | `pending` + `confirmed` |
| En preparación | `preparing` |
| Listos | `ready` |
| Entregados | `completed` |
| Todos | sin filtro (incluye `cancelled`) |

---

## 5. MercadoPago

Checkout Pro (redirect). Credenciales MVP = env vars de plataforma (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).

```
Cliente elige MP
  → POST /api/orders                     (crea pedido, payment_status=pending)
  → POST /api/orders/[id]/mp-preference
       Preference:
         items[]
         external_reference = order.id
         back_urls success/failure/pending → /[slug]/orders/[id]?mp=...
         notification_url → /api/orders/mercadopago/webhook
         auto_return = approved
  → redirect a init_point

[Cliente paga en MP]

Webhook POST
  → validar x-signature
  → GET payment a la API de MP (nunca confiar en el body)
  → si approved y no procesado (dedupe mp_payment_id UNIQUE):
       order_payments row + payment_status=paid + status=confirmed
  → si rejected: payment_status=rejected

Cliente vuelve por back_url → confirmación lee el estado real
  approved  → "¡Pago confirmado!"
  rejected  → "El pago no salió" + Reintentar / Cambiar método
  pending   → "Estamos esperando la confirmación de MercadoPago"
```

### Errores y reintentos

| Caso | Respuesta |
|------|-----------|
| Preference falla al crear | Error claro; pedido ya existe; en confirmación: reintentar MP o cambiar a transfer/at_pickup |
| Webhook duplicado | `mp_payment_id UNIQUE` → no-op |
| Cliente abandona MP | Pedido queda pending; confirmación bookmarkable ofrece reintento/cambio; empleado cancela a mano |
| MP caído | "No pudimos conectar con MercadoPago. Probá de nuevo o elegí otro método." |

**Transición UX:** al salir del wizard con método MP, pantalla intermedia ~2s “Te llevamos a MercadoPago para pagar de forma segura” + auto-redirect + botón “Ir a pagar ahora” si el redirect falla.

---

## 6. Integración con loyalty

**Regla:** un módulo nunca importa de otro. Solo comparten lo del shell (`customers`) y pueden linkearse por URL.

| Acción | Cómo | ¿Rompe la regla? |
|--------|------|------------------|
| Reusar cliente | Upsert `(phone, business_id)` en `customers` | No — tabla del shell |
| Prefill nombre/WhatsApp | Cookie `client_id` (la misma de loyalty) | No — cookie del shell |
| Código en confirmación | Lee `customers.code`: "Mostrá tu código XXXX al retirar y sumás tu compra" | No — tabla del shell |
| Recordatorio al empleado | Link "Sumar compra en Fidelización →" a `/[slug]/dashboard/loyalty?highlight=<customerId>` | No — es un `<Link>`. El panel de loyalty **ya soporta** `?highlight=` |
| Acreditar el punto | **No.** El empleado suma a mano como hoy | — |

### Fuera de MVP (loyalty × orders)

- Mostrar puntos en el checkout.
- Acreditar punto automático al marcar listo/entregado.
- Canjear premio por descuento en el pedido.

**Resultado operativo:** loyalty no cambia. Orders regala clientes nuevos (`customers` + `code` al primer pedido). Al entregar, el empleado toca el link y suma el punto en 2 taps.

---

## 7. Edge cases

| # | Situación | Respuesta |
|---|-----------|-----------|
| 1 | Producto se agota con ítems en carritos ajenos | Al confirmar, server revalida `is_available`. Si cayó: no crea el pedido, devuelve ítems caídos, el carrito los saca y muestra "Se agotó X, lo sacamos de tu pedido. Revisá y confirmá de nuevo." |
| 2 | Tap Agregar sobre producto agotado | Botón deshabilitado "Agotado hoy". URL directa: "Este producto no está disponible hoy" + Volver al menú |
| 3 | Comprobante rechazado | `payment_status=rejected`, `status` sigue `pending`. Confirmación permite re-subir. Empleado tiene "Escribirle por WhatsApp" (`wa.me`) — **sin** notifs automáticas |
| 4 | Cliente abandona pago MP | Pedido pending; confirmación ofrece Reintentar / Cambiar método; empleado cancela a mano |
| 5 | MP caído al crear preference | Error claro + reintento/cambio de método en confirmación |
| 6 | Cliente duplicado (mismo tel, otro nombre) | Match `(phone, business_id)`. Se reusa el row **sin pisar el nombre** |
| 7 | Doble-tap en Confirmar | `idempotency_key` UNIQUE por intento. Segundo POST devuelve el mismo order |
| 8 | Cierra el food truck entre catálogo y confirm | Server rechequea horarios + `is_paused`. 409 "Cerramos hace un rato. Abrimos [día] a las [hora]." No crea el pedido |
| 9 | Fee / precios cambian mid-checkout | Server recalcula. Totales del cliente son informativos |
| 10 | Comprobante no-imagen / muy pesado | Mime `image/jpeg\|png\|webp\|heic` + tope 3MB post-compresión. Mensaje: "Subí una foto del comprobante (JPG o PNG)." Browser resize max 1600px |
| 11 | Pedido nuevo con el panel abierto | Poll cada 20s + on focus (patrón loyalty). Sin Realtime. Sin sonido |
| 12 | Cliente nuevo (sin loyalty) | Se crea en `customers` con `code`. Confirmación muestra el código |
| 13 | Cantidad absurda | Cap 20 por ítem (stepper + server) |
| 14 | Webhook MP duplicado / reordenado | Dedupe `mp_payment_id UNIQUE`. Siempre GET a la API de MP |
| 15 | Empleado cancela pedido ya pagado | Permitido. Reembolso **manual fuera de la app**. Detalle: "Si ya pagó, devolvé la plata a mano." |
| 16 | at_pickup nunca se marca cobrado | No bloquea cocina. Métricas de ingresos solo cuentan `paid` |
| 17 | Slug inválido / módulo no activo | 404 con branding (patrón shell) |
| 18 | HEIC de iPhone | Se acepta. Empleado lo ve en su celular; fallback "Abrir imagen" nativo |

*(El spec del 12/ago lista 16 filas nucleares; se mantienen todas. Las filas 17–18 del spec original sobre slug/HEIC se conservan aquí como 17–18.)*

---

## 8. Diseño de pantallas

### 8.0 Reglas transversales (elderly-UX)

- Body ≥16px, títulos ≥20px. Contraste ≥4.5:1. Nunca texto gris claro sobre blanco.
- Touch targets ≥48px; botones primarios ≥56px de alto.
- Una acción clara por pantalla. Iconos **siempre** con label de texto.
- CTA primario = fill sólido `var(--color-primary)` + texto blanco (marca Carri: naranja `#F97316`).
- Cada acción tiene confirmación visible (toast o cambio de pantalla).
- "Volver" en toda sub-pantalla. Máx 2 niveles de profundidad.
- Lenguaje llano. Metáforas: menú, ticket, mostrador. Nunca "dashboard / kanban / workflow".
- Estados vacíos que guían, no que solo reportan.
- Campos de form ≥52px de alto.

### Rutas

```
Público:
  /[slug]/orders                         catálogo
  /[slug]/orders/producto/[id]           detalle de producto
  /[slug]/orders/cart                    wizard checkout
  /[slug]/orders/[id]                    confirmación (+ pago pendiente)

Dashboard:
  /[slug]/dashboard/orders               lista
  /[slug]/dashboard/orders/[id]          detalle
  /[slug]/dashboard/orders/productos     toggles disponibilidad
```

Vista previa visual de referencia (no rediseñar; alinear implementación):

| Screen | Archivo |
|--------|---------|
| Catálogo | `docs/carri-preview-pedidos/screens/01-catalogo.png` |
| Detalle producto | `…/02-detalle-producto.png` |
| Checkout pago | `…/03-checkout-pago.png` |
| Confirmación transferencia | `…/04-confirmacion-transferencia.png` |
| Panel pedidos | `…/05-panel-pedidos.png` |
| Detalle pedido | `…/06-detalle-pedido.png` |

---

### 8.1 Catálogo — `/[slug]/orders`

**Jerarquía al abrir:**

1. Banner de estado (si aplica): cerrado / pausado / "tenés un pedido esperando comprobante"
2. Chips de categoría horizontales (scroll), ≥48px: "Todas · Hamburguesas · Lomitos · Papas · Bebidas"
3. Lista de productos (cards verticales, 1 columna)
4. Barra flotante del carrito (solo si hay ítems)

**Card de producto:**

```
┌─────────────────────────────┐
│  [foto 4:3, ancha]          │
│  Hamburguesa Clásica        │  ← ≥20px bold
│  Pan, carne, lechuga…       │  ← 16px, 2 líneas max
│  $ 4.500                    │  ← ≥22px bold
│  [     Agregar      ]       │  ← 56px, primary fill
└─────────────────────────────┘
```

- Sin variantes → tap Agregar = +1 carrito + toast "Agregado ✓"
- Con variantes → tap Agregar o card = navega a detalle
- Agotado → botón gris deshabilitado "Agotado hoy", card opacidad ~0.7

**Barra del carrito (fixed bottom):**

```
[ Ver mi pedido · 3 ítems · $ 12.500 ]   ← 56px, primary, full width
```

**Buscador:** sticky, opcional. Placeholder "Buscá tu comida". Las categorías son el camino principal.

**Estados:**

| Estado | UI |
|--------|-----|
| Normal | cards + chips |
| Cerrado / pausado | banner ámbar + botones deshabilitados + sin barra de carrito |
| Vacío (sin productos) | "Todavía no hay menú cargado. Volvé más tarde." |
| Cargando | 4 skeleton cards |
| Error | "No pudimos cargar el menú." + "Reintentar" 56px |
| Pedido pendiente de comprobante | banner primary con link a `/orders/[id]` |

**Escala 5→50:** chips filtran; `sort_order`; fotos lazy; scroll nativo. **Una columna** (no grilla de 2).

---

### 8.2 Detalle de producto — `/[slug]/orders/producto/[id]`

**Jerarquía:**

1. Foto grande  
2. Nombre + precio base  
3. Descripción  
4. Grupos de variantes apilados  
5. Cantidad (stepper)  
6. Nota opcional  
7. CTA fixed bottom: "Agregar · $ X.XXX" (total live = (base + deltas) × qty)

**Variante single (radio), rows 56px:**

```
Tamaño · Elegí una
┌─────────────────────────────┐
│ ○  Chico              $ 0   │
│ ●  Grande          +$ 800   │
└─────────────────────────────┘
```

**Variante multiple (checkbox), rows 56px:**

```
Extras · Podés elegir varias
┌─────────────────────────────┐
│ ☐  Extra queso     +$ 400   │
│ ☑  Huevo           +$ 300   │
└─────────────────────────────┘
```

**Stepper:** botones `−` / `+` 56×56, número 22px bold al centro. Rango 1–20.

**Nota:** campo ≥52px "¿Algo que tengamos que saber? (opcional)".

**Estados:**

| Estado | UI |
|--------|-----|
| Normal | editable |
| Grupo required sin elegir | tap CTA → scroll al grupo + borde rojo + "Elegí un tamaño" |
| Agotado | CTA deshabilitado "Agotado hoy" |
| Cargando | skeleton |
| Error / 404 | "No encontramos este producto" + "Volver al menú" |

Volver → catálogo. Al agregar → catálogo + toast + barra actualizada.

---

### 8.3 Carrito / checkout — `/[slug]/orders/cart` (wizard)

Indicador textual: **"Paso 1 de 3"** (no dots). Volver = paso anterior (o catálogo en el 1).

#### Paso 1 — "Tu pedido"

```
Paso 1 de 3 · Tu pedido

┌─ ítem ──────────────────────┐
│ [thumb] Hamburguesa Grande  │
│         Extra queso         │
│         −  2  +     $ 9.600 │
│         [Quitar]            │
│         nota: "sin sal"     │
└─────────────────────────────┘

Subtotal  $ 12.500

[ Continuar → ]  56px
```

- Empty: "Tu pedido está vacío" + "Ver el menú" 56px.
- Quitar → toast con **Deshacer** 3s (reversible).

#### Paso 2 — "¿Cómo lo recibís?"

Dos cards ≥100px, selección radio:

```
┌─────────────────────────────┐
│ ◎  Lo retiro en el food truck│
│    El Auténtico Carri        │
│    Villa Dolores             │  ← pickup_address / ubicación
└─────────────────────────────┘
┌─────────────────────────────┐
│ ○  Me lo envían              │
│    Costo de envío: $ 500     │  ← delivery_fee_cents (OK-3)
└─────────────────────────────┘

[si envío]
¿A dónde lo mandamos?
[________________________________]  ≥52px
placeholder: "Calle y número, barrio"
```

Validación: envío + dirección vacía → "Escribí la dirección" al Continuar.

#### Paso 3 — "Pago y tus datos"

```
Paso 3 de 3 · Pago y tus datos

Tu nombre
[________________________________] ≥52px

Tu WhatsApp
[________________________________] ≥52px  inputMode=tel
  (prefill si hay cookie client_id)

¿Algo que Carri tenga que saber? (opcional)
[________________________________]

¿Cómo pagás?
┌──────────────────────────────┐
│ ○  Transferencia              │
│    Pasás la plata y subís     │
│    la foto del comprobante    │
└──────────────────────────────┘
┌──────────────────────────────┐
│ ○  MercadoPago                │
│    Tarjeta, dinero en cuenta  │
│    o efectivo en pago fácil   │
└──────────────────────────────┘
┌──────────────────────────────┐
│ ◎  Pagás al retirar           │
│    Efectivo u otro medio      │
│    en el food truck           │
└──────────────────────────────┘

┌─ resumen ───────────────────┐
│ 3 ítems              $12.000│
│ Envío                   $500│
│ TOTAL                $12.500│  ← ≥22px bold
└─────────────────────────────┘

[ Confirmar pedido · $ 12.500 ]  56px primary
```

- Validación: nombre no vacío, WhatsApp ≥10 dígitos, método elegido.
- Al confirmar: botón "Confirmando…" disabled + `idempotency_key`.
- Error server: mensaje arriba del CTA, no navega.

---

### 8.4 Confirmación — `/[slug]/orders/[id]`

Misma ruta para: confirmación, subir comprobante, reintentar MP, y (**futuro**) tracking.  
**MVP: no es tracking en vivo** — solo confirmación + acciones de pago pendiente.

#### Variante A — OK (at_pickup · transfer con foto · MP approved)

```
        ✓
¡Pedido recibido!
Pedido #17

┌─ resumen ───────────────────┐
│ 2× Hamburguesa Grande       │
│ 1× Papas                    │
│ TOTAL  $ 12.500 · Pagás al  │
│ retirar                     │
│ Lo retirás en el food truck │
└─────────────────────────────┘

¿Qué sigue?
1. Carri confirma tu pedido
2. Lo prepara
3. Lo retirás mostrando el #17

┌─ fidelización ──────────────┐
│ Tu código:  4  2  8  1      │
│ Mostralo al retirar y sumás │
│ tu compra                   │
└─────────────────────────────┘

[ Volver al menú ]
```

Para **envío**, el paso 3 de “qué sigue” dice: "Carri te escribe por WhatsApp para coordinar el envío" (**manual**; sin notifs automáticas).

#### Variante B — transfer, falta comprobante

```
¡Pedido recibido!
Pedido #17 · Total $ 12.500

Ahora transferí
┌─ Alias ─────────────────────┐
│ carri.mp              [Copiar]│
└─────────────────────────────┘
┌─ CBU ───────────────────────┐
│ 00000031000…          [Copiar]│
└─────────────────────────────┘
Titular: Juan Pérez

Subí la foto del comprobante
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│   📷 Tocar para sacar     │
│      o elegir una foto      │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
[ Enviar comprobante ]  (disabled hasta elegir foto)

[ Lo subo después ]  ← link chico
```

Post-envío → "Listo, Carri está revisando tu comprobante."

Cada campo (alias/CBU) tiene su propio **Copiar** ≥48px. Sin auto-copy mágico.

#### Variante C — MP rejected / pendiente

```
El pago no se completó
Pedido #17 sigue esperando

[ Reintentar con MercadoPago ]
[ Pagar por transferencia ]
[ Pagás al retirar ]
```

**Estados carga/error:** skeleton del resumen; id inexistente → "No encontramos ese pedido" + Volver al menú. Auth cliente: match cookie `client_id` o UUID opaco del link.

---

### 8.5 Panel de pedidos — `/[slug]/dashboard/orders`

**Jerarquía:**

1. Header: "Pedidos" · "Hoy" · switch "Recibiendo pedidos" (`!is_paused`)
2. Zona de atención (si hay): card primary "2 comprobantes para revisar →"
3. Chips filtro (ver §4.5)
4. Lista de cards
5. Link "Productos" → toggles

**Card de pedido (≥88px, todo tappeable → detalle):**

```
┌─────────────────────────────────┐
│ #17 · hace 5 min        NUEVO   │
│ María García                    │
│ 2 hamburguesas, 1 papas         │
│ $ 12.500 · Paga al retirar      │
└─────────────────────────────────┘
```

- "Revisar comprobante" con acento visual (borde primary / fondo crema).
- Orden: más nuevos arriba dentro del filtro.

**Estados:**

| Estado | UI |
|--------|-----|
| Vacío (sin pedidos hoy) | "Todavía no entraron pedidos. Compartí el link del menú." + [Copiar link del menú] |
| Filtro sin resultados | "No hay pedidos en En preparación." |
| Cargando | skeleton cards |
| Error | "No se pudieron cargar los pedidos." + Reintentar |
| Poll | cada 20s + on focus; **sin** sonido ni push |

---

### 8.6 Detalle de pedido (dashboard) — `/[slug]/dashboard/orders/[id]`

**Jerarquía:**

1. Header con Volver + "#17" + label de estado grande  
2. Cliente: nombre, teléfono, botón "Escribirle por WhatsApp" (outline ≥48px → `wa.me`)  
3. Ítems con variantes  
4. Notas del cliente en card ámbar ("Ojo: sin sal…")  
5. Bloque de pago (método + status + comprobante si hay)  
6. **Un solo CTA primario** = próximo estado (ver §4)  
7. Link "Sumar compra en Fidelización →"  
8. Link destructivo "Cancelar pedido" (Dialog)

**Comprobante:** thumbnail tappeable → fullscreen. Debajo:

- [ Aprobar pago y confirmar ] primary 56px  
- [ Rechazar ] outline (motivo opcional)

Cada tap de estado → toast "Pedido #17 en preparación" + el label del header cambia.

**Cancelar (Dialog shadcn, patrón loyalty):**

> ¿Cancelar el pedido #17 de María?  
> Si ya pagó, devolvé la plata a mano.  
> [Sí, cancelar] / [No]

---

### 8.7 Productos (toggle) — `/[slug]/dashboard/orders/productos`

```
← Pedidos
Productos de hoy

[Buscar producto]

Hamburguesas
┌─────────────────────────────┐
│ Clásica          [Disponible]│  ← toggle ≥48px
│ Especial         [Agotado]   │  ← off + label rojo
└─────────────────────────────┘
```

- Tap = PATCH inmediato + toast "Clásica marcada como agotada".
- **No** edita precios, fotos ni nombres (seed).
- Error de carga → "No se pudieron cargar los productos." + Reintentar.

---

### 8.8 Widgets dashboard home (owner)

| Widget | Contenido |
|--------|-----------|
| Pedidos hoy | número |
| Ingresos hoy | `$ X.XXX` (solo `payment_status=paid`) |
| Comprobantes para revisar | número; highlight si >0; link al panel filtrado |

`getRecentActivity` ejemplos:

- "Pedido #17 · $12.500 · María"
- "Pago aprobado · Pedido #17"
- "Pedido #17 listo"

---

### 8.9 Checklist "¿lo entiende mi abuelo?"

| Pantalla | ¿Pasa? | Nota |
|----------|--------|------|
| Catálogo | Sí | Una columna, Agregar grande, categorías visibles |
| Detalle producto | Sí | Opciones como filas grandes, CTA con precio live |
| Wizard paso 1 | Sí | Lista de compras familiar |
| Wizard paso 2 | Sí | Dos tarjetas enormes, una decisión |
| Wizard paso 3 | Sí | Tres métodos con explicación de una línea |
| Confirmación + transfer | Sí | Copiar por campo, subir foto con metáfora de cámara |
| Transición MP | Sí | Avisa que se va de la app |
| Panel pedidos | Sí | Un chip = un cajón; cards con lo esencial |
| Detalle pedido | Sí | Un solo botón de "siguiente paso" |
| Toggle productos | Sí | Disponible / Agotado, sin jerga |

---

## 9. Alcance: dentro / fuera de MVP

### 9.1 DENTRO del MVP (justificado en spec 12/ago + README preview)

| # | Feature |
|---|---------|
| 1 | Menú público con fotos, precios, categorías, elderly-UX |
| 2 | Variantes (single/multiple), cantidad 1–20, nota por ítem |
| 3 | Carrito `localStorage` + wizard checkout 3 pasos |
| 4 | Retiro o envío (fee fijo; $0 = gratis) |
| 5 | Pago: transferencia + foto comprobante |
| 6 | Pago: MercadoPago Checkout Pro + webhook |
| 7 | Pago: al retirar (`at_pickup`) |
| 8 | Confirmación bookmarkable `/orders/[id]` (pago pendiente / reintento) |
| 9 | Panel empleado: lista, filtros, kill switch “Recibiendo pedidos” |
| 10 | Detalle pedido: un CTA de cocina, WhatsApp manual, aprobar/rechazar comprobante |
| 11 | Toggle “Disponible hoy” / agotado (sin ABM) |
| 12 | Horarios: bloquear pedidos fuera de franja (seed/SQL salvo OK-2) |
| 13 | Integración suave con loyalty (`customers`, código 4 dígitos, link `?highlight=`) |
| 14 | Widgets home owner + activity básica |
| 15 | Idempotencia, revalidación server-side, edge cases §7 |
| 16 | Seed de catálogo Carri cargado por Nómade |

### 9.2 FUERA del MVP (explícito)

| Feature | Nota |
|---------|------|
| **Avisos automáticos por WhatsApp** al cambiar estado | Empleado escribe a mano con `wa.me` |
| **Tracking en vivo** del pedido para el cliente | Ruta `/orders/[id]` preparada; MVP = confirmación + pago |
| Panel ABM de productos (alta/edición/precios/fotos/variantes) | Seed + toggle |
| Múltiples sucursales | — |
| Descuentos, cupones, promociones, propina | — |
| Historial de pedidos del cliente | — |
| Delivery tracking con mapa / zonas de envío | Fee fijo único |
| Loyalty automático / canje por descuento en el pedido | Manual |
| Reembolsos MP integrados | Manual fuera de la app |
| Credenciales MP multi-tenant (token por negocio) | Env vars plataforma |
| Editor de horarios en UI | Default: no (OK-2) |
| Cron auto-cancel MP abandonados | Empleado cancela a mano |
| Sonido / badge push al llegar pedido | Poll silencioso |
| Horarios en tabla shell compartida | Quedan en `orders_settings` |

---

## 10. Roadmap post-MVP

Orden sugerido (no comprometido; priorizar con Carri después del go-live):

1. **Editor de horarios + fee/envío en settings** (si OK-2/OK-3 lo piden en la práctica).
2. **ABM de productos** (precio, foto, variantes) para autonomía de Carri.
3. **Tracking live del cliente** sobre `/orders/[id]` (estados legibles: recibido → preparando → listo).
4. **WhatsApp automático** (Authyo u otro) en cambios de estado clave.
5. **Historial del cliente** + reordenar.
6. **Zonas de envío** / fee variable.
7. **MP multi-tenant** (token por negocio en settings cifrado).
8. **Loyalty automático** al `completed` (evento shell o write controlado).
9. **Cupones / descuentos / propina**.
10. **Sonido discreto** en panel al llegar pedido (opt-in).
11. **Cron** de limpieza de pedidos MP abandonados.
12. **Reembolsos** MP desde el detalle.

---

## 11. Discrepancias detectadas

Entre el **spec técnico (12/ago)**, el **README oficial de la preview** y **resúmenes de terceros / PDF oral**. No se rediseña: se documenta y manda la fuente de verdad.

| # | Tema | Spec 12/ago | Preview README | Resumen de terceros (PDF oral) | Resolución en este PRD |
|---|------|-------------|----------------|--------------------------------|--------------------------|
| D1 | WhatsApp automático | **Fuera** de MVP; `wa.me` manual | **Fuera** de MVP | Lo listaba como **Sí** en primera versión | **FUERA.** Error del resumen de terceros. |
| D2 | Tracking en vivo del cliente | **Fuera**; ruta lista para futuro | **Fuera** | Lo listaba como **Sí** | **FUERA.** Error del resumen de terceros. |
| D3 | Nombre de migración SQL | `003_orders.sql` | — | — | En repo, `003` ya es loyalty points. Al implementar: **siguiente correlativo** (p. ej. `004`). SQL de dominio intacto. |
| D4 | `pickup_address` | Decisión abierta (#5) | Copy de retiro en mockups | — | Cerrada: campo en `orders_settings` (delta de implementación §2). |
| D5 | Numeración pedidos | Default global; abierta | Muestra #17… | — | Default global; **OK-1 Nobel**. |
| D6 | Valor $ de envío / horarios reales Carri | Placeholders | Preguntas abiertas al cliente | — | **OK-3** + seed de horarios (OK-2). Datos operativos, no rediseño. |

No hay otras contradicciones de producto entre spec y preview oficial: pantallas, pagos, cocina 1-botón, loyalty manual y kill switch coinciden.

---

## 12. Criterios de aceptación del MVP (checklist ejecutivo)

- [ ] Cliente abre link, ve menú, arma carrito, completa wizard, recibe `#N`.
- [ ] Fuera de horario o `is_paused`: no puede confirmar; ve mensaje claro.
- [ ] Transfer: ve alias/CBU, copia, sube comprobante; puede volver después.
- [ ] Empleado ve comprobante, **Aprobar pago y confirmar** en un tap.
- [ ] MP: redirect, webhook confirma, pedido pasa a confirmed+paid.
- [ ] at_pickup: cocina sin bloquear por cobro.
- [ ] Flujo cocina: un CTA por estado hasta entregado.
- [ ] Toggle agotado se refleja en catálogo.
- [ ] Cliente nuevo crea `customers` + código; confirmación lo muestra.
- [ ] Link fidelización abre panel loyalty con highlight.
- [ ] **No** hay push/WhatsApp automático ni timeline live del cliente.

---

## 13. Próximo paso

1. Nobel responde **OK-1, OK-2, OK-3** (sección 0).  
2. Con OKs cerrados: plan de implementación (skill **writing-plans** / BMAD) con TDD según `AGENTS.md`.  
3. No escribir código de `modules/orders` hasta que este PRD quede aprobado (al menos defaults + los 3 OKs).

**Historial:** el diseño completo del 12/ago permanece en  
`docs/superpowers/specs/2026-08-12-orders-module-design.md`.

---

## 14. Estado actual del PRD

Aprobado por Nobel el 19/08/2026 con las siguientes decisiones:

- Numeración de pedidos: global creciente
- Control de horarios: switch "Recibiendo pedidos" en MVP (editor completo post-MVP)
- Envío: costo fijo único configurable (valor a definir)

Próximo paso: Diseño visual completo en Pencil (`orders-mvp.pen`).
