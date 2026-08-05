import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const src = readFileSync(
  join(root, "modules/loyalty/public/registration.tsx"),
  "utf8"
)

describe("LoyaltyRegistration birthday field (Pencil bd)", () => {
  test("label es ¿Fecha de cumpleaños? (no Cumpleaños solo)", () => {
    expect(src).toContain("¿Fecha de cumpleaños?")
    expect(src).not.toMatch(/label=["']Cumpleaños/)
  })

  test("tiene switch para habilitar la fecha", () => {
    expect(src).toMatch(/role=["']switch["']/)
    expect(src).toMatch(/birthdayEnabled|setBirthdayEnabled/)
  })

  test("usa DatePicker shadcn (no input type=date nativo)", () => {
    expect(src).toContain('import DatePicker from "@/shell/ui/date-picker"')
    expect(src).toContain("<DatePicker")
    expect(src).not.toMatch(/type=["']date["']/)
    expect(src).toMatch(/id=["']birthday-field["']/)
    expect(src).not.toMatch(
      /<Input[\s\S]*label=["']Cumpleaños[\s\S]*type=["']date["']/
    )
  })

  test("solo envía birthday si el switch está activo", () => {
    expect(src).toContain(
      "birthday: birthdayEnabled ? birthday || undefined : undefined"
    )
  })

  test("switch y date tienen a11y básica (labelledby + controls)", () => {
    expect(src).toContain('id="birthday-label"')
    expect(src).toContain('aria-labelledby="birthday-label"')
    expect(src).toContain('aria-controls="birthday-field"')
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

  test("registration valida birthday vacío con switch ON", () => {
    expect(src).toContain('Elegí tu fecha de cumpleaños.')
    expect(src).toMatch(/birthdayEnabled && !birthday/)
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
