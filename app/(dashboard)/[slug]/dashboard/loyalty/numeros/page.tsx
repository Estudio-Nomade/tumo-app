import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { LoyaltyModuleInsights } from "@/modules/loyalty/dashboard/module-insights"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoyaltyNumerosPage({ params }: PageProps) {
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-2">
      <header className="flex flex-col gap-3">
        <a
          href={`/${slug}/dashboard/loyalty`}
          className="inline-flex min-h-[48px] w-fit items-center text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          ← Volver a clientes
        </a>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
            Cómo va el programa
          </h1>
          <p className="text-base text-stone-700">
            Números de {business.name}
          </p>
        </div>
      </header>

      <LoyaltyModuleInsights slug={slug} business={business} />

      <a
        href={`/${slug}/dashboard/loyalty`}
        className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
      >
        Atender clientes
      </a>
    </div>
  )
}
