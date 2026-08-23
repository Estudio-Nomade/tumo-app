import postgres from "postgres"

type Sql = ReturnType<typeof postgres>

const globalForDb = globalThis as typeof globalThis & {
  __tumoSql?: Sql
}

function createSql(): Sql {
  const url = process.env.DATABASE_URL || ''
  const isPooler = url.includes('.pooler.supabase.com')

  return postgres(url, {
    ssl: isPooler ? 'require' : false,
    prepare: false,
    max: 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  })
}

const sql = globalForDb.__tumoSql ?? createSql()
globalForDb.__tumoSql = sql

export { sql }
