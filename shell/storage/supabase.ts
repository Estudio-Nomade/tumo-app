import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { LOGO_BUCKET, type LogoStorage } from "@/shell/business/logo"

type GlobalStore = typeof globalThis & {
  __tumoSupabase?: SupabaseClient
  __tumoLogoBucketReady?: boolean
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
    )
  }
  return { url, key }
}

export function getSupabaseAdmin(): SupabaseClient {
  const g = globalThis as GlobalStore
  if (g.__tumoSupabase) return g.__tumoSupabase
  const { url, key } = requireEnv()
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  g.__tumoSupabase = client
  return client
}

async function ensureLogoBucket(client: SupabaseClient): Promise<void> {
  const g = globalThis as GlobalStore
  if (g.__tumoLogoBucketReady) return

  const { data: buckets, error: listError } = await client.storage.listBuckets()
  if (listError) throw listError

  const exists = (buckets ?? []).some((b) => b.name === LOGO_BUCKET)
  if (!exists) {
    const { error: createError } = await client.storage.createBucket(
      LOGO_BUCKET,
      {
        public: true,
        fileSizeLimit: "2MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      }
    )
    if (createError && !/already exists/i.test(createError.message)) {
      throw createError
    }
  }

  g.__tumoLogoBucketReady = true
}

export function createSupabaseLogoStorage(): LogoStorage {
  return {
    async upload(path, bytes, contentType) {
      const client = getSupabaseAdmin()
      await ensureLogoBucket(client)
      const body = Buffer.from(bytes)
      const { error } = await client.storage
        .from(LOGO_BUCKET)
        .upload(path, body, {
          contentType,
          upsert: true,
          cacheControl: "3600",
        })
      if (error) throw error
      const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(path)
      return { publicUrl: data.publicUrl }
    },
    async remove(path) {
      const client = getSupabaseAdmin()
      const { error } = await client.storage.from(LOGO_BUCKET).remove([path])
      if (error) throw error
    },
  }
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}
