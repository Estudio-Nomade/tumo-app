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
