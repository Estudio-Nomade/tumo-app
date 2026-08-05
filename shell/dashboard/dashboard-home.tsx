import type { ReactNode } from "react"

/** Generic owner home shell — module sections are passed as children. */
export default function DashboardHome({
  employeeName,
  children,
}: {
  employeeName?: string
  children: ReactNode
}) {
  const name = employeeName?.trim()
  const greeting = name
    ? `Hola, ${name}. Así va tu comercio hoy.`
    : "Hola. Así va tu comercio hoy."

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Panel
        </h1>
        <p className="text-[13px] text-stone-500">{greeting}</p>
      </header>
      {children}
    </div>
  )
}
