const AUTHYO_CLIENT_ID = process.env.AUTHYO_CLIENT_ID!
const AUTHYO_CLIENT_SECRET = process.env.AUTHYO_CLIENT_SECRET!
const AUTHYO_SEND_URL = "https://app.authyo.io/api/v1/auth/sendotp"
const AUTHYO_VERIFY_URL = "https://app.authyo.io/api/v1/auth/verifyotp"

type SendOtpResult = { maskId: string } | { error: string }
type VerifyOtpResult = { success: true } | { success: false; error: string }

type AuthyoSendResponse = {
  success?: boolean
  message?: string
  data?: {
    isTried?: number
    isSent?: number
    results?: Array<{
      success?: boolean
      message?: string
      maskId?: string
    }>
  }
}

type AuthyoVerifyResponse = {
  success?: boolean | string
  status?: string
  message?: string
}

function authHeaders(): HeadersInit {
  return {
    clientId: AUTHYO_CLIENT_ID,
    clientSecret: AUTHYO_CLIENT_SECRET,
  }
}

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    const url = new URL(AUTHYO_SEND_URL)
    url.searchParams.set("to", phone)
    url.searchParams.set("expiry", "300")
    url.searchParams.set("otpLength", "6")
    url.searchParams.set("authWay", "WhatsApp")

    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    })

    const body = (await res.json()) as AuthyoSendResponse

    if (!res.ok || body.success === false) {
      return { error: body.message ?? "No pudimos mandar el código." }
    }

    const maskId = body.data?.results?.find((r) => r.maskId)?.maskId
    if (!maskId) {
      return { error: body.message ?? "No pudimos mandar el código." }
    }

    return { maskId }
  } catch {
    return { error: "No pudimos mandar el código. Probá de nuevo." }
  }
}

export async function verifyOtp(
  maskId: string,
  code: string
): Promise<VerifyOtpResult> {
  try {
    const url = new URL(AUTHYO_VERIFY_URL)
    url.searchParams.set("maskId", maskId)
    url.searchParams.set("otp", code)

    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    })

    const body = (await res.json()) as AuthyoVerifyResponse
    const ok =
      res.ok &&
      (body.success === true ||
        body.success === "true" ||
        body.status === "verified")

    if (!ok) {
      return {
        success: false,
        error: body.message ?? "El código no es válido.",
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: "No pudimos verificar el código. Probá de nuevo.",
    }
  }
}
