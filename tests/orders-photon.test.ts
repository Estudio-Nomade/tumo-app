import { describe, expect, test } from "bun:test"
import {
  ORDERS_GEO_BIAS,
  buildPhotonSearchUrl,
  parsePhotonFeatures,
} from "@/modules/orders/lib/photon"

const FIXTURE = {
  features: [
    {
      geometry: { coordinates: [-65.1896, -31.9456] },
      properties: {
        street: "San Martín",
        housenumber: "1234",
        city: "Villa Dolores",
        state: "Córdoba",
        country: "Argentina",
      },
    },
    {
      geometry: { coordinates: [-65.2, -31.95] },
      properties: {
        name: "Plaza San Martín",
        town: "Villa Dolores",
      },
    },
    {
      geometry: { coordinates: ["bad", "coords"] },
      properties: { street: "Invalida" },
    },
  ],
}

describe("buildPhotonSearchUrl", () => {
  test("usa lang=default, bias y limit=5", () => {
    const url = buildPhotonSearchUrl("San Martin", ORDERS_GEO_BIAS)
    expect(url).toContain("https://photon.komoot.io/api/")
    expect(url).toContain("lang=default")
    expect(url).not.toContain("lang=es")
    expect(url).toContain("limit=5")
    expect(url).toContain(`lat=${ORDERS_GEO_BIAS.lat}`)
    expect(url).toContain(`lon=${ORDERS_GEO_BIAS.lon}`)
    expect(url).toContain("q=San")
  })
})

describe("parsePhotonFeatures", () => {
  test("arma labels calle+altura primero y descarta coords inválidas", () => {
    const results = parsePhotonFeatures(FIXTURE)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      label: "San Martín 1234, Villa Dolores, Córdoba, Argentina",
      lat: -31.9456,
      lon: -65.1896,
    })
    expect(results[1].label).toBe("Plaza San Martín, Villa Dolores")
    expect(results[1].lat).toBe(-31.95)
    expect(results[1].lon).toBe(-65.2)
  })

  test("features vacías o basura → []", () => {
    expect(parsePhotonFeatures(null)).toEqual([])
    expect(parsePhotonFeatures({})).toEqual([])
    expect(parsePhotonFeatures({ features: "no" })).toEqual([])
  })
})

describe("ORDERS_GEO_BIAS", () => {
  test("Villa Dolores aprox", () => {
    expect(ORDERS_GEO_BIAS.lat).toBeCloseTo(-31.9456, 3)
    expect(ORDERS_GEO_BIAS.lon).toBeCloseTo(-65.1896, 3)
  })
})
