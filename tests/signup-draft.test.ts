import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  SIGNUP_DRAFT_KEY,
  SIGNUP_DRAFT_TTL_MS,
  clearSignupDraft,
  loadSignupDraft,
  saveSignupDraft,
  type SignupDraftV1,
} from "@/modules/signup/public/signup-draft"

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
  }
}

const sample: Omit<SignupDraftV1, "v" | "savedAt"> = {
  planId: "pro",
  moduleIds: ["loyalty", "orders"],
  businessName: "Café Norte",
  payerName: "Ana",
  email: "ana@example.com",
}

describe("signup draft", () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
  })

  afterEach(() => {
    storage.clear()
  })

  test("loadDraft vacío → null", () => {
    expect(loadSignupDraft(storage)).toBeNull()
  })

  test("saveDraft + loadDraft roundtrip sin password", () => {
    saveSignupDraft(sample, storage, 1_700_000_000_000)
    const loaded = loadSignupDraft(storage, 1_700_000_000_000)
    expect(loaded).toEqual({
      v: 1,
      savedAt: 1_700_000_000_000,
      planId: "pro",
      moduleIds: ["loyalty", "orders"],
      businessName: "Café Norte",
      payerName: "Ana",
      email: "ana@example.com",
    })
    expect("password" in (loaded as object)).toBe(false)
    const raw = JSON.parse(storage.getItem(SIGNUP_DRAFT_KEY)!) as Record<
      string,
      unknown
    >
    expect(raw.password).toBeUndefined()
  })

  test("payload corrupto → null + clear", () => {
    storage.setItem(SIGNUP_DRAFT_KEY, "{not-json")
    expect(loadSignupDraft(storage)).toBeNull()
    expect(storage.getItem(SIGNUP_DRAFT_KEY)).toBeNull()
  })

  test("version ≠ 1 → null + clear", () => {
    storage.setItem(
      SIGNUP_DRAFT_KEY,
      JSON.stringify({ ...sample, v: 2, savedAt: Date.now() })
    )
    expect(loadSignupDraft(storage)).toBeNull()
    expect(storage.getItem(SIGNUP_DRAFT_KEY)).toBeNull()
  })

  test("TTL vencido → null + clear", () => {
    const savedAt = 1_000_000
    saveSignupDraft(sample, storage, savedAt)
    expect(
      loadSignupDraft(storage, savedAt + SIGNUP_DRAFT_TTL_MS + 1)
    ).toBeNull()
    expect(storage.getItem(SIGNUP_DRAFT_KEY)).toBeNull()
  })

  test("clearSignupDraft borra la key", () => {
    saveSignupDraft(sample, storage)
    clearSignupDraft(storage)
    expect(storage.getItem(SIGNUP_DRAFT_KEY)).toBeNull()
    expect(loadSignupDraft(storage)).toBeNull()
  })

  test("campos inválidos → null + clear", () => {
    storage.setItem(
      SIGNUP_DRAFT_KEY,
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        planId: "enterprise",
        moduleIds: "loyalty",
        businessName: 1,
        payerName: null,
        email: "",
      })
    )
    expect(loadSignupDraft(storage)).toBeNull()
    expect(storage.getItem(SIGNUP_DRAFT_KEY)).toBeNull()
  })

  test("load scrubs leftover password key from storage", () => {
    const now = 1_700_000_000_000
    storage.setItem(
      SIGNUP_DRAFT_KEY,
      JSON.stringify({
        v: 1,
        savedAt: now,
        planId: "basico",
        moduleIds: ["loyalty"],
        businessName: "X",
        payerName: "Y",
        email: "z@z.com",
        password: "should-not-linger",
      })
    )
    const loaded = loadSignupDraft(storage, now)
    expect(loaded?.email).toBe("z@z.com")
    const raw = JSON.parse(storage.getItem(SIGNUP_DRAFT_KEY)!) as Record<
      string,
      unknown
    >
    expect(raw.password).toBeUndefined()
  })
})

describe("sanitize draft modules", () => {
  test("unknown ids and cupo clamped via modulesAfterPlanChange path", async () => {
    const { sanitizeDraftModules } = await import(
      "@/modules/signup/public/signup-draft"
    )
    expect(sanitizeDraftModules("basico", ["orders", "ghost", "loyalty"])).toEqual([
      "orders",
    ])
    expect(sanitizeDraftModules("full", ["loyalty"])).toEqual([
      "loyalty",
      "orders",
      "turnos",
    ])
    expect(sanitizeDraftModules("pro", [])).toEqual(["loyalty", "orders"])
  })
})
