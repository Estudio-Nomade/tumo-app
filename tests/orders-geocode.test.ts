import { describe, expect, test } from "bun:test"
import { getSuggestions, type GeocodeDeps } from "@/modules/orders/api/geocode"
import { ORDERS_GEO_BIAS } from "@/modules/orders/lib/photon"

function deps(fetchImpl: GeocodeDeps["fetch"]): GeocodeDeps {
  return { fetch: fetchImpl }
}

describe("getSuggestions", () => {
  test("q corta (<3) → [] sin fetch", async () => {
    let called = 0
    const result = await getSuggestions(deps(async () => {
      called++
      return new Response("[]")
    }), { q: "Sa", bias: ORDERS_GEO_BIAS })
    expect(result).toEqual([])
    expect(called).toBe(0)
  })

  test("Photon OK → results parseados", async () => {
    const body = {
      features: [
        {
          geometry: { coordinates: [-65.19, -31.94] },
          properties: {
            street: "Belgrano",
            housenumber: "100",
            city: "Villa Dolores",
          },
        },
      ],
    }
    const result = await getSuggestions(
      deps(async (url, init) => {
        expect(String(url)).toContain("lang=default")
        expect(init?.headers).toMatchObject({
          "user-agent": expect.stringContaining("TumoOrders"),
        })
        return new Response(JSON.stringify(body), { status: 200 })
      }),
      { q: "Belgrano", bias: ORDERS_GEO_BIAS }
    )
    expect(result).toEqual([
      { label: "Belgrano 100, Villa Dolores", lat: -31.94, lon: -65.19 },
    ])
  })

  test("Photon falla → []", async () => {
    const result = await getSuggestions(
      deps(async () => new Response("boom", { status: 500 })),
      { q: "San Martin", bias: ORDERS_GEO_BIAS }
    )
    expect(result).toEqual([])
  })

  test("fetch throw → []", async () => {
    const result = await getSuggestions(
      deps(async () => {
        throw new Error("network")
      }),
      { q: "San Martin", bias: ORDERS_GEO_BIAS }
    )
    expect(result).toEqual([])
  })
})
