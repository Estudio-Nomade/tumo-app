# PROMPT · fix design · QR tip Defe → URL prod (no localhost)

## Modo
**SOLO DESIGN ARTIFACTS / Pencil.**  
Prohibido tocar `app/`, `modules/`, `shell/`, tests, migrations, seed, package.json, billing, employees.

No es feature in-app de poster. No “arreglar” `share-program.tsx` (ese QR usa `window.location.origin` a propósito: en local = localhost; en prod = prod). Este brief es el **tip imprimible para entregar al Defe**.

## Repo
`/home/marti/Documentos/Estudio Nomade/Tumo`

## Base / branch
- Partí de `main` actualizado (`git fetch && git checkout main && git pull`).
- Branch nueva: `docs/design-defe-qr-prod-url` (o `fix/design-defe-loyalty-qr-prod` si preferís `fix/`).
- **No** uses la rama actual de admin (`fix/admin-module-subscription-dates-ui`) ni mezcles WIP de billing/fechas.
- Conventional commit al final. PR a `main` solo con artifacts de design (+ este handoff si ya está tracked). **No** `git add -A`.

## Síntoma (palabras del humano)
El QR del tip/flyer de **El Defe** quedó **inválido / inútil en el celular**: apuntaba a **localhost**. Hay que **volver a hacer / corregir** el QR (y el tip) para producción.

## Causa ya medida (no re-debatir; verificar y cerrar)
Estado al armar este handoff (2026-09-10):

| Asset | Payload al decodificar (pyzbar) |
|-------|----------------------------------|
| `design-artifacts/defe-loyalty-qr/qr-raw.png` | `https://www.tumo.com.ar/defe/loyalty` |
| `defe-qr-flyer.png` / `defe-qr-card.png` / `defe-qr-branded.png` | idem prod |
| `export/01-tip-a5-defe.jpg` + tip02/tip03 + jpeg clones | idem prod |

- Prod live: `GET https://www.tumo.com.ar/defe/loyalty` → **200** (`x-matched-path: /[slug]/loyalty`).
- `https://tumo.com.ar/defe/loyalty` → **308** → `www`.
- El problema residual está en el **SoT Pencil**:

`design-artifacts/defe-loyalty-qr-tip.pen`

- Embebe imagen `defe-loyalty-qr/qr-raw.png` (payload **ya prod**).
- Pero **textos visibles** todavía dicen localhost:
  - frame `00 · Índice`: `http://localhost:3000/defe/loyalty` + nota `[DECISIÓN] prod…`
  - frame `01 · Tip imprimible A5`: texto `localhost:3000/defe/loyalty` bajo el QR
  - note `Brief · entregar a Defe`: `URL dev: http://localhost:3000/...` + “actualizar URL del QR al dominio final”

Si alguien lee el tip / re-exporta mal / regenera el QR desde el texto del índice, vuelve el bug. **Cerrar la decisión: URL canónica de print = prod.**

## URL canónica (lock)
```
https://www.tumo.com.ar/defe/loyalty
```

Display legible en tip (sin scheme OK):
```
www.tumo.com.ar/defe/loyalty
```

**No** uses:
- `http://localhost:3000/defe/loyalty`
- `http://127.0.0.1:...`
- solo path `/defe/loyalty` adentro del QR (el celular necesita URL absoluta https)
- `https://tumo.com.ar/...` sin www si preferís evitar el hop 308 (preferí **www** como arriba)

## Negocio / brand (no reinventar)
- Nombre: **El Defe Cantina**
- Slug: `defe`
- Tagline: `Club Defensores de Belgrano · Desde 1950`
- Colores seed: primary `#577e99` · secondary `#84a7c2` · surface `#e7f4f8` · ink `#1C1917`
- Logo: `design-artifacts/defe-loyalty-qr/defe-logo.jpg`
- Copy tip: **¡Registrate y sumá puntos!** · Escaneá con la cámara · steps 1 Escaneá / 2 Registrate con WhatsApp / 3 Sumá en cada visita
- Commits recientes de design **quitaron** el badge “10 compras → hamburguesa” y metieron logo real — **no reintroducir el badge** salvo que el humano lo pida otra vez.
  - `08fa471` docs(design): Defe tip — quitar badge 10 compras + logo
  - `3a34d7d` / `100d129` tip QR loyalty Defe en Pencil

## Objetivo
1. Dejar el tip **listo para imprimir y escanear en la calle** con QR → prod.
2. Actualizar el `.pen` para que **ningún frame/note diga localhost** como URL del tip.
3. Si hace falta (payload incorrecto en algún export viejo, o regenerás desde cero): regenerar `qr-raw.png` y re-embeber / re-exportar.
4. Re-export print de frames 01–03 a `design-artifacts/defe-loyalty-qr/export/` (jpg/png legibles).
5. Verificación **obligatoria**: decodificar el QR del asset final (no confiar en el texto al lado).

## Archivos clave
| Path | Rol |
|------|-----|
| `design-artifacts/defe-loyalty-qr-tip.pen` | SoT Pencil — **editar** |
| `design-artifacts/defe-loyalty-qr/qr-raw.png` | QR scannable 1200² — verificar/regenerar si no es prod |
| `design-artifacts/defe-loyalty-qr/defe-logo.jpg` | logo |
| `design-artifacts/defe-loyalty-qr/export/*` | exports print — refrescar tras fix |
| `design-artifacts/defe-loyalty-qr/defe-qr-*.png` | raster fallback — alinear si los regenerás |
| `docs/handoffs/PROMPT-pencil-defe-loyalty-qr-tip.md` | brief original Pencil (histórico; este fix lo supersede en URL) |
| `lib/loyalty-url.ts` | **solo lectura** si querés paridad de path `/{slug}/loyalty` — **no editar** |

## Qué hacer (pasos)
1. `cd` al repo. Branch limpia desde `main` (ver arriba).
2. **Verificar** payloads actuales:
   ```bash
   # ejemplo con pyzbar + pillow en venv throwaway
   python3 - <<'PY'
   from PIL import Image
   from pyzbar.pyzbar import decode
   from pathlib import Path
   root = Path('design-artifacts/defe-loyalty-qr')
   for f in sorted(root.rglob('*')):
     if f.suffix.lower() not in {'.png','.jpg','.jpeg'}: continue
     try:
       vals = [d.data.decode() for d in decode(Image.open(f))]
       print(f'{f}: {vals or [\"NO_QR\"]}')
     except Exception as e:
       print(f'{f}: ERR {e}')
   PY
   ```
   Si no tenés pyzbar: cualquier decoder (zbarimg, zxing, app del celu en foto del export).
3. Si `qr-raw.png` **no** es exactamente `https://www.tumo.com.ar/defe/loyalty`, regenerar (error correction M o Q, margen >= 2, alto contraste negro/blanco, >= 1000px lado). Ejemplo con dep del repo:
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   bun -e '
   import QRCode from "qrcode";
   await QRCode.toFile(
     "design-artifacts/defe-loyalty-qr/qr-raw.png",
     "https://www.tumo.com.ar/defe/loyalty",
     { width: 1200, margin: 2, errorCorrectionLevel: "M",
       color: { dark: "#1C1917", light: "#FFFFFF" } }
   );
   console.log("ok");
   '
   ```
   Volvé a decodificar. **Fail si sale localhost o basura.**
4. Editar `defe-loyalty-qr-tip.pen` (JSON Pencil, version ~2.x):
   - Reemplazar **todos** los `localhost:3000/defe/loyalty` y `http://localhost:3000/defe/loyalty`.
   - Índice + note brief: URL prod canónica; borrar o cerrar `[DECISIÓN] prod…` como **resuelta**.
   - Frame 01 texto bajo QR: `www.tumo.com.ar/defe/loyalty` (o full https).
   - Mantener slots de imagen apuntando a `defe-loyalty-qr/qr-raw.png` (o re-link si el path relativo del pen lo exige).
   - **No** full-load de `orders-ui-ux.pen` / `turnos-mvp.pen` al contexto del agente.
   - **No** reintroducir badge 10 compras.
   - Colores Defe, no naranja Carri `#F97316`.
5. Re-export visual de frames:
   - `01 · Tip imprimible A5 · El Defe` (principal a entregar)
   - `02 · Card mostrador 1:1`
   - `03 · Branded QR card`
   Guardar en `design-artifacts/defe-loyalty-qr/export/` con nombres claros (`01-tip-a5-defe.*`, etc.).
6. Decodificar **otra vez** el export principal (no solo qr-raw). Acceptance = payload prod.
7. Smoke manual opcional: abrir la URL canónica en browser (200, pantalla loyalty Defe).
8. Commit surgical + PR.

## Acceptance checklist
- [ ] Ningún texto del `.pen` (índice, tip 01, brief) muestra localhost como URL del tip
- [ ] `qr-raw.png` decodifica a `https://www.tumo.com.ar/defe/loyalty`
- [ ] Export frame 01 (y 02/03 si incluyen QR) decodifican al mismo payload
- [ ] Logo Defe sigue; sin badge 10 compras; brand colors Defe
- [ ] Prod URL documentada como cerrada (no “DECISIÓN pendiente”)
- [ ] No hay cambios de código app
- [ ] PR: solo design artifacts (+ handoff si aplica); summary 3–5 líneas root cause

## Anti-scope
- No implementar “Próximamente: poster” en `share-program.tsx`
- No hardcodear origin de prod en el dashboard (rompe dev a propósito)
- No tocar seed-defe / billing / owner Marti
- No regenerar tip en ImageMagick/HTML como SoT nuevo — el `.pen` manda; raster solo export
- No mezclar admin subscription dates UI ni otros WIP dirty del working tree ajeno
- No secretos / `.env`

## Entrega (informe corto en español)
1. Branch + commit + link PR  
2. Payload decodificado de `qr-raw.png` y del export 01 (pegar string exacto)  
3. Lista de archivos tocados  
4. Confirmación: “localhost eliminado del pen”  
5. Cómo re-exportar print si el humano abre Pencil otra vez  

## Verify commands
```bash
export PATH="$HOME/.bun/bin:$PATH"
# decoder (ver paso 2)
# opcional live:
curl -sI 'https://www.tumo.com.ar/defe/loyalty' | head -15
```

No hace falta `bun test` / build de app: **no hay código**.
