import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const carousel = readFileSync(
  join(root, "modules/orders/public/product-photo-carousel.tsx"),
  "utf8"
)
const detail = readFileSync(
  join(root, "modules/orders/public/product-detail.tsx"),
  "utf8"
)

describe("ProductPhotoCarousel (source contracts)", () => {
  test("0 fotos → Sin foto; 1 sin chrome de N; 2+ con navegación", () => {
    expect(carousel).toContain("Sin foto")
    expect(carousel).toMatch(/scroll-snap|snap-x|snap-mandatory/)
    expect(carousel).toMatch(/\/ N|\/ \{|photos\.length|1 \/|current \+ 1/)
    expect(carousel).toMatch(/min-h-\[48px\]|min-w-\[48px\]/)
  })

  test("sin autoplay", () => {
    expect(carousel).not.toMatch(/autoplay|setInterval/)
  })

  test("product-detail usa el carrusel", () => {
    expect(detail).toMatch(/ProductPhotoCarousel|product-photo-carousel/)
  })
})
