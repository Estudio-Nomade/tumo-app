import postgres from "postgres"

type Sql = ReturnType<typeof postgres>

const globalForDb = globalThis as typeof globalThis & {
  __tumoSql?: Sql
}

function createSql(): Sql {
  return postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    // Transaction pooler (Supabase :6543) does not support prepared statements.
    prepare: false,
    // Keep small; singleton via globalThis avoids HMR multiplying pools in dev.
    max: 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  })
}

const sql = globalForDb.__tumoSql ?? createSql()
globalForDb.__tumoSql = sql

export { sql }
