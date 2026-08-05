"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

export default function LogoutButton({
  slug,
  className = "",
  children = "Cerrar sesión",
}: {
  slug: string
  className?: string
  children?: ReactNode
}) {
  const router = useRouter()

  async function onLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (!res.ok) return
      router.push(`/${slug}/login`)
      router.refresh()
    } catch {
      // keep session UI if logout request fails
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onLogout()}
      className={className}
    >
      {children}
    </button>
  )
}
