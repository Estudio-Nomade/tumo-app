"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Business } from "@/lib/modules"

const BusinessContext = createContext<Business | null>(null)

export function BusinessProvider({
  business,
  children,
}: {
  business: Business
  children: ReactNode
}) {
  return (
    <BusinessContext.Provider value={business}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness(): Business {
  const business = useContext(BusinessContext)
  if (!business) {
    throw new Error("useBusiness must be used within BusinessProvider")
  }
  return business
}
