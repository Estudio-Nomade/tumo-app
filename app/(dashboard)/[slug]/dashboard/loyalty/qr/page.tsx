import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import ShareProgram from "@/modules/loyalty/dashboard/share-program"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoyaltyQrPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  const backHref =
    session.role === "owner"
      ? `/${slug}/dashboard/settings`
      : `/${slug}/dashboard/loyalty`

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-500 transition hover:text-stone-900"
      >
        <ArrowLeft size={18} strokeWidth={2} aria-hidden />
        Volver {session.role === "owner" ? "a Ajustes" : "al panel"}
      </Link>

      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Escaneá para sumar
        </h1>
        <p className="text-sm text-stone-500">{business.name}</p>
      </header>

      <ShareProgram business={business} variant="fullscreen" />
    </div>
  )
}
