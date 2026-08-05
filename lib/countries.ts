import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"

export type CountryOption = {
  iso2: CountryCode
  dialCode: string
  name: string
  flag: string
}

const PRIORITY: CountryCode[] = [
  "AR",
  "UY",
  "CL",
  "BR",
  "PY",
  "BO",
  "PE",
  "CO",
  "MX",
  "ES",
  "US",
]

const displayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null

export function flagEmoji(iso2: string): string {
  const code = iso2.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️"
  return String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0))
  )
}

let cached: CountryOption[] | null = null

export function listCountries(): CountryOption[] {
  if (cached) return cached
  const all = getCountries().map((iso2) => {
    const name = displayNames?.of(iso2) ?? iso2
    return {
      iso2,
      dialCode: getCountryCallingCode(iso2),
      name,
      flag: flagEmoji(iso2),
    }
  })
  const prioritySet = new Set(PRIORITY)
  const top = PRIORITY.map((iso) => all.find((c) => c.iso2 === iso)).filter(
    (c): c is CountryOption => Boolean(c)
  )
  const rest = all
    .filter((c) => !prioritySet.has(c.iso2))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
  cached = [...top, ...rest]
  return cached
}

export function filterCountries(query: string): CountryOption[] {
  const q = query.trim().toLowerCase()
  const list = listCountries()
  if (!q) return list
  const digits = q.replace(/\D/g, "")
  return list.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true
    if (c.iso2.toLowerCase().includes(q)) return true
    if (digits && c.dialCode.includes(digits)) return true
    if (q.startsWith("+") && `+${c.dialCode}`.startsWith(q)) return true
    return false
  })
}

export function composePhoneE164(
  country: CountryCode,
  national: string
): string {
  const digits = (national ?? "").replace(/\D/g, "")
  if (!digits) return ""
  const parsed = parsePhoneNumberFromString(digits, country)
  if (parsed) return parsed.format("E.164")
  return `+${getCountryCallingCode(country)}${digits}`
}

/** Parse stored/international values. Prefer explicit + / 00; else try E.164 digits. */
export function parsePhoneParts(
  value: string,
  fallback: CountryCode = "AR"
): {
  country: CountryCode
  nationalDigits: string
} {
  const raw = (value ?? "").trim()
  if (!raw) return { country: fallback, nationalDigits: "" }

  if (raw.startsWith("+") || raw.startsWith("00")) {
    const intl = raw.startsWith("00") ? `+${raw.slice(2)}` : raw
    const parsed = parsePhoneNumberFromString(intl)
    if (parsed?.country) {
      return {
        country: parsed.country,
        nationalDigits: parsed.nationalNumber,
      }
    }
  }

  const digits = raw.replace(/\D/g, "")
  if (digits.length >= 8) {
    const asIntl = parsePhoneNumberFromString(`+${digits}`)
    if (asIntl?.country && asIntl.isPossible()) {
      return {
        country: asIntl.country,
        nationalDigits: asIntl.nationalNumber,
      }
    }
  }

  return { country: fallback, nationalDigits: digits }
}

export function isPhoneValid(e164OrRaw: string, country?: CountryCode): boolean {
  const raw = (e164OrRaw ?? "").trim()
  if (!raw) return false
  if (country) return isValidPhoneNumber(raw, country)
  return isValidPhoneNumber(raw)
}
