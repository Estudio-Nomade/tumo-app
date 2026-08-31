import { describe, expect, test } from "bun:test"
import {
  isAdminLoginPath,
  isAdminProtectedPath,
  shouldRedirectAdminToLogin,
} from "@/modules/admin/lib/proxy-guard"

describe("admin proxy guard", () => {
  test("login no es protected", () => {
    expect(isAdminLoginPath("/admin/login")).toBe(true)
    expect(isAdminProtectedPath("/admin/login")).toBe(false)
    expect(shouldRedirectAdminToLogin("/admin/login", false)).toBe(false)
  })

  test("home admin redirige sin cookie", () => {
    expect(isAdminProtectedPath("/admin")).toBe(true)
    expect(shouldRedirectAdminToLogin("/admin", false)).toBe(true)
    expect(shouldRedirectAdminToLogin("/admin", true)).toBe(false)
  })

  test("businesses detail protected", () => {
    expect(isAdminProtectedPath("/admin/businesses/x")).toBe(true)
    expect(shouldRedirectAdminToLogin("/admin/businesses/x", false)).toBe(true)
  })

  test("tenant paths no son admin", () => {
    expect(isAdminProtectedPath("/carri/dashboard")).toBe(false)
    expect(shouldRedirectAdminToLogin("/carri/dashboard", false)).toBe(false)
  })
})
