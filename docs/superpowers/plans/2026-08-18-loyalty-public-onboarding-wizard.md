# Public Loyalty Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense `/{slug}/loyalty` form with a phone-first step wizard (lookup → card | name → optional day/month birthday → register → card).

**Architecture:** Single-component state machine in `registration.tsx` (`phone` → `name` → `birthday` → card via `customer !== null`). Pure helper `toBirthdayDate(month, day)` encodes day+month as `2000-MM-DD` for existing `DATE` column. Reuse GET/POST `/api/loyalty/customers` unchanged except birthday payload shape from the client.

**Tech Stack:** Next.js App Router, React client components, bun test (source-contract + unit), existing `PhoneInput` / `Input` / `Button` / `LoyaltyCard`.

**Spec:** `docs/superpowers/specs/2026-08-18-loyalty-public-onboarding-wizard-design.md`  
**Branch:** `feat/loyalty-qr-scan-points` (no new branch)

**Commits:** Always `git commit -S` (GPG). If the agent cannot sign, stage files and print the one-liner for the human.

---

## File map

| File | Role |
|------|------|
| `modules/loyalty/lib/birthday.ts` | **Create** — `toBirthdayDate(month, day): string \| null` |
| `tests/loyalty-birthday.test.ts` | **Create** — unit tests for helper |
| `modules/loyalty/public/registration.tsx` | **Rewrite** — wizard steps; drop dual register/login forms |
| `tests/ui/registration-birthday.test.tsx` | **Rewrite** — wizard source contracts (phone-first, no year, skip) |
| `tests/ui/registration-wizard.test.tsx` | **Create** (optional if birthday test file covers all) — step presence / no name on first paint |

No API route changes required if client sends `birthday: "2000-MM-DD" | undefined`.

---

### Task 1: Birthday encoding helper (TDD)

**Files:**
- Create: `modules/loyalty/lib/birthday.ts`
- Create: `tests/loyalty-birthday.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/loyalty-birthday.test.ts
import { describe, expect, test } from "bun:test"
import { toBirthdayDate } from "@/modules/loyalty/lib/birthday"

describe("toBirthdayDate", () => {
  test("encode valid month/day as 2000-MM-DD", () => {
    expect(toBirthdayDate(3, 15)).toBe("2000-03-15")
    expect(toBirthdayDate(12, 1)).toBe("2000-12-01")
  })

  test("Feb 29 is valid (year 2000 is leap)", () => {
    expect(toBirthdayDate(2, 29)).toBe("2000-02-29")
  })

  test("invalid returns null", () => {
    expect(toBirthdayDate(0, 1)).toBeNull()
    expect(toBirthdayDate(13, 1)).toBeNull()
    expect(toBirthdayDate(1, 0)).toBeNull()
    expect(toBirthdayDate(1, 32)).toBeNull()
    expect(toBirthdayDate(4, 31)).toBeNull()
    expect(toBirthdayDate(2, 30)).toBeNull()
    expect(toBirthdayDate(NaN, 1)).toBeNull()
  })

  test("nullish partial returns null", () => {
    expect(toBirthdayDate(null, 1)).toBeNull()
    expect(toBirthdayDate(3, null)).toBeNull()
    expect(toBirthdayDate(undefined, undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun test tests/loyalty-birthday.test.ts
```

Expected: fail resolving `@/modules/loyalty/lib/birthday` or `toBirthdayDate`.

- [ ] **Step 3: Implement helper**

```ts
// modules/loyalty/lib/birthday.ts
/** Encode month+day as DATE with sentinel year 2000 (public UI never shows year). */
export function toBirthdayDate(
  month: number | null | undefined,
  day: number | null | undefined
): string | null {
  if (month == null || day == null) return null
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const y = 2000
  const dt = new Date(Date.UTC(y, month - 1, day))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${y}-${mm}-${dd}`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test tests/loyalty-birthday.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add modules/loyalty/lib/birthday.ts tests/loyalty-birthday.test.ts
git commit -S -m "feat(loyalty): birthday month-day encoder for onboarding wizard"
```

---

### Task 2: Rewrite UI source-contract tests for wizard

**Files:**
- Modify: `tests/ui/registration-birthday.test.tsx` (replace loyalty registration describes; keep shadcn stack + AGENTS.md describes that do not depend on old form)

- [ ] **Step 1: Replace registration-specific tests**

Keep `describe("shadcn date picker stack")` calendar/popover existence tests and `AGENTS.md` describe. **Remove** tests that require switch / DatePicker / `birthdayEnabled` on registration.

Add/replace with:

```ts
// tests/ui/registration-birthday.test.tsx — registration wizard contracts only
import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "modules/loyalty/public/registration.tsx"),
  "utf8"
)

describe("LoyaltyRegistration wizard (phone-first)", () => {
  test("first step is phone-only (no name field on initial register path string)", () => {
    // Wizard uses step state; name Input only under step === "name"
    expect(src).toMatch(/step\s*===\s*["']phone["']|step === "phone"|case "phone"/)
    expect(src).toContain('step === "name"')
    expect(src).toContain('step === "birthday"')
  })

  test("looks up existing customer by phone before asking name", () => {
    expect(src).toContain("/api/loyalty/customers?")
    expect(src).toMatch(/phone/)
    expect(src).toContain("slug")
  })

  test("registers via POST with name + locked phone", () => {
    expect(src).toContain('method: "POST"')
    expect(src).toContain("/api/loyalty/customers")
    expect(src).toContain("toBirthdayDate")
  })

  test("birthday step has no year and allows skip", () => {
    expect(src).toMatch(/Saltar|Omitir/)
    expect(src).not.toMatch(/type=["']date["']/)
    // no full DatePicker on registration
    expect(src).not.toContain('import DatePicker from "@/shell/ui/date-picker"')
    expect(src).toMatch(/birthMonth|month/)
    expect(src).toMatch(/birthDay|day/)
  })

  test("phone locked on name step with back control", () => {
    expect(src).toMatch(/Cambiar|cambiar/)
    expect(src).toMatch(/setStep\(\s*["']phone["']\s*\)/)
  })

  test("card path uses LoyaltyCard and switch account resets wizard", () => {
    expect(src).toContain("LoyaltyCard")
    expect(src).toContain("onSwitchAccount")
    expect(src).toMatch(/setStep\(\s*["']phone["']\s*\)|setCustomer\(null\)/)
  })
})

// retain existing shadcn stack + AGENTS.md describes from current file
// (calendar/popover existence, AGENTS.md policy) — copy unchanged from prior file
```

Copy the unchanged `describe("shadcn date picker stack")` tests that only check `date-picker.tsx` / calendar files, and `describe("AGENTS.md shadcn policy")`. Drop the test `"registration valida birthday vacío con switch ON"`.

- [ ] **Step 2: Run tests — expect FAIL on wizard contracts**

```bash
bun test tests/ui/registration-birthday.test.tsx
```

Expected: FAIL on missing `step === "phone"` / `toBirthdayDate` etc.

- [ ] **Step 3: Commit tests only (red)**

```bash
git add tests/ui/registration-birthday.test.tsx
git commit -S -m "test(loyalty): wizard source contracts for public onboarding"
```

---

### Task 3: Implement wizard in `registration.tsx`

**Files:**
- Modify: `modules/loyalty/public/registration.tsx`

- [ ] **Step 1: Rewrite component to state machine**

Replace dual `mode: register | login` with:

```ts
type Step = "phone" | "name" | "birthday"

// state
const [step, setStep] = useState<Step>("phone")
const [phone, setPhone] = useState("")
const [name, setName] = useState("")
const [birthMonth, setBirthMonth] = useState<number | null>(null)
const [birthDay, setBirthDay] = useState<number | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")
const [customer, setCustomer] = useState<LoyaltyCardData | null>(initialCustomer ?? null)
```

**Handlers (behavior contracts):**

1. `onPhoneContinue`
   - validate `isPhoneValid(phone)`
   - `GET /api/loyalty/customers?${URLSearchParams({ phone, slug })}`
   - 200 → `setCustomer(data)`
   - 404 → `setStep("name")`
   - else → show `data.error`

2. `onNameContinue`
   - `name.trim()` non-empty
   - `setStep("birthday")`

3. `onBirthdaySkip` → `register(undefined)`
4. `onBirthdayContinue` → `bd = toBirthdayDate(birthMonth, birthDay)`; if null and user pressed Continuar with partial selection, set error "Elegí día y mes válidos."; if both null treat like skip OR require both when Continuar — **spec: Continuar with empty = same as skip; Continuar with partial = error; Continuar with valid = register with date**
5. `register(birthdayIso: string | undefined)`
   - `POST /api/loyalty/customers` body `{ name: name.trim(), phone, birthday: birthdayIso, slug }`
   - 200 → `setCustomer(data)`

6. Back from name/birthday:
   - name → `setStep("phone")`; clear name, birthday fields, error
   - birthday → `setStep("name")`; clear birthday fields only

7. `onSwitchAccount` on card:
   - `setCustomer(null)`; `setStep("phone")`; clear drafts; cookie clear stays on card (`document.cookie = "client_id=..."`)

**UI structure (keep brand header on all steps):**

- `customer` set → `<LoyaltyCard … />` only (unchanged).
- Else header + title/subtitle per step + body:
  - **phone:** `PhoneInput` + CTA "Continuar"
  - **name:** read-only phone line + button "Cambiar" + `Input` name + CTA "Continuar"
  - **birthday:** two `<select>` (mes 1–12 labels ES, día 1–31) + CTA "Continuar" + text button "Saltar"
- Errors: same alert block below steps.
- Do **not** import `DatePicker`.
- Import `toBirthdayDate` from `@/modules/loyalty/lib/birthday`.

**Month labels (ES):**

```ts
const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
] as const
```

Days: options 1–31; validation via `toBirthdayDate` on submit.

**Copy (Spanish):**

| Step | H2 | Sub |
|------|----|-----|
| phone | Empezá con tu WhatsApp | Si ya estás en el programa, te llevamos a tu tarjeta. |
| name | ¿Cómo te llamás? | Teléfono fijo arriba; solo falta tu nombre. |
| birthday | ¿Cuándo es tu cumple? | Día y mes, opcional. Sin año. |

- [ ] **Step 2: Run wizard + birthday unit tests**

```bash
bun test tests/loyalty-birthday.test.ts tests/ui/registration-birthday.test.tsx
```

Expected: PASS

- [ ] **Step 3: Full suite smoke**

```bash
bun test
```

Expected: all pass (fix any unrelated breakage from copy strings if other tests grep registration).

- [ ] **Step 4: Commit**

```bash
git add modules/loyalty/public/registration.tsx
git commit -S -m "feat(loyalty): phone-first public onboarding wizard"
```

---

### Task 4: Manual verification checklist

- [ ] **Step 1: Manual paths** (dev server + DB migrated)

1. Incognito `/{slug}/loyalty` → only phone.
2. Existing customer phone → card (code/QR/points).
3. New phone → name (phone locked) → Cambiar returns to phone.
4. Name → birthday → Saltar → card registered.
5. Name → birthday day+month Continuar → card; DB `birthday` = `2000-MM-DD`.
6. Cookie session: reload shows card; "No soy X" → phone step.
7. Invalid phone blocks continue.

- [ ] **Step 2: Commit design+plan docs if not already on branch**

```bash
git add docs/superpowers/specs/2026-08-18-loyalty-public-onboarding-wizard-design.md \
        docs/superpowers/plans/2026-08-18-loyalty-public-onboarding-wizard.md
git commit -S -m "docs: loyalty public onboarding wizard spec and plan"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Phone-first only | 3 |
| Lookup then card or name | 3 |
| Phone fixed + Cambiar | 3 |
| Birthday day+month, no year, skip | 1 + 3 |
| Sentinel year 2000 | 1 |
| Cookie / No soy X | 3 |
| No new routes / same APIs | 3 |
| Tests updated | 1 + 2 |
| Same branch | all |

No placeholders remaining.
