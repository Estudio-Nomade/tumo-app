import { readFileSync } from "fs"
import { join } from "path"
import { sql } from "./pool"

async function migrate() {
  const files = [
    "001_initial.sql",
    "002_business_surface_tagline.sql",
    "003_loyalty_points_native.sql",
    "004_orders.sql",
  ]
  for (const file of files) {
    const migration = readFileSync(
      join(import.meta.dir, "migrations", file),
      "utf-8"
    )
    await sql.unsafe(migration)
    console.log(`OK ${file}`)
  }
  console.log("Migración ejecutada correctamente")
}

migrate()
  .then(async () => {
    await sql.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await sql.end({ timeout: 5 })
    process.exit(1)
  })
