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

  test("pre-customer composition is lean: compact brand bar, tight step stack", () => {
    // Brand is centered logo + name (welcome), not a second title stack
    expect(src).toMatch(/header className="[^"]*flex flex-col items-center/)
    expect(src).toMatch(/h-16 w-16/)
    expect(src).not.toMatch(/h-\[72px\] w-\[72px\]/)
    expect(src).not.toMatch(/tagline/)
    // One step title per screen (h1), not dual h1+h2 branding
    expect(src).toContain("Ingresá tu WhatsApp")
    expect(src).toContain("programa de puntos")
    expect(src).toContain("¿Cómo te llamás?")
    expect(src).toContain("¿Cuándo es tu cumple?")
    expect(src).not.toContain("Empezá con tu WhatsApp")
    expect(src).not.toContain("Teléfono fijo arriba")
    expect(src).not.toContain("Si ya estás, entramos a tu tarjeta")
    // Phone field has no visible label competing with the step h1
    expect(src).toMatch(/<PhoneInput[\s\S]*?label=["']["']/)
    expect(src).toMatch(/aria-label=["']WhatsApp["']/)
    // Name field label is visually hidden; CTA sits in-flow (not docked to viewport)
    expect(src).toContain("[&_label>span]:sr-only")
    expect(src).not.toContain("mt-auto")
    expect(src).toMatch(/font-extrabold/)
  })
})

describe("shadcn date picker stack", () => {
  test("existe DatePicker compuesto con Calendar + Popover", () => {
    const pickerPath = join(root, "shell/ui/date-picker.tsx")
    expect(existsSync(pickerPath)).toBe(true)
    const picker = readFileSync(pickerPath, "utf8")
    expect(picker).toMatch(/from ["']@\/components\/ui\/calendar["']/)
    expect(picker).toMatch(/from ["']@\/components\/ui\/popover["']/)
    expect(picker).toMatch(/PopoverTrigger|PopoverContent/)
    expect(picker).toContain("h-[52px]")
    expect(picker).toMatch(/border-border|border-\[#E7E5E4\]/)
    expect(picker).toMatch(/date-fns\/locale|react-day-picker\/locale/)
  })

  test("calendar y popover de shadcn están instalados", () => {
    expect(existsSync(join(root, "components/ui/calendar.tsx"))).toBe(true)
    expect(existsSync(join(root, "components/ui/popover.tsx"))).toBe(true)
    expect(existsSync(join(root, "components.json"))).toBe(true)
  })
})

describe("AGENTS.md shadcn policy", () => {
  test("documenta preferir shadcn para componentes UI complejos", () => {
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8")
    expect(agents.toLowerCase()).toMatch(/shadcn/)
    expect(agents).toMatch(/calendar|date.?picker|popover|dialog|select/i)
    expect(agents).toMatch(/not\s+\*\*reinvent|Prefer shadcn|npx shadcn/i)
  })
})
