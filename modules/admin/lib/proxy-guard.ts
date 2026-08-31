/**
 * Pure path helpers for admin proxy guard (testable without Next runtime).
 */

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/")
}

export function isAdminProtectedPath(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return !isAdminLoginPath(pathname)
  }
  return false
}

export function shouldRedirectAdminToLogin(
  pathname: string,
  hasAdminCookie: boolean
): boolean {
  if (!isAdminProtectedPath(pathname)) return false
  return !hasAdminCookie
}
