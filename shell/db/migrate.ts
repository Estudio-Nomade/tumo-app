import { readFileSync } from "fs"
import { join } from "path"
import { sql } from "./pool"

async function migrate() {
  const migration = readFileSync(
    join(import.meta.dir, "migrations", "001_initial.sql"),
    "utf-8"
  )
  await sql.unsafe(migration)
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
