"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function AdminLogoutButton() {
  const router = useRouter()

  async function onClick() {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" className="h-9" onClick={onClick}>
      Salir
    </Button>
  )
}
