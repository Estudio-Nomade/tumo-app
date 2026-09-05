import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { LOGO_BUCKET, type LogoStorage } from "@/shell/business/logo"
import {
  PRODUCT_PHOTOS_BUCKET,
  type ProductPhotoStorage,
} from "@/modules/orders/api/product-photos"

type GlobalStore = typeof globalThis & {
  __tumoSupabase?: SupabaseClient
  __tumoLogoBucketReady?: boolean
  __tumoProductPhotosBucketReady?: boolean
}

/**
 * Modern Supabase API keys (2025+):
 * - publishable: sb_publishable_... (public, like legacy anon)
 * - secret: sb_secret_... (server only, like legacy service_role)
 * @see https://supabase.com/docs/guides/getting-started/ai-prompts/use-supabase-ai-assistant
 */
function resolveSecretKey(): string | undefined {
  const single = process.env.SUPABASE_SECRET_KEY?.trim()
  if (single) return single

  // Optional multi-key map: {"default":"sb_secret_..."}
  const rawMap = process.env.SUPABASE_SECRET_KEYS?.trim()
  if (rawMap) {
    try {
      const map = JSON.parse(rawMap) as Record<string, string>
      const named =
        map.default?.trim() ||
        map.service_role?.trim() ||
        Object.values(map).find((v) => typeof v === "string" && v.trim())
      if (named?.trim()) return named.trim()
    } catch {
      // ignore invalid JSON
    }
  }

  return undefined
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = resolveSecretKey()
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY (sb_secret_...)"
    )
  }
  return { url, key }
}

export function getSupabaseAdmin(): SupabaseClient {
  const g = globalThis as GlobalStore
  if (g.__tumoSupabase) return g.__tumoSupabase
  const { url, key } = requireEnv()
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
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

async function ensureProductPhotosBucket(client: SupabaseClient): Promise<void> {
  const g = globalThis as GlobalStore
  if (g.__tumoProductPhotosBucketReady) return

  const { data: buckets, error: listError } = await client.storage.listBuckets()
  if (listError) throw listError

  const exists = (buckets ?? []).some((b) => b.name === PRODUCT_PHOTOS_BUCKET)
  if (!exists) {
    const { error: createError } = await client.storage.createBucket(
      PRODUCT_PHOTOS_BUCKET,
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

  g.__tumoProductPhotosBucketReady = true
}

export function createSupabaseProductPhotoStorage(): ProductPhotoStorage {
  return {
    async upload(path, bytes, contentType) {
      const client = getSupabaseAdmin()
      await ensureProductPhotosBucket(client)
      const body = Buffer.from(bytes)
      const { error } = await client.storage
        .from(PRODUCT_PHOTOS_BUCKET)
        .upload(path, body, {
          contentType,
          upsert: false,
          cacheControl: "3600",
        })
      if (error) throw error
      const { data } = client.storage
        .from(PRODUCT_PHOTOS_BUCKET)
        .getPublicUrl(path)
      return { publicUrl: data.publicUrl }
    },
    async remove(path) {
      const client = getSupabaseAdmin()
      const { error } = await client.storage
        .from(PRODUCT_PHOTOS_BUCKET)
        .remove([path])
      if (error) throw error
    },
  }
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && resolveSecretKey()
  )
}
