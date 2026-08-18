# Intent — Loyalty: carga de puntos por QR escaneable

## 1. Intent

Rediseñar la carga de puntos loyalty: de código manual a QR escaneable + confirmación. El goal es fluidez en el punto de venta — escanear → confirmar → listo, sin tipeo ni búsqueda manual, sin robar tiempo de venta con la fila esperando.

## 2. Las 8 decisiones de diseño

1. **Flujo con confirmación explícita (1 tap), no auto-carga (0 taps).** Scan → sheet con nombre → tramos → confirmación. La propuesta optimistic+undo queda descartada para el MVP; la pantalla "N puntos a Juan" es el antifraude visual.
2. **Rangos monto→puntos configurables por negocio** en la config de fidelización, con editor de cortes encadenados (tramos contiguos, último abierto).
3. **Modelo puntos-nativo con pizarra limpia.** El único cliente de loyalty no está en producción → NO hace falta capa de compatibilidad. Las compras pasan a ser movimientos de puntos (monto, puntos, tramo, employee, timestamp).
4. **Canje convive con sumar en el mismo sheet.** Si el cliente puede canjear, banner 🎁 + botón de canjear junto a SUMAR PUNTOS. El sheet es UN solo componente para todo el loop (sumar, canje, auto-confirmación futura en kiosco).
5. **Acciones exclusivas de employee/owner.** Sheet y todos los botones de acción (sumar/canjear) solo con sesión de empleado/dueño. El cliente es read-only: ve su tarjeta (QR + progreso), sin acciones.
6. **QR = URL pública `/{slug}/loyalty/c/{code}`.** Una sola URL sirve para cámara nativa (deep link: con sesión employee cae directo al sheet), scanner in-app y QR impreso. La URL es la API del QR.
7. **Compra debajo del primer tramo NO se registra** — no existe para el programa. El picker del sheet solo muestra tramos que suman puntos.
8. **El código de 4 dígitos sobrevive como plan B** (sin señal / batería / smartphone). El scanner pasa a ser la vista principal del panel loyalty y la búsqueda por código queda como link secundario "¿No funciona el QR?". Degradación con gracia: el QR nunca falla feo.

## 3. Flujo final del empleado

1. **Scan** — scanner in-app como vista principal del panel loyalty. Valida dominio/formato: QR de otra app → error claro y amable; QR de registro vs. QR de cliente → el scanner distingue el tipo y redirige.
2. **Sheet con nombre grande** — "¡Hola Marta!": hace doble trabajo, calidez (saludo) + antifraude visual. Bottom sheet sin scroll, botón gigante al alcance del pulgar, operable con una mano.
3. **SUMAR PUNTOS → picker de tramos** — botones con los puntos visibles de cada tramo (ej. 50 / 100 / 150). Solo aparecen tramos que suman.
4. **Confirmación "N puntos a Juan"** — confirmar / cancelar. Segunda barrera antifraude visual.
5. **Canje** — si el cliente puede canjear, el sheet muestra banner 🎁 con botón de canjear conviviendo con SUMAR PUNTOS.
6. **Plan B** — sin señal, QR ilegible o cliente sin smartphone: link "¿No funciona el QR?" → búsqueda por código de 4 dígitos. No se borra nada del sistema actual.

Transversal: ventana anti-duplicado — mismo cliente escaneado dos veces en <60s pide confirmación extra (debounce + ventana).

## 4. Config nueva: rangos monto→puntos

Modelo de cortes encadenados, por negocio, en la config de fidelización:

- Tramos contiguos: el fin de un tramo es el inicio del siguiente.
- Último tramo abierto (sin techo).
- Primer tramo (< mínimo) existe con 0 pts editable: debajo del mínimo la compra no se registra.

Ejemplo real (Omar): 10–20k = 50 pts · 20–30k = 100 pts · +30k = 150 pts.

Cada carga persiste como movimiento de puntos: monto, puntos, tramo, employee, timestamp.

## 5. Restricciones y no-goals

- Puntos-nativo con pizarra limpia: un solo cliente, sin producción, sin capa de compatibilidad ni migración legacy.
- Acciones solo employee/owner; cliente read-only.
- QR = URL pública, no identificador opaco.
- Sesiones de empleado largas o PIN rápido: un login en medio de la fila es mortal.
- MVP = QR estático (URL) + scanner in-app + bottom sheet (nombre, progreso, confirmar gigante, cerrar) + anti-duplicado + fallback manual.
- Fase 2 (no-goals del MVP): undo/auto-carga 0-taps, realtime en el teléfono del cliente, sonido/confetti al confirmar.
- Fase 3: QR dinámico rotativo anti-fraude, modo kiosco, Wallet pass.

## 6. Decisiones chicas pendientes (fase de arquitectura)

- Ventana anti-duplicado exacta (propuesta en sesión: <60s mismo cliente → confirmación extra).
- Toast de undo: ¿encaja con la confirmación explícita elegida? (quedó para fase 2).
- Librería de scanner QR.
- Componente del sheet: Drawer vs. Sheet (shadcn).
