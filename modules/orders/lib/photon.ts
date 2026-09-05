export const ORDERS_GEO_BIAS = {
  lat: -31.9456,
  lon: -65.1896,
} as const

export const PHOTON_USER_AGENT = "TumoOrders/1.0"

const PHOTON_API = "https://photon.komoot.io/api/"

export type GeoBias = { lat: number; lon: number }

export type GeocodeResult = {
  label: string
  lat: number
  lon: number
}

type PhotonProperties = {
  name?: string
  street?: string
  housenumber?: string
  city?: string
  town?: string
  village?: string
  state?: string
  country?: string
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown }
  properties?: PhotonProperties
}

export function buildPhotonSearchUrl(q: string, bias: GeoBias): string {
  const params = new URLSearchParams({
    q,
    lat: String(bias.lat),
    lon: String(bias.lon),
    limit: "5",
    lang: "default",
  })
  return `${PHOTON_API}?${params.toString()}`
}

function buildLabel(props: PhotonProperties): string {
  const street = (props.street ?? "").trim()
  const housenumber = (props.housenumber ?? "").trim()
  const name = (props.name ?? "").trim()
  const streetLine =
    street && housenumber ? `${street} ${housenumber}` : street
  const primary = streetLine || name
  const locality = props.city ?? props.town ?? props.village ?? ""
  const parts = [primary, locality, props.state, props.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Ubicación"
}

export function parsePhotonFeatures(json: unknown): GeocodeResult[] {
  if (!json || typeof json !== "object") return []
  const features = (json as { features?: unknown }).features
  if (!Array.isArray(features)) return []

  const out: GeocodeResult[] = []
  for (const raw of features) {
    const feature = raw as PhotonFeature
    const coords = feature.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) continue
    const lon = Number(coords[0])
    const lat = Number(coords[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const props = feature.properties ?? {}
    out.push({ label: buildLabel(props), lat, lon })
  }
  return out
}
