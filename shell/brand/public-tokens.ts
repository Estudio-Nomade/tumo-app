const CLASSIC_INK = "#1C1917"
const CLASSIC_MUTED = "#78716C"
const CLASSIC_HINT = "#A8A29E"
const CLASSIC_REWARD_LABEL = "#FFEDD5"
const CLASSIC_SHARE_BG = "#FFF7ED"
const DEFAULT_SURFACE = "#FFFFFF"
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function normalizeSurfaceHex(
  value: string | null | undefined
): string {
  const raw = (value ?? "").trim()
  if (!raw || !HEX_RE.test(raw)) return DEFAULT_SURFACE
  return raw
}

export function isNeutralSurface(
  value: string | null | undefined
): boolean {
  const hex = normalizeSurfaceHex(value).replace(/^#/, "").toLowerCase()
  if (hex === "fff" || hex === "ffffff") return true
  return false
}

export function publicBrandCssVars(input: {
  primary_color: string
  secondary_color: string
  surface_color?: string | null
}): Record<string, string> {
  const surface = normalizeSurfaceHex(input.surface_color)
  const tinted = !isNeutralSurface(surface)
  return {
    "--color-surface-public": surface,
    "--color-ink-public": tinted ? input.primary_color : CLASSIC_INK,
    "--color-muted-public": tinted ? input.secondary_color : CLASSIC_MUTED,
    "--color-progress-fill": tinted ? "#FFFFFF" : input.secondary_color,
    "--color-hint-public": tinted ? input.secondary_color : CLASSIC_HINT,
    "--color-reward-label": tinted ? "rgba(255,255,255,0.85)" : CLASSIC_REWARD_LABEL,
    "--color-share-bg": tinted
      ? `color-mix(in srgb, ${input.primary_color} 12%, white)`
      : CLASSIC_SHARE_BG,
    "--color-card-to": tinted
      ? `color-mix(in srgb, ${input.primary_color} 75%, black)`
      : `color-mix(in srgb, ${input.primary_color} 82%, #9a3412)`,
  }
}
