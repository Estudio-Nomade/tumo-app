import {
  buildPhotonSearchUrl,
  parsePhotonFeatures,
  PHOTON_USER_AGENT,
  type GeoBias,
  type GeocodeResult,
} from "@/modules/orders/lib/photon"

export type GeocodeDeps = {
  fetch: typeof fetch
}

export async function getSuggestions(
  deps: GeocodeDeps,
  input: { q: string; bias: GeoBias }
): Promise<GeocodeResult[]> {
  const q = input.q.trim()
  if (q.length < 3) return []

  const url = buildPhotonSearchUrl(q, input.bias)
  let res: Response
  try {
    res = await deps.fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": PHOTON_USER_AGENT,
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error("[orders/geocode] photon fetch error", err)
    return []
  }

  if (!res.ok) {
    console.error(`[orders/geocode] photon HTTP ${res.status}`)
    return []
  }

  try {
    const json: unknown = await res.json()
    return parsePhotonFeatures(json)
  } catch (err) {
    console.error("[orders/geocode] photon parse error", err)
    return []
  }
}
