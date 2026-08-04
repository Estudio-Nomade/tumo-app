import { cookies } from "next/headers"

export const CLIENT_COOKIE = "client_id"
const MAX_AGE = 365 * 24 * 60 * 60

export async function setClientCookie(customerId: string): Promise<void> {
  const store = await cookies()
  store.set(CLIENT_COOKIE, customerId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
}

export async function getClientCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(CLIENT_COOKIE)?.value
}
