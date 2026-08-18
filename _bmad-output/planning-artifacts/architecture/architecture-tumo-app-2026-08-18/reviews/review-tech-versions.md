# Review — Tech versions / reality-check

**Spine:** `architecture-tumo-app-2026-08-18/ARCHITECTURE-SPINE.md`  
**Lens:** Verify committed stack and library decisions were web-researched or reality-checked (not asserted from training data).  
**Review date:** 2026-08-18  
**Ground truth:** `package.json` + live `npm view` + local `components/ui/sheet.tsx`

---

## Verdict

**PASS (with minor drift notes)**

Every *named, version-pinned* technology in the Stack table and AD-8 scanner pin exists on npm, matches or correctly extends the installed brownfield set, and fits the claimed use. Sheet primitive claim matches the repo (Base UI Dialog, not Radix/vaul). No invented packages. No dead libraries. Residual risk is only unpinned major-line drift (TypeScript “5”, Next/React patch lag vs registry latest) — acceptable for a feature-altitude brownfield spine that pins to the monorepo, not to registry HEAD.

---

## Method

| Check | Source |
| --- | --- |
| Installed versions | `/package.json` |
| Registry existence + latest | `npm view <pkg> version` (2026-08-18) |
| Scanner peer deps | `npm view @yudiel/react-qr-scanner peerDependencies` |
| Rejected alts still published | `npm view html5-qrcode`, `@zxing/browser` |
| Sheet primitive | `components/ui/sheet.tsx` (`@base-ui/react/dialog`, `side?: "bottom"`) |
| Domain layout claims | `modules/loyalty/*`, `shell/db/migrations` |

---

## Stack table vs reality

| Spine claim | package.json | npm latest (2026-08-18) | Status |
| --- | --- | --- | --- |
| next **16.2.12** | `16.2.12` exact | **16.3.1** | OK pin to installed; registry ahead by minor |
| react / react-dom **19.2.4** | `19.2.4` exact | **19.2.8** | OK pin; patch drift only |
| @base-ui/react **^1.7.0** | `^1.7.0` | **1.7.0** | Exact match; peers include React 17–19 |
| tailwindcss **4** | `^4` (+ `@tailwindcss/postcss` ^4) | **4.3.3** | OK major-line pin |
| postgres (js) **^3.4.9** | `^3.4.9` | **3.4.9** | Exact match |
| qrcode **1.5.4** | `^1.5.4` | **1.5.4** | Exact match (AD-4) |
| @yudiel/react-qr-scanner **2.6.0** *(add)* | **not installed** (correctly flagged) | **2.6.0** (latest; published 2026-05-13) | OK; peer `react`/`react-dom` `^17 \|\| ^18 \|\| ^19` → fits 19.2.4 |
| typescript **5** | `^5` | **7.0.2** | OK brownfield range; major lag vs ecosystem HEAD is real but intentional |
| bun test | `"test": "bun test"`; `@types/bun` ^1.3.14 | bun **1.3.14** (types align) | OK |

### Rejected / deferred libraries (mentioned in decisions)

| Claim | Reality-check |
| --- | --- |
| AD-7: no vaul/drawer for MVP | `vaul` still published (**1.1.2**); **not** in package.json. Local sheet already supports `side="bottom"`. Decision is coherent. |
| AD-8: avoid ad-hoc zxing wrappers | `@zxing/browser@0.2.1` and `html5-qrcode@2.3.8` still exist on npm (authoring-time alts remain valid package names). Pinning a maintained React 19-capable wrapper is sound. |
| Deferred: base-ui sheet enough (no drag-to-dismiss) | Sheet is `@base-ui/react/dialog` re-export — product deferral, not a version lie. |

---

## Decision-level reality checks (non-version)

| Decision | Evidence | Flag |
| --- | --- | --- |
| AD-7 One bottom sheet → `components/ui/sheet.tsx` `side="bottom"` | File imports `Dialog as SheetPrimitive` from `@base-ui/react/dialog`; `side` includes `"bottom"`. | Confirmed |
| AD-4 `qrcode@1.5.4` | Installed + latest. | Confirmed |
| AD-8 scanner pin 2.6.0 | Latest on npm; React 19 peer OK; deps `barcode-detector`, `webrtc-adapter` (browser camera path). | Confirmed |
| Structural seed paths under `modules/loyalty` | Tree exists (`api/`, `dashboard/`, `public/`, `lib/`); migrations currently `001`/`002` — `003_*` is planned, not present. | Expected for draft spine |
| Stack omits other installed deps (`@supabase/supabase-js`, `shadcn`, `lucide-react`, …) | Feature altitude: only loyalty QR/points substrate. | Acceptable omission |

---

## Findings (severity-ordered)

### F1 — INFO: Next/React pins lag registry latest
Spine correctly pins **installed** `next@16.2.12` and `react@19.2.4`, while npm HEAD is `16.3.1` / `19.2.8`. Not a research failure; document as “pin = lockfile/package.json, not latest” so implementers do not “upgrade while here” without intent.

### F2 — INFO: TypeScript labeled only as major `5`
`package.json` has `typescript: ^5`; registry latest is **7.x**. Spine is accurate for the project, but the bare “5” could be misread as “current TS is 5”. Prefer `^5 (project)` or the resolved install version if a lockfile pin exists.

### F3 — INFO: Scanner alternative rejection trail not in the spine body
AD-8 pins `@yudiel/react-qr-scanner@2.6.0` without recording why `html5-qrcode` / `@zxing/browser` were rejected. Authoring notes confirm those packages were `npm view`’d; the spine itself has no research footnote. Versions of the pin and alts still resolve today — no wrong-tech risk — but auditability would improve with one line under AD-8 or Stack.

### F4 — LOW: `@yudiel/react-qr-scanner` is the only *new* runtime dep
Marked `*(add)*` correctly. No other Stack rows invent packages. Implementers must add exactly `2.6.0` (or `^2.6.0` if policy allows) — bare “latest” would still resolve to 2.6.0 today.

### F5 — NONE blocking: Base UI / Sheet / vaul story is consistent
No Radix in `components/ui/*` for sheet/dialog/button/popover/input; all Base UI. “No second drawer library” is grounded in repo reality, not a hallucinated primitive.

---

## What was *not* version-risk

- JSONB `point_ranges`, migration rename, API path renames — schema/product decisions; no library version claim.
- Spanish copy / TDD / bun test conventions — process, not package pins.
- Deferred Wallet / kiosk / dynamic QR — correctly out of stack.

---

## Recommendations (optional, non-blocking)

1. Under **Stack**, add a one-line footnote: *Versions = package.json as of 2026-08-18; scanner pin confirmed via npm view.*
2. Under **AD-8**, one sentence: rejected `html5-qrcode@2.3.8` / `@zxing/browser@0.2.1` (less React-19-first ergonomics / wrapper surface); chose yudiel 2.6.0.
3. Optionally pin TypeScript as `^5` explicitly in the table to mirror package.json.

---

## Checklist

- [x] Every Stack package name exists on npm or is the project test runner
- [x] Pinned versions match package.json where already installed
- [x] New package pin is current latest and peer-compatible with React 19
- [x] Sheet/Base UI claim matches source
- [x] No training-data-only dead packages detected
- [x] Registry drift noted (Next/React/TS) without failing the spine

**Final:** PASS
