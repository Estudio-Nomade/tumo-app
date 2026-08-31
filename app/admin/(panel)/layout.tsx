import Link from "next/link"
import { AdminLogoutButton } from "@/modules/admin/dashboard/admin-logout-button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/admin" className="text-base font-bold tracking-tight">
              Tumo Admin
            </Link>
            <Link
              href="/admin"
              className="text-slate-600 hover:text-slate-900"
            >
              Home
            </Link>
            <Link
              href="/admin/businesses"
              className="text-slate-600 hover:text-slate-900"
            >
              Negocios
            </Link>
          </nav>
          <AdminLogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
