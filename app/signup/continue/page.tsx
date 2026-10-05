import { redirect } from "next/navigation"
import { SignupContinueClient } from "@/modules/signup/public/continue-client"
import { isSelfServiceSignupEnabled } from "@/modules/signup/lib/flags"

export default async function SignupContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; result?: string }>
}) {
  if (!isSelfServiceSignupEnabled()) {
    redirect("/")
  }
  const sp = await searchParams
  return (
    <main className="min-h-screen bg-black px-4 py-10">
      <SignupContinueClient sessionId={sp.session ?? ""} result={sp.result} />
    </main>
  )
}
