import { redirect } from "next/navigation"
import { SignupForm } from "@/modules/signup/public/signup-form"
import { isSelfServiceSignupEnabled } from "@/modules/signup/lib/flags"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  if (!isSelfServiceSignupEnabled()) {
    redirect("/")
  }
  const sp = await searchParams
  return (
    <main className="min-h-screen bg-black px-4 py-10">
      <SignupForm initialPlan={sp.plan} />
    </main>
  )
}
